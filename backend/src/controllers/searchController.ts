import { Request, Response } from 'express';
import { pool, getDbStatus } from '../db';
import { queryRead } from '../db/replicaPool';
import { cacheService } from '../services/cacheService';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/search?q=keyword&sessionId=...
 * High-speed Full-Text Search across chat messages and knowledge documents using PostgreSQL GIN index & tsvector
 */
export async function searchContent(req: Request, res: Response) {
  try {
    const query = (req.query.q as string || '').trim();
    const sessionId = req.query.sessionId as string;
    const userId = req.user?.id || DEFAULT_USER_ID;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query parameter "q" is required' });
    }

    // Check Redis / In-memory cache first
    const cacheKey = `search:${userId}:${encodeURIComponent(query)}:${sessionId || 'all'}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, source: 'cache', results: cached });
    }

    if (getDbStatus()) {
      // 1. Full-text search messages using PostgreSQL GIN index
      let messagesSql = `
        SELECT 
          m.id,
          m.session_id AS "sessionId",
          s.title AS "sessionTitle",
          m.role,
          m.content,
          ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2)) AS rank,
          m.created_at AS "createdAt"
        FROM messages m
        JOIN chat_sessions s ON s.id = m.session_id
        WHERE s.user_id = $1
          AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
      `;
      const messageParams: any[] = [userId, query];

      if (sessionId) {
        messagesSql += ` AND m.session_id = $3`;
        messageParams.push(sessionId);
      }

      messagesSql += ` ORDER BY rank DESC, m.created_at DESC LIMIT 25`;

      const msgResults = await queryRead(messagesSql, messageParams);

      // 2. Full-text search documents & chunks using GIN index
      const docSql = `
        SELECT 
          dc.id,
          dc.document_id AS "documentId",
          d.title AS "documentTitle",
          dc.chunk_index AS "chunkIndex",
          dc.chunk_content AS "content",
          ts_rank(to_tsvector('english', dc.chunk_content), plainto_tsquery('english', $2)) AS rank,
          dc.created_at AS "createdAt"
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE dc.user_id = $1
          AND to_tsvector('english', dc.chunk_content) @@ plainto_tsquery('english', $2)
        ORDER BY rank DESC, dc.created_at DESC
        LIMIT 10
      `;
      const docResults = await queryRead(docSql, [userId, query]);

      const results = {
        messages: msgResults.rows,
        documents: docResults.rows,
        totalMatches: msgResults.rows.length + docResults.rows.length,
      };

      // Cache for 90 seconds
      await cacheService.set(cacheKey, results, 90);

      return res.json({ success: true, source: 'database_gin_index', results });
    } else {
      // Offline fallback
      return res.json({
        success: true,
        source: 'in_memory_fallback',
        results: { messages: [], documents: [], totalMatches: 0 },
      });
    }
  } catch (err: any) {
    console.error('❌ Error during search:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
