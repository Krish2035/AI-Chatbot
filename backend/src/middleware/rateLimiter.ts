import rateLimit from 'express-rate-limit';

// Global API Rate Limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again in a few minutes.',
  },
});

// Strict Authentication Rate Limiter (Brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// AI & Chat Query Rate Limiter
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 45, // Limit each IP to 45 prompts/minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'You are submitting messages too quickly. Please pause for a moment.',
  },
});
