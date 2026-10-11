import { Request, Response, NextFunction } from 'express';

/**
 * CDN Caching & Edge Optimization Middleware
 * Configures headers for Cloudflare, CloudFront, Vercel Edge, or Fastly CDN layers.
 */
export function cdnMiddleware(req: Request, res: Response, next: NextFunction) {
  // Never cache mutation requests or sensitive auth tokens
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) || req.path.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }

  // Static / Health / CDN Edge Cacheable responses
  if (req.path === '/api/health' || req.path === '/') {
    // 60 seconds public edge cache, 10s stale while revalidate
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
    res.setHeader('Vary', 'Accept-Encoding, Origin');
    res.setHeader('X-CDN-Cache-Eligible', 'true');
    return next();
  }

  // User-specific read queries (e.g., sessions, documents list)
  // Cache privately on browser or with short micro-caching
  res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
  res.setHeader('Vary', 'Accept-Encoding, Authorization');
  next();
}
