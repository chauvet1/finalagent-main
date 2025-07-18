import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

// Create Redis client with fallback handling
const redisClient = new Redis(redisUrl, {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 5000,
  commandTimeout: 5000,
});

let isRedisConnected = false;

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
  isRedisConnected = true;
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
  isRedisConnected = false;
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
  isRedisConnected = false;
});

// Mock Redis client for when Redis is not available
const mockRedisClient = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  exists: async () => 0,
  expire: async () => 1,
  publish: async () => 0,
  subscribe: () => {},
  on: () => {},
  duplicate: () => mockRedisClient,
  disconnect: async () => {},
};

// Export a wrapper that falls back to mock when Redis is unavailable
const safeRedisClient = new Proxy(redisClient, {
  get(target, prop) {
    if (!isRedisConnected && typeof prop === 'string' && prop in mockRedisClient) {
      logger.warn(`Redis not connected, using mock for operation: ${prop}`);
      return (mockRedisClient as any)[prop];
    }
    return (target as any)[prop];
  }
});

export { safeRedisClient as redisClient, isRedisConnected }; 