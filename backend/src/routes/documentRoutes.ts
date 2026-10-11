import { Router } from 'express';
import {
  processDocument,
  getDocuments,
  deleteDocument,
  queryDocument,
} from '../controllers/documentController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/process', optionalAuth, processDocument);
router.get('/', optionalAuth, getDocuments);
router.delete('/:id', optionalAuth, deleteDocument);
router.post('/:id/query', optionalAuth, queryDocument);

export default router;
