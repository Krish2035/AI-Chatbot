import { pool, getDbStatus } from '../db';
import { generateEmbedding, cosineSimilarity } from './embeddingService';
import { getGroqClientPool } from './groqService';
import pgvector from 'pgvector/pg';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { getDocumentProxy, extractText } from 'unpdf';

dotenv.config();

/**
 * Extract clean plain text from PDF, DOCX, or text file buffers
 */
export async function extractTextFromBuffer(buffer: Buffer, fileType: string): Promise<string> {
  const normalizedType = fileType.toLowerCase().trim();

  if (normalizedType === 'pdf') {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      if (text && text.trim()) {
        return text;
      }
    } catch (err: any) {
      console.error('❌ unpdf extraction error:', err.message || err);
    }

    // Fallback: extract string content if unpdf returns empty or throws
    const rawText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    if (rawText.trim().length > 50) {
      return rawText.trim();
    }
  }

  if (normalizedType === 'docx' || normalizedType === 'doc') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err: any) {
      console.error('❌ Error parsing DOCX file:', err);
      throw new Error(`Failed to parse DOCX file: ${err.message || err}`);
    }
  }

  // Fallback for TXT, MD, CSV, JSON, code files, etc.
  return buffer.toString('utf-8');
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'groq/compound';

let groqClient: Groq | null = null;
if (groqApiKey && groqApiKey !== 'your_groq_api_key_here') {
  groqClient = new Groq({ apiKey: groqApiKey });
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  fileType: string;
  content: string;
  wordCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface DocumentChunkRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkContent: string;
  similarity?: number;
  createdAt: string;
}

// In-Memory Fallback storage for documents & chunks
const inMemoryDocuments: DocumentRecord[] = [];
const inMemoryChunks: {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkContent: string;
  embedding: number[];
  createdAt: Date;
}[] = [];

/**
 * Split raw document text into overlapping semantic chunks
 */
