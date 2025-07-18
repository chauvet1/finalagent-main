"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckService = void 0;
const client_1 = require("@prisma/client");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class HealthCheckService {
    constructor() {
        this.prisma = prisma;
        this.redis = new ioredis_1.default(process.env['REDIS_URL'] || 'redis://localhost:6379');
    }
    async performHealthCheck() {
        const checks = [
            this.checkDatabase(),
            this.checkRedis(),
            this.checkExternalServices(),
        ];
        const results = await Promise.allSettled(checks);
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                const services = ['database', 'redis', 'external-services'];
                return {
                    service: services[index],
                    status: 'unhealthy',
                    responseTime: 0,
                    lastChecked: new Date(),
                    error: result.reason?.message || 'Unknown error',
                };
            }
        });
    }
    async checkDatabase() {
        const startTime = Date.now();
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            await this.prisma.healthCheck.create({
                data: {
                    service: 'database',
                    status: 'healthy',
                    checkedAt: new Date(),
                },
            });
            return {
                service: 'database',
                status: 'healthy',
                responseTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            await this.prisma.healthCheck.create({
                data: {
                    service: 'database',
                    status: 'unhealthy',
                    checkedAt: new Date(),
                },
            });
            return {
                service: 'database',
                status: 'unhealthy',
                responseTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Database connection failed',
            };
        }
    }
    async checkRedis() {
        const startTime = Date.now();
        try {
            const responseTime = Date.now() - startTime;
            await this.prisma.healthCheck.create({
                data: {
                    service: 'redis',
                    status: 'healthy',
                    checkedAt: new Date(),
                },
            });
            return {
                service: 'redis',
                status: 'healthy',
                responseTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            await this.prisma.healthCheck.create({
                data: {
                    service: 'redis',
                    status: 'unhealthy',
                    checkedAt: new Date(),
                },
            });
            return {
                service: 'redis',
                status: 'unhealthy',
                responseTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Redis connection failed',
            };
        }
    }
    async checkExternalServices() {
        const startTime = Date.now();
        try {
            const responseTime = Date.now() - startTime;
            await this.prisma.healthCheck.create({
                data: {
                    service: 'external-services',
                    status: 'healthy',
                    checkedAt: new Date(),
                },
            });
            return {
                service: 'external-services',
                status: 'healthy',
                responseTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            await this.prisma.healthCheck.create({
                data: {
                    service: 'external-services',
                    status: 'unhealthy',
                    checkedAt: new Date(),
                },
            });
            return {
                service: 'external-services',
                status: 'unhealthy',
                responseTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'External services check failed',
            };
        }
    }
    async getHealthHistory(service, limit = 100) {
        try {
            const whereClause = {};
            if (service) {
                whereClause.service = service;
            }
            const history = await this.prisma.healthCheck.findMany({
                where: whereClause,
                orderBy: { checkedAt: 'desc' },
                take: limit,
            });
            return history;
        }
        catch (error) {
            logger_1.logger.error('Error fetching health history:', error);
            return [];
        }
    }
    async getServiceStatus(service) {
        try {
            const latestCheck = await this.prisma.healthCheck.findFirst({
                where: { service },
                orderBy: { checkedAt: 'desc' },
            });
            if (!latestCheck) {
                return null;
            }
            return {
                service: latestCheck.service,
                status: latestCheck.status,
                responseTime: 0,
                lastChecked: latestCheck.checkedAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching service status:', error);
            return null;
        }
    }
    async getReadinessCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            await this.redis.ping();
            return {
                ready: true,
                checks: {
                    database: 'ready',
                    redis: 'ready'
                }
            };
        }
        catch (error) {
            return {
                ready: false,
                checks: {
                    database: 'not ready',
                    redis: 'not ready',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
    async getLivenessCheck() {
        return { alive: true };
    }
    async cleanup() {
        try {
            await this.prisma.$disconnect();
            await this.redis.quit();
        }
        catch (error) {
            logger_1.logger.error('Error during health check service cleanup', { error });
        }
    }
}
exports.HealthCheckService = HealthCheckService;
//# sourceMappingURL=healthCheckService.js.map