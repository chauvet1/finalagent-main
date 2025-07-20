"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const redis_1 = require("../config/redis");
class EmergencyAlertService {
    constructor() {
        this.ALERT_CACHE_TTL = 3600;
        this.MAX_ESCALATION_LEVEL = 3;
        this.DEFAULT_ESCALATIONS = [
            {
                level: 1,
                delayMinutes: 0,
                recipients: ['supervisor'],
                channels: ['websocket', 'push']
            },
            {
                level: 2,
                delayMinutes: 5,
                recipients: ['supervisor', 'admin'],
                channels: ['websocket', 'push', 'email']
            },
            {
                level: 3,
                delayMinutes: 15,
                recipients: ['supervisor', 'admin', 'emergency_contact'],
                channels: ['websocket', 'push', 'email', 'sms']
            }
        ];
        this.prisma = new client_1.PrismaClient();
    }
    async createEmergencyAlert(alertData) {
        try {
            const agent = await this.prisma.agentProfile.findUnique({
                where: { id: alertData.agentId },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            });
            if (!agent) {
                throw new Error('Agent not found');
            }
            const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const alert = {
                id: alertId,
                type: alertData.type,
                priority: alertData.type === 'PANIC' || alertData.type === 'MEDICAL' ? 'CRITICAL' : 'HIGH',
                agentId: alertData.agentId,
                agentName: `${agent.user.firstName} ${agent.user.lastName}`,
                location: alertData.location,
                description: alertData.description,
                metadata: alertData.metadata,
                timestamp: new Date(),
                status: 'ACTIVE',
                escalationLevel: 1,
                notificationsSent: []
            };
            await this.storeAlert(alert);
            await this.cacheAlert(alert);
            await this.startEscalationProcess(alert);
            logger_1.logger.warn(`Emergency alert created: ${alert.id} - ${alert.type} from ${alert.agentName}`);
            return alert;
        }
        catch (error) {
            logger_1.logger.error('Failed to create emergency alert:', error);
            throw error;
        }
    }
    async acknowledgeAlert(alertId, acknowledgedBy) {
        try {
            const alert = await this.getAlert(alertId);
            if (!alert) {
                throw new Error('Alert not found');
            }
            if (alert.status !== 'ACTIVE') {
                throw new Error('Alert is not active');
            }
            alert.status = 'ACKNOWLEDGED';
            alert.acknowledgedBy = acknowledgedBy;
            alert.acknowledgedAt = new Date();
            await this.updateAlert(alert);
            await this.cancelEscalation(alertId);
            logger_1.logger.info(`Emergency alert acknowledged: ${alertId} by ${acknowledgedBy}`);
            return alert;
        }
        catch (error) {
            logger_1.logger.error('Failed to acknowledge alert:', error);
            throw error;
        }
    }
    async resolveAlert(alertId, resolvedBy, resolution) {
        try {
            const alert = await this.getAlert(alertId);
            if (!alert) {
                throw new Error('Alert not found');
            }
            alert.status = resolution;
            alert.resolvedBy = resolvedBy;
            alert.resolvedAt = new Date();
            await this.updateAlert(alert);
            await this.cancelEscalation(alertId);
            logger_1.logger.info(`Emergency alert resolved: ${alertId} by ${resolvedBy} as ${resolution}`);
            return alert;
        }
        catch (error) {
            logger_1.logger.error('Failed to resolve alert:', error);
            throw error;
        }
    }
    async getActiveAlerts() {
        try {
            const cachedAlerts = await this.getCachedActiveAlerts();
            if (cachedAlerts.length > 0) {
                return cachedAlerts;
            }
            const incidents = await this.prisma.incident.findMany({
                where: {
                    type: {
                        in: ['MEDICAL_EMERGENCY', 'FIRE', 'SECURITY_BREACH', 'OTHER']
                    },
                    status: {
                        in: ['OPEN', 'IN_PROGRESS']
                    }
                },
                include: {
                    reportedBy: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    occurredAt: 'desc'
                }
            });
            const alerts = incidents.map(incident => this.mapIncidentToAlert(incident));
            await this.cacheActiveAlerts(alerts);
            return alerts;
        }
        catch (error) {
            logger_1.logger.error('Failed to get active alerts:', error);
            throw error;
        }
    }
    async getAlert(alertId) {
        try {
            const cached = await redis_1.redisClient.get(`alert:${alertId}`);
            if (cached) {
                return JSON.parse(cached);
            }
            const incident = await this.prisma.incident.findFirst({
                where: {
                    evidence: {
                        path: ['alertId'],
                        equals: alertId
                    }
                },
                include: {
                    reportedBy: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    }
                }
            });
            if (!incident)
                return null;
            const alert = this.mapIncidentToAlert(incident);
            await this.cacheAlert(alert);
            return alert;
        }
        catch (error) {
            logger_1.logger.error('Failed to get alert:', error);
            return null;
        }
    }
    async processEscalation(alertId, escalationLevel) {
        try {
            const alert = await this.getAlert(alertId);
            if (!alert || alert.status !== 'ACTIVE') {
                return;
            }
            const escalation = this.DEFAULT_ESCALATIONS.find(e => e.level === escalationLevel);
            if (!escalation) {
                logger_1.logger.warn(`No escalation configuration found for level ${escalationLevel}`);
                return;
            }
            alert.escalationLevel = escalationLevel;
            await this.updateAlert(alert);
            await this.sendEscalationNotifications(alert, escalation);
            if (escalationLevel < this.MAX_ESCALATION_LEVEL) {
                await this.scheduleEscalation(alertId, escalationLevel + 1);
            }
            logger_1.logger.info(`Alert ${alertId} escalated to level ${escalationLevel}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to process escalation:', error);
        }
    }
    async storeAlert(alert) {
        const agent = await this.prisma.agentProfile.findUnique({
            where: { id: alert.agentId },
            include: { currentSite: true }
        });
        await this.prisma.incident.create({
            data: {
                title: `Emergency Alert - ${alert.type}`,
                description: alert.description || `${alert.type} alert from ${alert.agentName}`,
                type: alert.type === 'MEDICAL' ? 'MEDICAL_EMERGENCY' :
                    alert.type === 'FIRE' ? 'FIRE' :
                        alert.type === 'SECURITY' ? 'SECURITY_BREACH' : 'OTHER',
                severity: alert.priority,
                status: 'OPEN',
                occurredAt: alert.timestamp,
                reportedById: alert.agentId,
                siteId: agent?.currentSiteId || 'unknown',
                location: alert.location ? JSON.stringify(alert.location) : null,
                evidence: JSON.stringify({
                    alertId: alert.id,
                    alertType: alert.type,
                    priority: alert.priority,
                    escalationLevel: alert.escalationLevel,
                    metadata: alert.metadata
                })
            }
        });
    }
    async updateAlert(alert) {
        await this.prisma.incident.updateMany({
            where: {
                evidence: {
                    path: ['alertId'],
                    equals: alert.id
                }
            },
            data: {
                status: alert.status === 'ACTIVE' ? 'OPEN' :
                    alert.status === 'ACKNOWLEDGED' ? 'IN_PROGRESS' : 'RESOLVED',
                resolvedAt: alert.resolvedAt,
                evidence: JSON.stringify({
                    alertId: alert.id,
                    alertType: alert.type,
                    priority: alert.priority,
                    escalationLevel: alert.escalationLevel,
                    acknowledgedBy: alert.acknowledgedBy,
                    acknowledgedAt: alert.acknowledgedAt,
                    resolvedBy: alert.resolvedBy,
                    resolvedAt: alert.resolvedAt,
                    metadata: alert.metadata
                })
            }
        });
        await this.cacheAlert(alert);
    }
    async cacheAlert(alert) {
        await redis_1.redisClient.setex(`alert:${alert.id}`, this.ALERT_CACHE_TTL, JSON.stringify(alert));
    }
    async getCachedActiveAlerts() {
        try {
            const keys = await redis_1.redisClient.keys('alert:*');
            if (keys.length === 0)
                return [];
            const alerts = await redis_1.redisClient.mget(keys);
            return alerts
                .filter(alert => alert !== null)
                .map(alert => JSON.parse(alert))
                .filter(alert => alert.status === 'ACTIVE');
        }
        catch (error) {
            logger_1.logger.error('Failed to get cached active alerts:', error);
            return [];
        }
    }
    async cacheActiveAlerts(alerts) {
        const pipeline = redis_1.redisClient.pipeline();
        alerts.forEach(alert => {
            pipeline.setex(`alert:${alert.id}`, this.ALERT_CACHE_TTL, JSON.stringify(alert));
        });
        await pipeline.exec();
    }
    async startEscalationProcess(alert) {
        await this.processEscalation(alert.id, 1);
    }
    async scheduleEscalation(alertId, level) {
        const escalation = this.DEFAULT_ESCALATIONS.find(e => e.level === level);
        if (!escalation)
            return;
        const delayMs = escalation.delayMinutes * 60 * 1000;
        const scheduleKey = `escalation:${alertId}:${level}`;
        await redis_1.redisClient.setex(scheduleKey, Math.ceil(delayMs / 1000), JSON.stringify({
            alertId,
            level,
            scheduledAt: new Date(),
            executeAt: new Date(Date.now() + delayMs)
        }));
        setTimeout(async () => {
            const exists = await redis_1.redisClient.exists(scheduleKey);
            if (exists) {
                await this.processEscalation(alertId, level);
                await redis_1.redisClient.del(scheduleKey);
            }
        }, delayMs);
    }
    async cancelEscalation(alertId) {
        const keys = await redis_1.redisClient.keys(`escalation:${alertId}:*`);
        if (keys.length > 0) {
            await redis_1.redisClient.del(...keys);
        }
    }
    async sendEscalationNotifications(alert, escalation) {
        logger_1.logger.info(`Sending escalation notifications for alert ${alert.id}:`, {
            level: escalation.level,
            recipients: escalation.recipients,
            channels: escalation.channels,
            alert: {
                id: alert.id,
                type: alert.type,
                agentName: alert.agentName,
                location: alert.location
            }
        });
        alert.notificationsSent.push(`level_${escalation.level}_${new Date().toISOString()}`);
    }
    mapIncidentToAlert(incident) {
        const evidence = incident.evidence ? JSON.parse(incident.evidence) : {};
        return {
            id: evidence.alertId || `incident_${incident.id}`,
            type: evidence.alertType || 'GENERAL',
            priority: evidence.priority || 'HIGH',
            agentId: incident.reportedById,
            agentName: incident.reportedBy ?
                `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` :
                'Unknown',
            location: incident.location ? JSON.parse(incident.location) : undefined,
            description: incident.description,
            metadata: evidence.metadata,
            timestamp: incident.occurredAt,
            status: incident.status === 'OPEN' ? 'ACTIVE' :
                incident.status === 'IN_PROGRESS' ? 'ACKNOWLEDGED' : 'RESOLVED',
            acknowledgedBy: evidence.acknowledgedBy,
            acknowledgedAt: evidence.acknowledgedAt ? new Date(evidence.acknowledgedAt) : undefined,
            resolvedBy: evidence.resolvedBy,
            resolvedAt: incident.resolvedAt,
            escalationLevel: evidence.escalationLevel || 1,
            notificationsSent: evidence.notificationsSent || []
        };
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
}
exports.default = EmergencyAlertService;
//# sourceMappingURL=emergencyAlertService.js.map