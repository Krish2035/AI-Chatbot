import { Request, Response } from 'express';
import { pool, getDbStatus } from '../db';
import { saveMessageEmbedding, recallPastMemories } from '../services/memoryService';
import { generateGroqResponse, ChatMessageParam } from '../services/groqService';
import crypto from 'crypto';

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
    if (getDbStatus()) {
      const result = await pool.query(
        `SELECT id, title, created_at AS "createdAt", updated_at AS "updatedAt" 
         FROM chat_sessions 
         WHERE user_id = $1 
         ORDER BY updated_at DESC`,
        [DEFAULT_USER_ID]
      );
      return res.json({ success: true, sessions: result.rows });
    } else {
      return res.json({ success: true, sessions: inMemorySessions });
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

  try {
    if (getDbStatus()) {
      const result = await pool.query(
        `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at AS "createdAt"`,
        [DEFAULT_USER_ID, sessionTitle]
      );
      return res.status(201).json({ success: true, session: result.rows[0] });
    } else {
      const newSession: MemorySession = {
        id: crypto.randomUUID(),
        userId: DEFAULT_USER_ID,
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

  try {
    if (getDbStatus()) {
      if (isUUID(sessionId)) {
        await pool.query('DELETE FROM chat_sessions WHERE id = $1', [sessionId]);
      }
    } else {
      const index = inMemorySessions.findIndex(s => s.id === sessionId);
      if (index !== -1) inMemorySessions.splice(index, 1);
    }
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

  try {
    if (getDbStatus()) {
      if (!isUUID(sessionId)) {
        return res.json({ success: true, messages: [] });
      }
      const result = await pool.query(
        `SELECT id, session_id AS "sessionId", role, content, created_at AS "createdAt"
         FROM messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
      );
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

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Message content is required' });
  }

  try {
    let currentSessionId = sessionId;

    // Create a new session if none provided or if sessionId is not a valid UUID format
    if (!currentSessionId || !isUUID(currentSessionId)) {
      const titleSnippet = content.length > 30 ? `${content.substring(0, 30)}...` : content;
      if (getDbStatus()) {
        const newSess = await pool.query(
          `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id`,
          [DEFAULT_USER_ID, titleSnippet]
        );
        currentSessionId = newSess.rows[0].id;
      } else {
        currentSessionId = crypto.randomUUID();
        inMemorySessions.unshift({
          id: currentSessionId,
          userId: DEFAULT_USER_ID,
          title: titleSnippet,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // 1. Fetch Short-Term History for current session
    let shortTermHistory: ChatMessageParam[] = [];
    if (getDbStatus()) {
      const histResult = await pool.query(
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
      DEFAULT_USER_ID,
      currentSessionId,
      5, // top 5 past memories
      0.20 // similarity threshold
    );

    // 3. Save User Message
    const userMsgId = crypto.randomUUID();
    if (getDbStatus()) {
      await pool.query(
        `INSERT INTO messages (id, session_id, role, content) VALUES ($1, $2, $3, $4)`,
        [userMsgId, currentSessionId, 'user', content]
      );
      await pool.query(
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

    // Save Vector Embedding of User Message for Future Memory Recall
    saveMessageEmbedding(userMsgId, currentSessionId, DEFAULT_USER_ID, 'user', content);

    // 4. Generate AI response using Groq SDK (with injected memory context)
    const aiResponse = await generateGroqResponse(content, shortTermHistory, recalledMemories);

    // 5. Save Assistant Message
    const assistantMsgId = crypto.randomUUID();
    if (getDbStatus()) {
      await pool.query(
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
