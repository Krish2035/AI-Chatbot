import { Router } from 'express';
import {
  getSessions,
  createSession,
  deleteSession,
  getSessionMessages,
  sendMessage
} from '../controllers/chatController';
import { searchContent } from '../controllers/searchController';
import { getDbStatus } from '../db';
import { hasReadReplica } from '../db/replicaPool';
import { cacheService } from '../services/cacheService';
import { optionalAuth } from '../middleware/authMiddleware';
import { chatLimiter } from '../middleware/rateLimiter';

const router = Router();

// Health Check with Architecture Diagnostics
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConnected: getDbStatus(),
    readReplicaActive: hasReadReplica,
    redisCacheActive: cacheService.isOnline(),
    bullmqQueueActive: cacheService.isOnline(),
    timestamp: new Date().toISOString()
  });
});

// Chat Sessions (authenticated or guest session)
router.get('/sessions', optionalAuth, getSessions);
router.post('/sessions', optionalAuth, createSession);
router.delete('/sessions/:sessionId', optionalAuth, deleteSession);
router.get('/sessions/:sessionId/messages', optionalAuth, getSessionMessages);

// Send Message with rate limiting & memory recall
router.post('/chat/message', optionalAuth, chatLimiter, sendMessage);

// Full-Text Search across chats & documents with GIN index
router.get('/search', optionalAuth, searchContent);

export default router;
