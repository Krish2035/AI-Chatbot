import { pool, getDbStatus } from '../db';
import { generateEmbedding, cosineSimilarity } from './embeddingService';
import pgvector from 'pgvector/pg';

export interface SavedMemoryRecord {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  similarity: number;
  createdAt: string;
}

// In-Memory Fallback storage if PostgreSQL database is not connected
interface InMemoryEmbedding {
  id: string;
  messageId: string;
  sessionId: string;
  userId: string;
  role: string;
  content: string;
  embedding: number[];
  createdAt: Date;
}

const memoryStore: InMemoryEmbedding[] = [];

/**
 * Store a user message and its vector embedding into database or fallback store
 */
export async function saveMessageEmbedding(
  messageId: string,
  sessionId: string,
  userId: string,
  role: string,
  content: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);

    if (getDbStatus()) {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO message_embeddings (message_id, session_id, user_id, role, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [messageId, sessionId, userId, role, content, pgvector.toSql(embedding)]
        );
      } finally {
        client.release();
      }
    } else {
      // In-memory fallback
      memoryStore.push({
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        messageId,
        sessionId,
        userId,
        role,
        content,
        embedding,
        createdAt: new Date()
      });
    }
  } catch (error: any) {
    console.error('❌ Error saving message embedding:', error.message || error);
  }
}

/**
 * Perform Semantic Vector Search to recall relevant past user messages
 */
export async function recallPastMemories(
  userQuery: string,
  userId: string,
  currentSessionId: string,
  limit: number = 5,
  similarityThreshold: number = 0.25
): Promise<SavedMemoryRecord[]> {
  try {
    const queryEmbedding = await generateEmbedding(userQuery);

    if (getDbStatus()) {
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const validSessionId = isUUID(currentSessionId) ? currentSessionId : null;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT * FROM match_user_messages($1, $2, $3, $4, $5)`,
          [pgvector.toSql(queryEmbedding), userId, similarityThreshold, limit, validSessionId]
        );

        return result.rows.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          role: 'user',
          content: row.content,
          similarity: parseFloat(row.similarity),
          createdAt: row.created_at
        }));
      } finally {
        client.release();
      }
    } else {
      // Fallback in-memory similarity search
      const results: SavedMemoryRecord[] = [];
      for (const item of memoryStore) {
        if (item.userId === userId && item.role === 'user' && item.sessionId !== currentSessionId) {
          const sim = cosineSimilarity(queryEmbedding, item.embedding);
          if (sim >= similarityThreshold) {
            results.push({
              id: item.id,
              sessionId: item.sessionId,
              role: item.role,
              content: item.content,
              similarity: sim,
              createdAt: item.createdAt.toISOString()
            });
          }
        }
      }

      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    }
  } catch (error: any) {
    console.error('❌ Error recalling memories:', error.message || error);
    return [];
  }
}
