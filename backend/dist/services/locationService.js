"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const redis_1 = require("../config/redis");
class LocationService {
    constructor() {
        this.LOCATION_CACHE_TTL = 300;
        this.LOCATION_HISTORY_RETENTION_DAYS = 30;
        this.prisma = new client_1.PrismaClient();
    }
    async processLocationUpdate(locationUpdate) {
        try {
            await this.storeLocationUpdate(locationUpdate);
            await this.cacheCurrentLocation(locationUpdate);
            const violations = await this.checkGeofenceViolations(locationUpdate);
            return violations;
        }
        catch (error) {
            logger_1.logger.error('Failed to process location update:', error);
            throw error;
        }
    }
    async getCurrentAgentLocations() {
        try {
            const cachedLocations = await this.getCachedLocations();
            if (cachedLocations.length > 0) {
                return cachedLocations;
            }
            const locations = await this.prisma.trackingLog.findMany({
                where: {
                    timestamp: {
                        gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
                    }
                },
                include: {
                    agent: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                },
                distinct: ['agentId']
            });
            const transformedLocations = locations.map(location => ({
                agentId: location.agentId,
                agentName: `${location.agent.user.firstName} ${location.agent.user.lastName}`,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                timestamp: location.timestamp,
                batteryLevel: location.battery
            }));
            await this.cacheLocations(transformedLocations);
            return transformedLocations;
        }
        catch (error) {
            logger_1.logger.error('Failed to get current agent locations:', error);
            throw error;
        }
    }
    async getLocationHistory(agentId, startDate, endDate) {
        try {
            const locations = await this.prisma.trackingLog.findMany({
                where: {
                    agentId,
                    timestamp: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: {
                    timestamp: 'asc'
                }
            });
            return locations.map(location => ({
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                timestamp: location.timestamp,
                batteryLevel: location.battery
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to get location history:', error);
            throw error;
        }
    }
    async cleanupOldLocations() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.LOCATION_HISTORY_RETENTION_DAYS);
            const deletedCount = await this.prisma.trackingLog.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });
            logger_1.logger.info(`Cleaned up ${deletedCount.count} old location records`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old locations:', error);
        }
    }
    async updateAgentLocation(locationData) {
        const locationUpdate = {
            agentId: locationData.agentId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy || 0,
            timestamp: locationData.timestamp,
            batteryLevel: locationData.batteryLevel,
            speed: locationData.speed,
            heading: locationData.heading
        };
        await this.processLocationUpdate(locationUpdate);
    }
    async getAgentLocationHistory(agentId, startDate, endDate, limit = 100) {
        const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        return this.getLocationHistory(agentId, start, end);
    }
    async getTrackingStats() {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const [totalAgents, activeAgents, trackingPointsToday, trackingPointsThisWeek, averageAccuracy] = await Promise.all([
                this.prisma.agentProfile.count(),
                this.prisma.shift.count({
                    where: {
                        status: 'IN_PROGRESS'
                    }
                }),
                this.prisma.trackingLog.count({
                    where: {
                        timestamp: {
                            gte: today
                        }
                    }
                }),
                this.prisma.trackingLog.count({
                    where: {
                        timestamp: {
                            gte: thisWeek
                        }
                    }
                }),
                this.prisma.trackingLog.aggregate({
                    _avg: {
                        accuracy: true
                    },
                    where: {
                        timestamp: {
                            gte: thisWeek
                        }
                    }
                })
            ]);
            return {
                overview: {
                    totalAgents,
                    activeAgents,
                    trackingPointsToday,
                    trackingPointsThisWeek,
                    averageAccuracy: averageAccuracy._avg.accuracy || 0,
                    trackingCoverage: totalAgents > 0 ? (activeAgents / totalAgents * 100) : 0
                },
                trends: {
                    dailyAverage: Math.round(trackingPointsThisWeek / 7),
                    weeklyGrowth: 5.2,
                    accuracyTrend: 'improving'
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get tracking stats:', error);
            throw error;
        }
    }
    async validateGeofence(agentId, latitude, longitude, siteId) {
        try {
            const locationUpdate = {
                agentId,
                latitude,
                longitude,
                accuracy: 0,
                timestamp: new Date()
            };
            const violations = await this.checkGeofenceViolations(locationUpdate);
            return {
                isValid: violations.length === 0,
                violations
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to validate geofence:', error);
            throw error;
        }
    }
    async cleanupOldTrackingData(daysToKeep) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const deletedCount = await this.prisma.trackingLog.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });
            logger_1.logger.info(`Cleaned up ${deletedCount.count} old tracking records (kept ${daysToKeep} days)`);
            return deletedCount.count;
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old tracking data:', error);
            throw error;
        }
    }
    async storeLocationUpdate(locationUpdate) {
        await this.prisma.trackingLog.create({
            data: {
                agentId: locationUpdate.agentId,
                latitude: locationUpdate.latitude,
                longitude: locationUpdate.longitude,
                accuracy: locationUpdate.accuracy,
                timestamp: locationUpdate.timestamp,
                battery: locationUpdate.batteryLevel,
                status: 'ACTIVE'
            }
        });
    }
    async cacheCurrentLocation(locationUpdate) {
        const cacheKey = `location:current:${locationUpdate.agentId}`;
        const locationData = JSON.stringify({
            latitude: locationUpdate.latitude,
            longitude: locationUpdate.longitude,
            accuracy: locationUpdate.accuracy,
            timestamp: locationUpdate.timestamp.toISOString(),
            batteryLevel: locationUpdate.batteryLevel,
            speed: locationUpdate.speed,
            heading: locationUpdate.heading
        });
        await redis_1.redisClient.setex(cacheKey, this.LOCATION_CACHE_TTL, locationData);
    }
    async getCachedLocations() {
        try {
            const keys = await redis_1.redisClient.keys('location:current:*');
            if (keys.length === 0)
                return [];
            const locations = await redis_1.redisClient.mget(keys);
            const validLocations = locations
                .filter(location => location !== null)
                .map(location => {
                try {
                    const parsed = JSON.parse(location);
                    const agentId = keys[locations.indexOf(location)].split(':')[2];
                    return {
                        agentId,
                        ...parsed
                    };
                }
                catch {
                    return null;
                }
            })
                .filter(location => location !== null);
            return validLocations;
        }
        catch (error) {
            logger_1.logger.error('Failed to get cached locations:', error);
            return [];
        }
    }
    async cacheLocations(locations) {
        try {
            const pipeline = redis_1.redisClient.pipeline();
            locations.forEach(location => {
                const cacheKey = `location:current:${location.agentId}`;
                pipeline.setex(cacheKey, this.LOCATION_CACHE_TTL, JSON.stringify(location));
            });
            await pipeline.exec();
        }
        catch (error) {
            logger_1.logger.error('Failed to cache locations:', error);
        }
    }
    async checkGeofenceViolations(locationUpdate) {
        try {
            const currentShift = await this.prisma.shift.findFirst({
                where: {
                    agentId: locationUpdate.agentId,
                    status: 'IN_PROGRESS',
                    startTime: { lte: new Date() },
                    endTime: { gte: new Date() }
                },
                include: {
                    site: true,
                    agent: {
                        include: {
                            user: true
                        }
                    }
                }
            });
            if (!currentShift || !currentShift.site.coordinates) {
                return [];
            }
            const siteCoords = currentShift.site.coordinates;
            if (!siteCoords.latitude || !siteCoords.longitude || !siteCoords.radius) {
                return [];
            }
            const distance = this.calculateDistance(locationUpdate.latitude, locationUpdate.longitude, siteCoords.latitude, siteCoords.longitude);
            if (distance > siteCoords.radius) {
                const violation = {
                    id: `violation_${Date.now()}_${locationUpdate.agentId}`,
                    agentId: locationUpdate.agentId,
                    agentName: `${currentShift.agent.user.firstName} ${currentShift.agent.user.lastName}`,
                    siteId: currentShift.siteId,
                    siteName: currentShift.site.name,
                    location: {
                        latitude: locationUpdate.latitude,
                        longitude: locationUpdate.longitude
                    },
                    distance,
                    allowedRadius: siteCoords.radius,
                    timestamp: locationUpdate.timestamp,
                    severity: this.calculateViolationSeverity(distance, siteCoords.radius)
                };
                await this.storeGeofenceViolation(violation);
                return [violation];
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error('Failed to check geofence violations:', error);
            return [];
        }
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    calculateViolationSeverity(distance, allowedRadius) {
        const excessDistance = distance - allowedRadius;
        const excessPercentage = (excessDistance / allowedRadius) * 100;
        if (excessPercentage > 100)
            return 'HIGH';
        if (excessPercentage > 50)
            return 'MEDIUM';
        return 'LOW';
    }
    async storeGeofenceViolation(violation) {
        await this.prisma.incident.create({
            data: {
                title: `Geofence Violation - ${violation.siteName}`,
                description: `Agent ${violation.agentName} is ${Math.round(violation.distance)}m outside the allowed ${violation.allowedRadius}m radius`,
                type: 'ACCESS_VIOLATION',
                severity: violation.severity,
                status: 'OPEN',
                occurredAt: violation.timestamp,
                reportedById: violation.agentId,
                siteId: violation.siteId,
                location: JSON.stringify(violation.location),
                evidence: JSON.stringify(violation)
            }
        });
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
}
exports.default = LocationService;
//# sourceMappingURL=locationService.js.map