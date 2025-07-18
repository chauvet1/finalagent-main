"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyResponseService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class EmergencyResponseService {
    constructor() {
        this.prisma = prisma;
    }
    async getEmergencyContacts(userId) {
        try {
            const contacts = await this.prisma.emergencyContact.findMany({
                where: { userId },
                orderBy: { name: 'asc' },
            });
            return contacts.map(contact => ({
                id: contact.id,
                name: contact.name,
                userId: contact.userId,
                phone: contact.phone,
                relation: contact.relation,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching emergency contacts:', error);
            throw new Error('Failed to fetch emergency contacts');
        }
    }
    async getEmergencyProcedures(siteId) {
        try {
            const procedures = await this.prisma.emergencyProcedure.findMany({
                where: { siteId },
            });
            return procedures.map(procedure => ({
                id: procedure.id,
                name: procedure.name,
                siteId: procedure.siteId,
                steps: procedure.steps,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching emergency procedures:', error);
            throw new Error('Failed to fetch emergency procedures');
        }
    }
    async createEmergencyAlert(alert) {
        try {
            const newAlert = await this.prisma.emergencyAlert.create({
                data: {
                    siteId: alert.siteId,
                    agentId: alert.agentId,
                    type: alert.type,
                    message: alert.message,
                },
            });
            return {
                id: newAlert.id,
                siteId: newAlert.siteId,
                agentId: newAlert.agentId,
                type: newAlert.type,
                message: newAlert.message,
                createdAt: newAlert.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating emergency alert:', error);
            throw new Error('Failed to create emergency alert');
        }
    }
    async createEmergencyResponse(response) {
        try {
            const newResponse = await this.prisma.emergencyResponse.create({
                data: {
                    alertId: response.alertId,
                    responderId: response.responderId,
                    response: response.response,
                },
            });
            return {
                id: newResponse.id,
                alertId: newResponse.alertId,
                responderId: newResponse.responderId,
                response: newResponse.response,
                createdAt: newResponse.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating emergency response:', error);
            throw new Error('Failed to create emergency response');
        }
    }
    async logEmergencyAction(action, entityType, entityId, userId, details) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action,
                    tableName: entityType,
                    recordId: entityId,
                    userId,
                    details,
                    timestamp: new Date(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Error logging emergency action:', error);
        }
    }
    async notifyEmergencyContacts(contacts, alert) {
        try {
            for (const contact of contacts) {
                try {
                    logger_1.logger.info(`Notifying emergency contact ${contact.name} at ${contact.phone} about alert ${alert.id}`);
                }
                catch (error) {
                    logger_1.logger.error(`Failed to notify contact ${contact.id}:`, error);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error notifying emergency contacts:', error);
        }
    }
    async getAvailableResponders(siteId) {
        try {
            const shifts = await this.prisma.shift.findMany({
                where: {
                    siteId,
                    status: 'IN_PROGRESS',
                },
                select: {
                    agentId: true,
                },
            });
            const agentIds = shifts.map(s => s.agentId).filter(Boolean);
            if (agentIds.length === 0) {
                return [];
            }
            const agents = await this.prisma.agent.findMany({
                where: {
                    id: { in: agentIds },
                },
                select: {
                    id: true,
                    userId: true,
                },
            });
            const userIds = agents.map(agent => agent.userId);
            const users = await this.prisma.user.findMany({
                where: {
                    id: { in: userIds },
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    phone: true,
                    email: true,
                },
            });
            const userMap = new Map(users.map(user => [user.id, user]));
            return agents.map(agent => {
                const user = userMap.get(agent.userId);
                return {
                    id: agent.id,
                    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown',
                    phone: user?.phone || null,
                    email: user?.email || null,
                    currentLocation: null,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching available responders:', error);
            throw new Error('Failed to fetch available responders');
        }
    }
    async updateEmergencyResponse(responseId, updates) {
        try {
            const updatedResponse = await this.prisma.emergencyResponse.update({
                where: { id: responseId },
                data: updates,
            });
            return {
                id: updatedResponse.id,
                alertId: updatedResponse.alertId,
                responderId: updatedResponse.responderId,
                response: updatedResponse.response,
                createdAt: updatedResponse.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating emergency response:', error);
            throw new Error('Failed to update emergency response');
        }
    }
    async escalateEmergency(alertId, escalationLevel, reason) {
        try {
            await this.logEmergencyAction('ESCALATE', 'EmergencyAlert', alertId, 'system', {
                escalationLevel,
                reason,
                timestamp: new Date(),
            });
            logger_1.logger.info(`Emergency ${alertId} escalated to level ${escalationLevel}: ${reason}`);
        }
        catch (error) {
            logger_1.logger.error('Error escalating emergency:', error);
            throw new Error('Failed to escalate emergency');
        }
    }
    async resolveEmergency(alertId, resolutionNotes, resolvedBy) {
        try {
            await this.logEmergencyAction('RESOLVE', 'EmergencyAlert', alertId, resolvedBy, {
                resolutionNotes,
                resolvedAt: new Date(),
            });
            logger_1.logger.info(`Emergency ${alertId} resolved by ${resolvedBy}`);
        }
        catch (error) {
            logger_1.logger.error('Error resolving emergency:', error);
            throw new Error('Failed to resolve emergency');
        }
    }
    async getEmergencyHistory(siteId, startDate, endDate) {
        try {
            const alerts = await this.prisma.emergencyAlert.findMany({
                where: {
                    siteId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: {
                    id: true,
                    type: true,
                    message: true,
                    createdAt: true,
                    agentId: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const agentIds = alerts.map(alert => alert.agentId);
            const agents = await this.prisma.agent.findMany({
                where: {
                    id: { in: agentIds },
                },
                select: {
                    id: true,
                    userId: true,
                },
            });
            const userIds = agents.map(agent => agent.userId);
            const users = await this.prisma.user.findMany({
                where: {
                    id: { in: userIds },
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                },
            });
            const agentMap = new Map(agents.map(agent => [agent.id, agent]));
            const userMap = new Map(users.map(user => [user.id, user]));
            return alerts.map(alert => {
                const agent = agentMap.get(alert.agentId);
                const user = agent ? userMap.get(agent.userId) : null;
                return {
                    id: alert.id,
                    type: alert.type,
                    message: alert.message,
                    createdAt: alert.createdAt,
                    agent: agent ? {
                        id: agent.id,
                        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown',
                    } : null,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching emergency history:', error);
            throw new Error('Failed to fetch emergency history');
        }
    }
    async getEmergencyStatistics(siteId, period) {
        try {
            const startDate = this.getStartDateForPeriod(period);
            const alerts = await this.prisma.emergencyAlert.findMany({
                where: {
                    siteId,
                    createdAt: {
                        gte: startDate,
                    },
                },
            });
            const totalAlerts = alerts.length;
            const alertsByType = alerts.reduce((acc, alert) => {
                acc[alert.type] = (acc[alert.type] || 0) + 1;
                return acc;
            }, {});
            return {
                totalAlerts,
                alertsByType,
                averageResponseTime: 0,
                falseAlarms: 0,
                period,
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating emergency statistics:', error);
            throw new Error('Failed to calculate emergency statistics');
        }
    }
    getStartDateForPeriod(period) {
        const now = new Date();
        switch (period) {
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
    }
}
exports.EmergencyResponseService = EmergencyResponseService;
//# sourceMappingURL=emergencyResponseService.js.map