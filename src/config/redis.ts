import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { env } from '../utils/validateEnv';

let redis: Redis | null = null;

export const connectRedis = (): Redis | null => {
  if (redis) {
    return redis;
  }

  // Don't try to connect if Redis is not configured
  if (!env.REDIS_HOST) {
    logger.info('⚠️ Redis not configured - running without cache');
    return null;
  }

  try {
    redis = new Redis({
      host: env.REDIS_HOST || 'localhost',
      port: parseInt(env.REDIS_PORT || '6379'),
      password: env.REDIS_PASSWORD || undefined,
      db: parseInt(env.REDIS_DB || '0'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
    });

    redis.on('ready', () => {
      logger.info('🚀 Redis is ready to use');
    });

    redis.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    return redis;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    logger.warn('⚠️ Running without Redis cache');
    redis = null;
    return null;
  }
};

export const getRedis = (): Redis | null => {
  return redis;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
};