export function splitTextIntoChunks(text: string, maxChunkSize = 700, overlap = 100): string[] {
  const cleanedText = text.trim();
  if (!cleanedText) return [];

  // Split by double newlines (paragraphs) first
  const paragraphs = cleanedText.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if ((currentChunk + '\n\n' + trimmedPara).length <= maxChunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If a single paragraph is larger than maxChunkSize, split by sentence or character length
      if (trimmedPara.length > maxChunkSize) {
        let start = 0;
        while (start < trimmedPara.length) {
          let end = start + maxChunkSize;
          if (end < trimmedPara.length) {
            const lastSpace = trimmedPara.lastIndexOf(' ', end);
            if (lastSpace > start + maxChunkSize * 0.6) {
              end = lastSpace;
            }
          }
          const chunkStr = trimmedPara.slice(start, end).trim();
          if (chunkStr) chunks.push(chunkStr);
          start = end - overlap > start ? end - overlap : end;
        }
        currentChunk = '';
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [cleanedText.slice(0, maxChunkSize)];
}

/**
 * Ingest document, generate embeddings for chunks, and save to DB/memory
 */
export async function processAndStoreDocument(
  title: string,
  content: string,
  fileType: string = 'txt',
  userId: string = DEFAULT_USER_ID
): Promise<DocumentRecord> {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const rawChunks = splitTextIntoChunks(content);
  const documentId = crypto.randomUUID();
  const createdAtStr = new Date().toISOString();

  // 1. Process embeddings for all chunks in parallel
  const chunkData = await Promise.all(
    rawChunks.map(async (chunkText, index) => {
      const embedding = await generateEmbedding(chunkText);
      return {
        id: crypto.randomUUID(),
        chunkIndex: index + 1,
        chunkContent: chunkText,
        embedding
      };
    })
  );

  // 2. Save to Database if active
  if (getDbStatus()) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const docRes = await client.query(
          `INSERT INTO documents (id, user_id, title, file_type, content, word_count, chunk_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, user_id AS "userId", title, file_type AS "fileType", content, word_count AS "wordCount", chunk_count AS "chunkCount", created_at AS "createdAt"`,
          [documentId, userId, title, fileType, content, wordCount, rawChunks.length]
        );

        for (const item of chunkData) {
          await client.query(
            `INSERT INTO document_chunks (id, document_id, user_id, chunk_index, chunk_content, embedding)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [item.id, documentId, userId, item.chunkIndex, item.chunkContent, pgvector.toSql(item.embedding)]
          );
        }

        await client.query('COMMIT');
        return docRes.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (dbErr: any) {
      console.warn('⚠️ DB processAndStoreDocument error, falling back to in-memory:', dbErr.message || dbErr);
    }
  }

  // In-memory fallback
  const docRecord: DocumentRecord = {
    id: documentId,
    userId,
    title,
    fileType,
    content,
    wordCount,
    chunkCount: rawChunks.length,
    createdAt: createdAtStr
  };

  inMemoryDocuments.unshift(docRecord);

  for (const item of chunkData) {
    inMemoryChunks.push({
      id: item.id,
      documentId,
      chunkIndex: item.chunkIndex,
      chunkContent: item.chunkContent,
      embedding: item.embedding,
      createdAt: new Date()
    });
  }

  return docRecord;
}

/**
 * Retrieve user's document list
 */
export async function getUserDocuments(userId: string = DEFAULT_USER_ID): Promise<DocumentRecord[]> {
  if (getDbStatus()) {
    try {
      const result = await pool.query(
        `SELECT id, user_id AS "userId", title, file_type AS "fileType", content, word_count AS "wordCount", chunk_count AS "chunkCount", created_at AS "createdAt"
         FROM documents
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (err: any) {
      console.warn('⚠️ DB getUserDocuments error, falling back to in-memory:', err.message || err);
    }
  }
  return inMemoryDocuments.filter((d) => d.userId === userId);
}

/**
 * Delete document and associated chunks
 */
export async function deleteUserDocument(documentId: string): Promise<boolean> {
  if (getDbStatus()) {
    try {
      await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
    } catch (err: any) {
      console.warn('⚠️ DB deleteUserDocument notice:', err.message || err);
    }
  }
  const idx = inMemoryDocuments.findIndex((d) => d.id === documentId);
  if (idx !== -1) inMemoryDocuments.splice(idx, 1);
  
  for (let i = inMemoryChunks.length - 1; i >= 0; i--) {
    if (inMemoryChunks[i].documentId === documentId) {
      inMemoryChunks.splice(i, 1);
    }
  }
  return true;
}

/**
 * Vector similarity search to find top matching chunks for a document query
 */
export async function recallDocumentChunks(
  documentId: string,
  query: string,
  limit: number = 5
): Promise<DocumentChunkRecord[]> {
  const queryEmbedding = await generateEmbedding(query);

  if (getDbStatus()) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(
          `SELECT * FROM match_document_chunks($1, $2, $3, $4)`,
          [pgvector.toSql(queryEmbedding), documentId, limit, 0.01]
        );
        return res.rows.map((row) => ({
          id: row.id,
          documentId: row.document_id,
          chunkIndex: row.chunk_index,
          chunkContent: row.chunk_content,
          similarity: parseFloat(row.similarity),
          createdAt: row.created_at
        }));
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('⚠️ DB recallDocumentChunks error, falling back to in-memory:', err.message || err);
    }
  }

  // In-memory vector similarity
  const docChunks = inMemoryChunks.filter((c) => c.documentId === documentId);
  const results: DocumentChunkRecord[] = [];

  for (const chunk of docChunks) {
    const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
    results.push({
      id: chunk.id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      chunkContent: chunk.chunkContent,
      similarity: sim,
      createdAt: chunk.createdAt.toISOString()
    });
  }

  return results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, limit);
}

/**
 * Perform RAG synthesis using Groq LLM with retrieved document chunks
 */
