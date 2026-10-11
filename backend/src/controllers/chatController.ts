import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool, getDbStatus, queryRead, queryWrite } from '../db';
import { saveMessageEmbedding, recallPastMemories } from '../services/memoryService';
import { generateGroqResponse, ChatMessageParam } from '../services/groqService';
import { cacheService } from '../services/cacheService';
import { queueManager } from '../services/queueService';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// In-Memory Fallback State when DB is offline
interface MemorySession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

const inMemorySessions: MemorySession[] = [];
const inMemoryMessages: MemoryMessage[] = [];

/**
 * GET /api/sessions
 */
export async function getSessions(req: Request, res: Response) {
  try {
    const userId = req.user?.id || DEFAULT_USER_ID;
    const cacheKey = `sessions:${userId}`;

    // Read from Redis / Memory cache
    const cachedSessions = await cacheService.get(cacheKey);
    if (cachedSessions) {
      return res.json({ success: true, sessions: cachedSessions, cached: true });
    }

    if (getDbStatus()) {
      // Use Read Replica queryRead for scale
      const result = await queryRead(
        `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt" 
         FROM chat_sessions 
         WHERE user_id = $1 
         ORDER BY updated_at DESC`,
        [userId]
      );

      // Cache for 60 seconds
      await cacheService.set(cacheKey, result.rows, 60);

      return res.json({ success: true, sessions: result.rows });
    } else {
      const userSessions = inMemorySessions.filter((s) => s.userId === userId || userId === DEFAULT_USER_ID);
      return res.json({ success: true, sessions: userSessions });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/sessions
 */
export async function createSession(req: Request, res: Response) {
  const { title } = req.body;
  const sessionTitle = title || 'New Chat';
  const userId = req.user?.id || DEFAULT_USER_ID;

  try {
    if (getDbStatus()) {
      const result = await queryWrite(
        `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at AS "createdAt"`,
        [userId, sessionTitle]
      );
      // Invalidate user sessions cache
      await cacheService.del(`sessions:${userId}`);
      return res.status(201).json({ success: true, session: result.rows[0] });
    } else {
      const newSession: MemorySession = {
        id: crypto.randomUUID(),
        userId: userId,
        title: sessionTitle,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemorySessions.unshift(newSession);
      return res.status(201).json({ success: true, session: newSession });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/sessions/:sessionId
 */
export async function deleteSession(req: Request, res: Response) {
  const { sessionId } = req.params;
  const userId = req.user?.id || DEFAULT_USER_ID;

  try {
    if (getDbStatus()) {
      if (isUUID(sessionId)) {
        await queryWrite('DELETE FROM chat_sessions WHERE id = $1', [sessionId]);
      }
    } else {
      const index = inMemorySessions.findIndex(s => s.id === sessionId);
      if (index !== -1) inMemorySessions.splice(index, 1);
    }

    // Invalidate caches
    await cacheService.del(`sessions:${userId}`);
    await cacheService.del(`session:${sessionId}:messages`);

    return res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/sessions/:sessionId/messages
 */
export async function getSessionMessages(req: Request, res: Response) {
  const { sessionId } = req.params;
  const cacheKey = `session:${sessionId}:messages`;

  try {
    // Read from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, messages: cached, cached: true });
    }

    if (getDbStatus()) {
      if (!isUUID(sessionId)) {
        return res.json({ success: true, messages: [] });
      }
      // Route read to Read Replica pool
      const result = await queryRead(
        `SELECT id, session_id AS "sessionId", role, content, created_at AS "createdAt"
         FROM messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
      );
      // Cache messages for 60 seconds
      await cacheService.set(cacheKey, result.rows, 60);

      return res.json({ success: true, messages: result.rows });
    } else {
      const messages = inMemoryMessages.filter(m => m.sessionId === sessionId);
      return res.json({ success: true, messages });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/chat/message
 * Core logic for sending a message, recalling vector memories, and asking Groq AI
 */
export async function sendMessage(req: Request, res: Response) {
  const { sessionId, content } = req.body;
  const userId = req.user?.id || DEFAULT_USER_ID;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Message content is required' });
  }

  try {
    let currentSessionId = sessionId;

    // Create a new session if none provided or if sessionId is not a valid UUID format
    if (!currentSessionId || !isUUID(currentSessionId)) {
      const titleSnippet = content.length > 30 ? `${content.substring(0, 30)}...` : content;
      if (getDbStatus()) {
        const newSess = await queryWrite(
          `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id`,
          [userId, titleSnippet]
        );
        currentSessionId = newSess.rows[0].id;
      } else {
        currentSessionId = crypto.randomUUID();
        inMemorySessions.unshift({
          id: currentSessionId,
          userId: userId,
          title: titleSnippet,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      await cacheService.del(`sessions:${userId}`);
    }

    // 1. Fetch Short-Term History for current session using Read Replica
    let shortTermHistory: ChatMessageParam[] = [];
    if (getDbStatus()) {
      const histResult = await queryRead(
        `SELECT role, content FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 10`,
        [currentSessionId]
      );
      shortTermHistory = histResult.rows.map(r => ({ role: r.role, content: r.content }));
    } else {
      shortTermHistory = inMemoryMessages
        .filter(m => m.sessionId === currentSessionId)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));
    }

    // 2. Perform Long-Term Memory Recall via Hugging Face Vector Search
    const recalledMemories = await recallPastMemories(
      content,
      userId,
      currentSessionId,
      5, // top 5 past memories
      0.20 // similarity threshold
    );

    // 3. Save User Message
    const userMsgId = crypto.randomUUID();
    if (getDbStatus()) {
      await queryWrite(
        `INSERT INTO messages (id, session_id, role, content) VALUES ($1, $2, $3, $4)`,
        [userMsgId, currentSessionId, 'user', content]
      );
      await queryWrite(
        `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [currentSessionId]
      );
    } else {
      inMemoryMessages.push({
        id: userMsgId,
        sessionId: currentSessionId,
        role: 'user',
        content,
        createdAt: new Date()
      });
    }

    // Invalidate session messages cache
    await cacheService.del(`session:${currentSessionId}:messages`);

    // Offload Vector Embedding to BullMQ Queue for high throughput
    queueManager.addJob('embeddingQueue', {
      messageId: userMsgId,
      sessionId: currentSessionId,
      userId: userId,
      role: 'user',
      content,
    });

    // 4. Generate AI response using Groq SDK (with injected memory context)
    const aiResponse = await generateGroqResponse(content, shortTermHistory, recalledMemories);

    // 5. Save Assistant Message
    const assistantMsgId = crypto.randomUUID();
    if (getDbStatus()) {
      await queryWrite(
        `INSERT INTO messages (id, session_id, role, content) VALUES ($1, $2, $3, $4)`,
        [assistantMsgId, currentSessionId, 'assistant', aiResponse.text]
      );
    } else {
      inMemoryMessages.push({
        id: assistantMsgId,
        sessionId: currentSessionId,
        role: 'assistant',
        content: aiResponse.text,
        createdAt: new Date()
      });
    }

    // Invalidate cache
    await cacheService.del(`session:${currentSessionId}:messages`);

    return res.json({
      success: true,
      sessionId: currentSessionId,
      userMessage: {
        id: userMsgId,
        role: 'user',
        content,
        createdAt: new Date()
      },
      assistantMessage: {
        id: assistantMsgId,
        role: 'assistant',
        content: aiResponse.text,
        createdAt: new Date(),
        modelUsed: aiResponse.modelUsed,
        recalledMemories: aiResponse.memoriesUsed
      }
    });

  } catch (error: any) {
    console.error('❌ Error sending message:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
