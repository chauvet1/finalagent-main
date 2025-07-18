"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisConnected = exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
const redisClient = new ioredis_1.default(redisUrl, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    commandTimeout: 5000,
});
let isRedisConnected = false;
exports.isRedisConnected = isRedisConnected;
redisClient.on('connect', () => {
    logger_1.logger.info('Connected to Redis');
    exports.isRedisConnected = isRedisConnected = true;
});
redisClient.on('error', (err) => {
    logger_1.logger.error('Redis error:', err);
    exports.isRedisConnected = isRedisConnected = false;
});
redisClient.on('close', () => {
    logger_1.logger.warn('Redis connection closed');
    exports.isRedisConnected = isRedisConnected = false;
});
const mockRedisClient = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    exists: async () => 0,
    expire: async () => 1,
    publish: async () => 0,
    subscribe: () => { },
    on: () => { },
    duplicate: () => mockRedisClient,
    disconnect: async () => { },
};
const safeRedisClient = new Proxy(redisClient, {
    get(target, prop) {
        if (!isRedisConnected && typeof prop === 'string' && prop in mockRedisClient) {
            logger_1.logger.warn(`Redis not connected, using mock for operation: ${prop}`);
            return mockRedisClient[prop];
        }
        return target[prop];
    }
});
exports.redisClient = safeRedisClient;
//# sourceMappingURL=redis.js.map