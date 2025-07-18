"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentNotificationService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class IncidentNotificationService {
    static getInstance() {
        if (!IncidentNotificationService.instance) {
            IncidentNotificationService.instance = new IncidentNotificationService();
        }
        return IncidentNotificationService.instance;
    }
    async notifyIncidentCreated(incidentData) {
        try {
            const site = await prisma.site.findUnique({
                where: { id: incidentData.siteId },
                include: {
                    client: {
                        include: {
                            user: true
                        }
                    }
                }
            });
            if (!site) {
                console.error('Site not found for incident notification:', incidentData.siteId);
                return;
            }
            const supervisorsAndAdmins = await prisma.user.findMany({
                where: {
                    role: { in: ['SUPERVISOR', 'ADMIN'] },
                    status: 'ACTIVE'
                }
            });
            const notifications = supervisorsAndAdmins.map(user => ({
                userId: user.id,
                type: 'INCIDENT',
                priority: this.mapSeverityToPriority(incidentData.severity),
                title: `New ${incidentData.severity} Incident: ${incidentData.title}`,
                message: `A ${incidentData.severity.toLowerCase()} incident has been reported at ${incidentData.siteName}. Type: ${incidentData.type}. ${incidentData.description.substring(0, 100)}${incidentData.description.length > 100 ? '...' : ''}`,
                channels: ['IN_APP', 'EMAIL'],
                relatedEntityType: 'INCIDENT',
                relatedEntityId: incidentData.incidentId,
                actionUrl: `/incidents/${incidentData.incidentId}`,
                scheduledFor: new Date()
            }));
            if ((incidentData.severity === 'HIGH' || incidentData.severity === 'CRITICAL') && site.client?.user) {
                notifications.push({
                    userId: site.client.user.id,
                    type: 'INCIDENT',
                    priority: this.mapSeverityToPriority(incidentData.severity),
                    title: `${incidentData.severity} Incident at ${incidentData.siteName}`,
                    message: `A ${incidentData.severity.toLowerCase()} incident has occurred at your site: ${incidentData.siteName}. Our team is responding immediately. Incident type: ${incidentData.type}.`,
                    channels: ['IN_APP', 'EMAIL'],
                    relatedEntityType: 'INCIDENT',
                    relatedEntityId: incidentData.incidentId,
                    actionUrl: `/client/incidents/${incidentData.incidentId}`,
                    scheduledFor: new Date()
                });
            }
            await prisma.notification.createMany({
                data: notifications
            });
            console.log(`Created ${notifications.length} notifications for incident ${incidentData.incidentId}`);
        }
        catch (error) {
            console.error('Error creating incident notifications:', error);
        }
    }
    async notifyIncidentEscalated(incidentData, escalationReason) {
        try {
            const admins = await prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    status: 'ACTIVE'
                }
            });
            const site = await prisma.site.findUnique({
                where: { id: incidentData.siteId },
                include: {
                    client: {
                        include: {
                            user: true
                        }
                    }
                }
            });
            const notifications = admins.map(admin => ({
                userId: admin.id,
                type: 'INCIDENT',
                priority: 'URGENT',
                title: `ESCALATED: ${incidentData.title}`,
                message: `Incident at ${incidentData.siteName} has been escalated. Reason: ${escalationReason}. Immediate attention required.`,
                channels: ['IN_APP', 'EMAIL', 'SMS'],
                relatedEntityType: 'INCIDENT',
                relatedEntityId: incidentData.incidentId,
                actionUrl: `/incidents/${incidentData.incidentId}`,
                scheduledFor: new Date()
            }));
            if (site?.client?.user) {
                notifications.push({
                    userId: site.client.user.id,
                    type: 'INCIDENT',
                    priority: 'URGENT',
                    title: `Escalated Incident at ${incidentData.siteName}`,
                    message: `The incident at your site has been escalated and is receiving priority attention from our management team.`,
                    channels: ['IN_APP', 'EMAIL'],
                    relatedEntityType: 'INCIDENT',
                    relatedEntityId: incidentData.incidentId,
                    actionUrl: `/client/incidents/${incidentData.incidentId}`,
                    scheduledFor: new Date()
                });
            }
            await prisma.notification.createMany({
                data: notifications
            });
            console.log(`Created ${notifications.length} escalation notifications for incident ${incidentData.incidentId}`);
        }
        catch (error) {
            console.error('Error creating escalation notifications:', error);
        }
    }
    async notifyIncidentResolved(incidentData) {
        try {
            const site = await prisma.site.findUnique({
                where: { id: incidentData.siteId },
                include: {
                    client: {
                        include: {
                            user: true
                        }
                    }
                }
            });
            if (!site?.client?.user) {
                return;
            }
            const resolutionTime = Math.round((new Date().getTime() - incidentData.occurredAt.getTime()) / (1000 * 60 * 60));
            const notification = {
                userId: site.client.user.id,
                type: 'INCIDENT',
                priority: 'MEDIUM',
                title: `Incident Resolved: ${incidentData.title}`,
                message: `The incident at ${incidentData.siteName} has been resolved. Resolution time: ${resolutionTime} hours. Thank you for your patience.`,
                channels: ['IN_APP', 'EMAIL'],
                relatedEntityType: 'INCIDENT',
                relatedEntityId: incidentData.incidentId,
                actionUrl: `/client/incidents/${incidentData.incidentId}`,
                scheduledFor: new Date()
            };
            await prisma.notification.create({
                data: notification
            });
            console.log(`Created resolution notification for incident ${incidentData.incidentId}`);
        }
        catch (error) {
            console.error('Error creating resolution notification:', error);
        }
    }
    async notifyIncidentStatusUpdate(incidentData, oldStatus, newStatus) {
        try {
            if (oldStatus === newStatus)
                return;
            const significantChanges = [
                { from: 'OPEN', to: 'IN_PROGRESS' },
                { from: 'IN_PROGRESS', to: 'RESOLVED' },
                { from: 'RESOLVED', to: 'CLOSED' }
            ];
            const isSignificant = significantChanges.some(change => change.from === oldStatus && change.to === newStatus);
            if (!isSignificant)
                return;
            const site = await prisma.site.findUnique({
                where: { id: incidentData.siteId },
                include: {
                    client: {
                        include: {
                            user: true
                        }
                    }
                }
            });
            if (!site?.client?.user)
                return;
            const statusMessages = {
                'IN_PROGRESS': 'Our team is now actively working on resolving this incident.',
                'RESOLVED': 'This incident has been resolved. Please review the resolution details.',
                'CLOSED': 'This incident has been closed and archived.'
            };
            const notification = {
                userId: site.client.user.id,
                type: 'INCIDENT',
                priority: 'MEDIUM',
                title: `Incident Status Update: ${incidentData.title}`,
                message: `Status changed from ${oldStatus} to ${newStatus}. ${statusMessages[newStatus] || ''}`,
                channels: ['IN_APP'],
                relatedEntityType: 'INCIDENT',
                relatedEntityId: incidentData.incidentId,
                actionUrl: `/client/incidents/${incidentData.incidentId}`,
                scheduledFor: new Date()
            };
            await prisma.notification.create({
                data: notification
            });
            console.log(`Created status update notification for incident ${incidentData.incidentId}`);
        }
        catch (error) {
            console.error('Error creating status update notification:', error);
        }
    }
    mapSeverityToPriority(severity) {
        switch (severity) {
            case 'CRITICAL':
                return 'CRITICAL';
            case 'HIGH':
                return 'URGENT';
            case 'MEDIUM':
                return 'HIGH';
            case 'LOW':
                return 'MEDIUM';
            default:
                return 'MEDIUM';
        }
    }
    async getIncidentNotifications(userId, incidentId) {
        try {
            const where = {
                userId,
                type: 'INCIDENT'
            };
            if (incidentId) {
                where.relatedEntityId = incidentId;
            }
            const notifications = await prisma.notification.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                take: 50
            });
            return notifications;
        }
        catch (error) {
            console.error('Error fetching incident notifications:', error);
            return [];
        }
    }
    async markNotificationAsRead(notificationId, userId) {
        try {
            await prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId
                },
                data: {
                    readAt: new Date(),
                    isRead: true
                }
            });
            return true;
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }
}
exports.IncidentNotificationService = IncidentNotificationService;
exports.default = IncidentNotificationService;
//# sourceMappingURL=incidentNotificationService.js.map