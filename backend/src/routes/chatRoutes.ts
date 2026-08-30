import { Router } from 'express';
import {
  getSessions,
  createSession,
  deleteSession,
  getSessionMessages,
  sendMessage
} from '../controllers/chatController';
import { getDbStatus } from '../db';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConnected: getDbStatus(),
    timestamp: new Date().toISOString()
  });
});

// Chat Sessions
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.delete('/sessions/:sessionId', deleteSession);
router.get('/sessions/:sessionId/messages', getSessionMessages);

// Send Message
router.post('/chat/message', sendMessage);

export default router;
