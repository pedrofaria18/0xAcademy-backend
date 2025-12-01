import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

export interface RateLimitOptions {
  /**
   * Time window in seconds
   * @default 900 (15 minutes)
   */
  windowSeconds?: number;

  /**
   * Maximum requests in window
   * @default 100
   */
  max?: number;

  /**
   * Rate limit by IP address
   * @default true
   */
  byIp?: boolean;

  /**
   * Rate limit by user ID (requires authentication)
   * @default false
   */
  byUser?: boolean;

  /**
   * Custom key generator
   */
  keyGenerator?: (req: AuthRequest) => string;

  /**
   * Custom message when rate limit exceeded
   */
  message?: string;

  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (req: AuthRequest) => boolean;
}

/**
 * Advanced rate limiting using Redis
 * Supports rate limiting by IP, user ID, or custom keys
 *
 * @example
 * // Rate limit by IP
 * router.post('/api/public', advancedRateLimit({ max: 10, windowSeconds: 60 }), handler);
 *
 * // Rate limit by user
 * router.post('/api/protected', authenticate, advancedRateLimit({ byUser: true, max: 100 }), handler);
 *
 * // Custom rate limit
 * router.post('/api/upload', advancedRateLimit({
 *   keyGenerator: (req) => `upload:${req.user?.id}`,
 *   max: 5,
 *   windowSeconds: 3600
 * }), handler);
 */
export const advancedRateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowSeconds = 900, // 15 minutes
    max = 100,
    byIp = true,
    byUser = false,
    keyGenerator,
    message = 'Too many requests, please try again later.',
    skip,
  } = options;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Skip if condition met
      if (skip && skip(req)) {
        return next();
      }

      // Generate rate limit key
      let rateLimitKey: string;

      if (keyGenerator) {
        rateLimitKey = keyGenerator(req);
      } else if (byUser && req.user) {
        rateLimitKey = `ratelimit:user:${req.user.id}:${req.path}`;
      } else if (byIp) {
        const ip = getClientIp(req);
        rateLimitKey = `ratelimit:ip:${ip}:${req.path}`;
      } else {
        // Fallback to IP if no other option
        const ip = getClientIp(req);
        rateLimitKey = `ratelimit:ip:${ip}:${req.path}`;
      }

      // Increment counter
      const currentCount = await CacheService.increment(rateLimitKey, windowSeconds);

      // Get remaining attempts
      const remaining = Math.max(0, max - currentCount);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Date.now() + windowSeconds * 1000);

      // Check if limit exceeded
      if (currentCount > max) {
        const retryAfter = await CacheService.ttl(rateLimitKey);

        logger.warn('Rate limit exceeded', {
          key: rateLimitKey,
          currentCount,
          max,
          userId: req.user?.id,
          ip: getClientIp(req),
          path: req.path,
        });

        res.setHeader('Retry-After', retryAfter > 0 ? retryAfter : windowSeconds);

        return res.status(429).json({
          success: false,
          message,
          retryAfter: retryAfter > 0 ? retryAfter : windowSeconds,
          limit: max,
          windowSeconds,
        });
      }

      next();
    } catch (error) {
      logger.error('Advanced rate limit error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
};

/**
 * Strict rate limiter for sensitive endpoints (auth, payments, etc.)
 */
export const strictRateLimit = advancedRateLimit({
  windowSeconds: 300, // 5 minutes
  max: 5,
  byIp: true,
  message: 'Too many attempts. Please wait before trying again.',
});

/**
 * Authentication rate limiter
 */
export const authRateLimit = advancedRateLimit({
  windowSeconds: 900, // 15 minutes
  max: 10,
  byIp: true,
  message: 'Too many authentication attempts. Please try again later.',
});

/**
 * User-specific rate limiter for authenticated endpoints
 */
export const userRateLimit = (max: number = 100, windowSeconds: number = 900) =>
  advancedRateLimit({
    windowSeconds,
    max,
    byUser: true,
    byIp: false,
    message: 'You have exceeded your request limit. Please try again later.',
  });

/**
 * Upload rate limiter
 */
export const uploadRateLimit = advancedRateLimit({
  windowSeconds: 3600, // 1 hour
  max: 20,
  byUser: true,
  message: 'Upload limit exceeded. Please try again later.',
});

/**
 * Helper to get client IP address
 */
function getClientIp(req: AuthRequest): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Reset rate limit for a specific key (e.g., after successful captcha)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await CacheService.del(key);
    logger.info(`Rate limit reset for key: ${key}`);
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
  }
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(key: string): Promise<{
  current: number;
  ttl: number;
}> {
  try {
    const current = (await CacheService.get<number>(key)) || 0;
    const ttl = await CacheService.ttl(key);

    return { current, ttl };
  } catch (error) {
    logger.error('Failed to get rate limit status:', error);
    return { current: 0, ttl: -1 };
  }
}
