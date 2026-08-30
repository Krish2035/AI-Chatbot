import { Request, Response } from 'express';
import {
  processAndStoreDocument,
  getUserDocuments,
  deleteUserDocument,
  recallDocumentChunks,
  generateDocumentRAGResponse,
  extractTextFromBuffer,
} from '../services/documentService';

/**
 * POST /api/documents/process
 * Ingest document (supports text, PDF, DOCX via content or base64 fileData),
 * generate vector embeddings for chunks, and save to DB/memory
 */
export async function processDocument(req: Request, res: Response) {
  try {
    const { title, content, fileData, fileType } = req.body;

    if (!title || (!content && !fileData)) {
      return res.status(400).json({
        success: false,
        error: 'Title and document content or fileData are required',
      });
    }

    let documentText = '';

    if (fileData) {
      // Clean base64 string if data URL scheme prefix is present
      const base64Clean = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      const buffer = Buffer.from(base64Clean, 'base64');
      documentText = await extractTextFromBuffer(buffer, fileType || 'txt');
    } else if (content) {
      documentText = content;
    }

    if (!documentText || !documentText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Unable to extract readable text content from the provided document file.',
      });
    }

    const document = await processAndStoreDocument(
      title.trim(),
      documentText.trim(),
      fileType || 'txt'
    );

    return res.status(201).json({
      success: true,
      document,
    });
  } catch (error: any) {
    console.error('❌ Error processing document:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error processing document',
    });
  }
}

/**
 * GET /api/documents
 * List all processed documents
 */
export async function getDocuments(req: Request, res: Response) {
  try {
    const documents = await getUserDocuments();
    return res.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Error fetching documents',
    });
  }
}

/**
 * DELETE /api/documents/:id
 * Delete document and its chunk vector embeddings
 */
export async function deleteDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await deleteUserDocument(id);
    return res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Error deleting document',
    });
  }
}

/**
 * POST /api/documents/:id/query
 * Perform RAG question answering against document chunks
 */
export async function queryDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question prompt is required',
      });
    }

    const docs = await getUserDocuments();
    const targetDoc = docs.find((d) => d.id === id);

    const docTitle = targetDoc ? targetDoc.title : 'Uploaded Document';

    // 1. Recall top relevant document chunks via vector similarity
    const topChunks = await recallDocumentChunks(id, question.trim(), 5);

    // 2. Generate RAG synthesis using Groq LLM
    const ragResult = await generateDocumentRAGResponse(
      question.trim(),
      docTitle,
      topChunks
    );

    return res.json({
      success: true,
      answer: ragResult.text,
      modelUsed: ragResult.modelUsed,
      chunksUsed: ragResult.chunksUsed,
    });
  } catch (error: any) {
    console.error('❌ Error querying document:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error executing document RAG query',
    });
  }
}
