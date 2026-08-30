import { Router } from 'express';
import {
  processDocument,
  getDocuments,
  deleteDocument,
  queryDocument,
} from '../controllers/documentController';

const router = Router();

router.post('/process', processDocument);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);
router.post('/:id/query', queryDocument);

export default router;
