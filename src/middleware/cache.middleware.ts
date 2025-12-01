import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

export interface CacheOptions {
  /**
   * Time to live in seconds
   * @default 300 (5 minutes)
   */
  ttl?: number;

  /**
   * Custom key generator function
   * @param req Express request object
   * @returns Cache key
   */
  keyGenerator?: (req: AuthRequest) => string;

  /**
   * Whether to include query params in cache key
   * @default true
   */
  includeQueryParams?: boolean;

  /**
   * Whether to include user ID in cache key (requires authentication)
   * @default false
   */
  includeUserId?: boolean;
}

/**
 * Default cache key generator
 */
const defaultKeyGenerator = (
  req: AuthRequest,
  includeQueryParams: boolean = true,
  includeUserId: boolean = false
): string => {
  let key = `cache:${req.method}:${req.path}`;

  if (includeQueryParams && Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map((k) => `${k}=${req.query[k]}`)
      .join('&');
    key += `?${sortedQuery}`;
  }

  if (includeUserId && req.user?.id) {
    key += `:user:${req.user.id}`;
  }

  return key;
};

/**
 * Cache middleware for GET requests
 * Caches the response body and returns it on subsequent requests
 *
 * @example
 * router.get('/courses', cache({ ttl: 600 }), getCourses);
 */
export const cache = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator,
    includeQueryParams = true,
    includeUserId = false,
  } = options;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : defaultKeyGenerator(req, includeQueryParams, includeUserId);

      // Try to get from cache
      const cachedResponse = await CacheService.get<{
        body: any;
        status: number;
        headers: Record<string, string>;
      }>(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache HIT: ${cacheKey}`);

        // Set cached headers
        if (cachedResponse.headers) {
          Object.entries(cachedResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }

        // Add cache header
        res.setHeader('X-Cache', 'HIT');

        return res.status(cachedResponse.status).json(cachedResponse.body);
      }

      logger.debug(`Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (body: any): Response {
        // Cache the response
        CacheService.set(
          cacheKey,
          {
            body,
            status: res.statusCode,
            headers: {
              'Content-Type': res.getHeader('Content-Type') as string,
            },
          },
          ttl
        ).catch((error) => {
          logger.error('Failed to cache response:', error);
        });

        // Add cache header
        res.setHeader('X-Cache', 'MISS');

        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Invalidate cache middleware
 * Deletes cache entries based on pattern
 *
 * @example
 * router.post('/courses', invalidateCache('courses:*'), createCourse);
 */
export const invalidateCache = (...patterns: string[]) => {
  return async (_req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      await Promise.all(patterns.map((pattern) => CacheService.delPattern(pattern)));
      logger.debug(`Invalidated cache patterns: ${patterns.join(', ')}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
    next();
  };
};

/**
 * Cache-aside pattern middleware
 * Useful for caching database queries
 *
 * @example
 * const courses = await cacheAside(
 *   'courses:all',
 *   async () => await db.courses.findMany(),
 *   600
 * );
 */
export const cacheAside = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> => {
  return await CacheService.getOrSet(key, fetchFn, ttl);
};