export async function generateDocumentRAGResponse(
  query: string,
  documentTitle: string,
  retrievedChunks: DocumentChunkRecord[]
): Promise<{ text: string; modelUsed: string; chunksUsed: DocumentChunkRecord[] }> {
  let contextText = '';
  if (retrievedChunks.length > 0) {
    contextText = retrievedChunks
      .slice(0, 5)
      .map(
        (c) =>
          `[Doc Chunk #${c.chunkIndex} | Match Relevance: ${((c.similarity || 0) * 100).toFixed(1)}%]:\n"${
            c.chunkContent.length > 550 ? c.chunkContent.slice(0, 550) + '...' : c.chunkContent
          }"`
      )
      .join('\n\n');
  } else {
    contextText = '(No relevant document sections found)';
  }

  const systemPrompt = `You are a ChatGPT-grade Document Intelligence Assistant.
Your task is to analyze the user's document titled "${documentTitle}" and deliver an executive-grade answer formatted in EXACT ChatGPT Markdown style.

STRICT CHATGPT FORMATTING INSTRUCTIONS:
1. HEADINGS:
   - Always use '### ' for main section headings (e.g., '### Executive Summary', '### Key Findings', '### Technical Breakdown', '### Project Highlights').
   - NEVER output plain text titles without '### '.

2. TABLES:
   - Whenever presenting skills, frameworks, tools, or categorized data, ALWAYS format as a valid Markdown table with pipe '|' separators and a delimiter row '| --- | --- | --- |'.
   - Example:
     | Category | Specific Skills / Tools | Evidence Citation |
     | --- | --- | --- |
     | Programming Languages | JavaScript/TypeScript, Dart | [Doc Chunk #1] |

3. BULLET LISTS:
   - Format bullet lists with bold label prefixes, e.g.:
     - **Full-Stack Development:** Seamless work across UI, API, and database layers.
     - **Cross-Platform Mobile:** Proficient in React Native and Flutter.

4. CITATIONS:
   - Explicitly cite chunk references as \`[Doc Chunk #1]\`, \`[Doc Chunk #2]\` next to factual statements.

5. NEVER output HTML tags (<br>, <table>, <tr>, etc.). Use standard Markdown spacing.`;

  const userPrompt = `Document Title: ${documentTitle}

[RELEVANT EXTRACTED DOCUMENT CHUNKS]:
${contextText}

[USER QUESTION]:
${query}`;

  const groqClients = getGroqClientPool();
  if (groqClients.length > 0) {
    const candidateModels = [
      groqModel,
      'groq/compound-mini',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b'
    ];

    for (let cIdx = 0; cIdx < groqClients.length; cIdx++) {
      const client = groqClients[cIdx];
      for (const model of candidateModels) {
        try {
          const completion = await client.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            model,
            temperature: 0.3,
            max_tokens: 1000,
          });

          const responseText = completion.choices[0]?.message?.content;
          if (responseText) {
            return {
              text: responseText,
              modelUsed: `${model} (Key #${cIdx + 1})`,
              chunksUsed: retrievedChunks
            };
          }
        } catch (err: any) {
          console.warn(`⚠️ Groq Key #${cIdx + 1} (${model}) notice:`, err.message || err);
        }
      }
    }
  }

  // Simulation mode if GROQ_API_KEY is not set or failed
  return {
    text: `### Document Analysis for "${documentTitle}"\n\nBased on a vector similarity scan of **"${documentTitle}"**, here are the key findings related to your prompt:\n\n` +
      retrievedChunks.map((c, i) => `**${i + 1}. Source Excerpt [Chunk #${c.chunkIndex}]** *(Relevance: ${((c.similarity || 0) * 100).toFixed(1)}%)*:\n> "${c.chunkContent}"`).join('\n\n') +
      `\n\n*(Connect your \`GROQ_API_KEYS\` in \`backend/.env\` for full multi-paragraph AI synthesis!)*`,
    modelUsed: 'Simulation Mode (Add GROQ_API_KEYS in backend/.env)',
    chunksUsed: retrievedChunks
  };
}
