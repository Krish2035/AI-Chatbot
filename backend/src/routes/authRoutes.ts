import { Router } from 'express';
import { signup, signin, googleAuth, getMe } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/signup', authLimiter, signup);
router.post('/register', authLimiter, signup);
router.post('/signin', authLimiter, signin);
router.post('/login', authLimiter, signin);
router.post('/google', authLimiter, googleAuth);
router.get('/me', optionalAuth, getMe);

export default router;
