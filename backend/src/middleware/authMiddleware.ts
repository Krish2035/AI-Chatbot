import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/authService';

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      isGuest?: boolean;
    }
  }
}

/**
 * Optional authentication middleware:
 * Populates req.user if a valid token is present;
 * otherwise gracefully falls back to DEFAULT_USER_ID so existing app features continue uninterrupted.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.isGuest = false;
      return next();
    }
  }

  // Fallback to guest / default user
  req.user = {
    id: DEFAULT_USER_ID,
    username: 'Guest User',
    email: 'guest@neurochat.local',
  };
  req.isGuest = true;
  next();
}

/**
 * Strict authentication middleware:
 * Rejects requests with 401 if a valid token is not present.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.user = decoded;
  req.isGuest = false;
  next();
}
