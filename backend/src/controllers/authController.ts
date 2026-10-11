import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool, getDbStatus } from '../db';
import { authService } from '../services/authService';
import { cacheService } from '../services/cacheService';

// In-Memory Fallback Users Store when DB is offline
interface InMemoryUser {
  id: string;
  email: string;
  passwordHash?: string;
  username: string;
  avatarUrl?: string;
  provider: string;
  createdAt: Date;
}

const inMemoryUsers: InMemoryUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'guest@neurochat.local',
    username: 'Guest User',
    provider: 'local',
    createdAt: new Date(),
  },
];

/**
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response) {
  try {
    const { email, password, username } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = username?.trim() || cleanEmail.split('@')[0];

    // Hash password with bcrypt
    const passwordHash = await authService.hashPassword(password);

    if (getDbStatus()) {
      // Check if user already exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists' });
      }

      const userId = crypto.randomUUID();
      const insertResult = await pool.query(
        `INSERT INTO users (id, username, email, password_hash, provider)
         VALUES ($1, $2, $3, $4, 'local')
         RETURNING id, username, email, avatar_url AS "avatarUrl", provider, created_at AS "createdAt"`,
        [userId, displayName, cleanEmail, passwordHash]
      );

      const user = insertResult.rows[0];
      const token = authService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      // Cache user session
      await cacheService.set(`user:${user.id}`, user, 3600);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user,
      });
    } else {
      // Offline in-memory fallback
      const existing = inMemoryUsers.find((u) => u.email === cleanEmail);
      if (existing) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists' });
      }

      const newUser: InMemoryUser = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        passwordHash,
        username: displayName,
        provider: 'local',
        createdAt: new Date(),
      };
      inMemoryUsers.push(newUser);

      const token = authService.generateToken({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully (In-Memory)',
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          avatarUrl: newUser.avatarUrl,
          provider: newUser.provider,
        },
      });
    }
  } catch (err: any) {
    console.error('❌ Error during signup:', err);
    return res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
}

/**
 * POST /api/auth/signin
 */
export async function signin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (getDbStatus()) {
      const result = await pool.query(
        `SELECT id, username, email, password_hash, avatar_url AS "avatarUrl", provider 
         FROM users 
         WHERE email = $1`,
        [cleanEmail]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const user = result.rows[0];
      if (!user.password_hash) {
        return res.status(401).json({
          success: false,
          error: 'This account was signed up using Google. Please sign in with Google.',
        });
      }

      const isMatch = await authService.comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = authService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      delete user.password_hash;
      await cacheService.set(`user:${user.id}`, user, 3600);

      return res.json({
        success: true,
        message: 'Signed in successfully',
        token,
        user,
      });
    } else {
      const user = inMemoryUsers.find((u) => u.email === cleanEmail);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isMatch = await authService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = authService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      return res.json({
        success: true,
        message: 'Signed in successfully (In-Memory)',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
        },
      });
    }
  } catch (err: any) {
    console.error('❌ Error during signin:', err);
    return res.status(500).json({ success: false, error: err.message || 'Signin failed' });
  }
}

/**
 * POST /api/auth/google
 * Authenticates user via Firebase Google OAuth credentials
 */
export async function googleAuth(req: Request, res: Response) {
  try {
    const { email, displayName, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Google email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const finalName = displayName?.trim() || cleanEmail.split('@')[0];

    if (getDbStatus()) {
      // Find or create user
      let result = await pool.query(
        `SELECT id, username, email, avatar_url AS "avatarUrl", provider 
         FROM users 
         WHERE email = $1`,
        [cleanEmail]
      );

      let user: any;

      if (result.rows.length === 0) {
        const userId = crypto.randomUUID();
        const insertRes = await pool.query(
          `INSERT INTO users (id, username, email, avatar_url, provider)
           VALUES ($1, $2, $3, $4, 'google')
           RETURNING id, username, email, avatar_url AS "avatarUrl", provider`,
          [userId, finalName, cleanEmail, photoURL || null]
        );
        user = insertRes.rows[0];
      } else {
        user = result.rows[0];
        // Update avatar if provided
        if (photoURL && user.avatarUrl !== photoURL) {
          await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [photoURL, user.id]);
          user.avatarUrl = photoURL;
        }
      }

      const token = authService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      await cacheService.set(`user:${user.id}`, user, 3600);

      return res.json({
        success: true,
        message: 'Google authentication successful',
        token,
        user,
      });
    } else {
      let user = inMemoryUsers.find((u) => u.email === cleanEmail);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email: cleanEmail,
          username: finalName,
          avatarUrl: photoURL,
          provider: 'google',
          createdAt: new Date(),
        };
        inMemoryUsers.push(user);
      }

      const token = authService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      return res.json({
        success: true,
        message: 'Google authentication successful (In-Memory)',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
        },
      });
    }
  } catch (err: any) {
    console.error('❌ Error during Google authentication:', err);
    return res.status(500).json({ success: false, error: err.message || 'Google authentication failed' });
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user || req.isGuest) {
      return res.json({
        success: true,
        isGuest: true,
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'Guest User',
          email: 'guest@neurochat.local',
        },
      });
    }

    const cachedUser = await cacheService.get(`user:${req.user.id}`);
    if (cachedUser) {
      return res.json({ success: true, isGuest: false, user: cachedUser });
    }

    if (getDbStatus()) {
      const result = await pool.query(
        `SELECT id, username, email, avatar_url AS "avatarUrl", provider 
         FROM users 
         WHERE id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = result.rows[0];
      await cacheService.set(`user:${user.id}`, user, 3600);
      return res.json({ success: true, isGuest: false, user });
    }

    return res.json({ success: true, isGuest: false, user: req.user });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
