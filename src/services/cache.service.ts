import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

export class CacheService {
  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      if (!redis) {
        logger.warn('Redis not available, skipping cache get');
        return null;
      }

      const cached = await redis.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
   */
  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) {
        logger.warn('Redis not available, skipping cache set');
        return;
      }

      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  static async del(key: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) {
        logger.warn('Redis not available, skipping cache delete');
        return;
      }

      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching pattern
   * @param pattern Pattern to match (e.g., "courses:*")
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) {
        logger.warn('Redis not available, skipping cache pattern delete');
        return;
      }

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Cache pattern delete error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) {
        logger.warn('Redis not available, skipping cache clear');
        return;
      }

      await redis.flushdb();
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const redis = getRedis();
      if (!redis) {
        return false;
      }

      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   * @param key Cache key
   * @param fetchFn Function to fetch data if not cached
   * @param ttlSeconds Time to live in seconds
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetchFn();

    // Store in cache
    await this.set(key, fresh, ttlSeconds);

    return fresh;
  }

  /**
   * Increment a counter in cache
   * @param key Cache key
   * @param ttlSeconds Time to live in seconds (only set on first increment)
   */
  static async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const redis = getRedis();
      if (!redis) {
        return 0;
      }

      const count = await redis.incr(key);

      // Set TTL only on first increment
      if (count === 1 && ttlSeconds) {
        await redis.expire(key, ttlSeconds);
      }

      return count;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get TTL of a key
   * @param key Cache key
   * @returns TTL in seconds, or -1 if key has no expiry, -2 if key doesn't exist
   */
  static async ttl(key: string): Promise<number> {
    try {
      const redis = getRedis();
      if (!redis) {
        return -2;
      }

      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL check error for key ${key}:`, error);
      return -2;
    }
  }
}

// Cache key builders for consistency
export const CacheKeys = {
  // Courses
  course: (id: string) => `course:${id}`,
  coursesList: (published?: boolean) =>
    published !== undefined ? `courses:published:${published}` : 'courses:all',
  coursesByInstructor: (instructorId: string) => `courses:instructor:${instructorId}`,

  // Lessons
  lesson: (id: string) => `lesson:${id}`,
  courseLessons: (courseId: string) => `lessons:course:${courseId}`,

  // User
  user: (id: string) => `user:${id}`,
  userByWallet: (walletAddress: string) => `user:wallet:${walletAddress}`,

  // Enrollments
  userEnrollments: (userId: string) => `enrollments:user:${userId}`,
  courseEnrollments: (courseId: string) => `enrollments:course:${courseId}`,
  enrollment: (userId: string, courseId: string) => `enrollment:${userId}:${courseId}`,

  // Progress
  lessonProgress: (userId: string, lessonId: string) => `progress:${userId}:${lessonId}`,
  courseProgress: (userId: string, courseId: string) => `progress:course:${userId}:${courseId}`,

  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
  userRateLimit: (userId: string, endpoint: string) => `ratelimit:user:${userId}:${endpoint}`,

  // Nonces (SIWE)
  nonce: (walletAddress: string) => `nonce:${walletAddress}`,
};
