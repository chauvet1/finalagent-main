import Redis from 'ioredis';
declare let isRedisConnected: boolean;
declare const safeRedisClient: Redis;
export { safeRedisClient as redisClient, isRedisConnected };
//# sourceMappingURL=redis.d.ts.map