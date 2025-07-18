"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const integrationService_1 = require("./integrationService");
const events_1 = require("events");
const prisma = new client_1.PrismaClient();
class NotificationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.io = null;
        this.connectedUsers = new Map();
    }
    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    setSocketIO(io) {
        this.io = io;
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            const userId = socket.handshake.auth.userId || socket.handshake.headers['user-id'];
            if (userId) {
                this.associateUserSocket(userId, socket.id);
                socket.on('disconnect', () => {
                    this.removeUserSocket(socket.id);
                });
            }
        });
    }
    associateUserSocket(userId, socketId) {
        const userSockets = this.connectedUsers.get(userId) || [];
        userSockets.push(socketId);
        this.connectedUsers.set(userId, userSockets);
    }
    removeUserSocket(socketId) {
        for (const [userId, sockets] of this.connectedUsers.entries()) {
            const index = sockets.indexOf(socketId);
            if (index > -1) {
                sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.connectedUsers.delete(userId);
                }
                break;
            }
        }
    }
    async sendNotification(data) {
        try {
            if (!data.recipientId) {
                throw new Error('Recipient ID is required');
            }
            const notification = await prisma.notification.create({
                data: {
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    recipientId: data.recipientId,
                    senderId: data.senderId,
                    data: {
                        priority: data.priority,
                        relatedEntityType: data.relatedEntityType,
                        relatedEntityId: data.relatedEntityId,
                        actionUrl: data.actionUrl,
                        metadata: data.metadata,
                    },
                    channels: data.channels,
                    expiresAt: data.expiresAt,
                    isRead: false,
                },
            });
            await this.deliverNotification(notification, data.channels);
            this.emit('notification.sent', { notificationId: notification.id, data });
            return notification.id;
        }
        catch (error) {
            console.error('Failed to send notification:', error);
            throw new Error('Failed to send notification');
        }
    }
    async sendBulkNotification(data) {
        try {
            const users = await prisma.user.findMany({
                where: { role: data.recipientRole },
                select: { id: true, email: true, phone: true },
            });
            const notificationIds = [];
            for (const user of users) {
                const notification = await prisma.notification.create({
                    data: {
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        recipientId: user.id,
                        senderId: data.senderId,
                        data: {
                            priority: data.priority,
                            relatedEntityType: data.relatedEntityType,
                            relatedEntityId: data.relatedEntityId,
                            actionUrl: data.actionUrl,
                            metadata: data.metadata,
                        },
                        channels: data.channels,
                        expiresAt: data.expiresAt,
                        isRead: false,
                    },
                });
                notificationIds.push(notification.id);
                await this.deliverNotification(notification, data.channels);
            }
            this.emit('bulk_notification.sent', { notificationIds, data });
            return notificationIds;
        }
        catch (error) {
            console.error('Failed to send bulk notification:', error);
            throw new Error('Failed to send bulk notification');
        }
    }
    async deliverNotification(notification, channels) {
        const deliveryPromises = [];
        const recipient = await prisma.user.findUnique({
            where: { id: notification.recipientId },
            include: {
                notificationSettings: true,
            },
        });
        if (!recipient) {
            console.error('Recipient not found:', notification.recipientId);
            return;
        }
        if (channels.includes('IN_APP')) {
            deliveryPromises.push(this.sendInAppNotification(notification));
        }
        if (channels.includes('EMAIL') && recipient.notificationSettings?.emailNotifications) {
            deliveryPromises.push(this.sendEmailNotification(notification, recipient));
        }
        if (channels.includes('SMS') && recipient.notificationSettings?.smsNotifications && recipient.phone) {
            deliveryPromises.push(this.sendSMSNotification(notification, recipient));
        }
        if (channels.includes('PUSH') && recipient.notificationSettings?.pushNotifications) {
            const deviceTokens = [];
            if (deviceTokens.length > 0) {
                deliveryPromises.push(this.sendPushNotification(notification, deviceTokens));
            }
        }
        const results = await Promise.allSettled(deliveryPromises);
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Notification delivery failed for channel ${channels[index]}:`, result.reason);
            }
        });
    }
    async sendInAppNotification(notification) {
        if (!this.io)
            return;
        const payload = {
            id: notification.id,
            type: notification.type,
            priority: notification.data?.priority,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.data?.actionUrl,
            timestamp: notification.createdAt,
            metadata: notification.data?.metadata,
        };
        this.io.to(`user:${notification.recipientId}`).emit('notification', payload);
        await prisma.notificationDelivery.create({
            data: {
                notificationId: notification.id,
                recipientId: notification.recipientId,
                channel: 'IN_APP',
                status: 'DELIVERED',
                deliveredAt: new Date(),
            },
        });
    }
    async sendEmailNotification(notification, recipient) {
        try {
            const emailContent = this.generateEmailContent(notification);
            await integrationService_1.integrationService.sendEmail(recipient.email, notification.title, emailContent, true);
            await prisma.notificationDelivery.create({
                data: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'EMAIL',
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                },
            });
        }
        catch (error) {
            await prisma.notificationDelivery.create({
                data: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'EMAIL',
                    status: 'FAILED',
                    error: error.message,
                    attemptedAt: new Date(),
                },
            });
            throw error;
        }
    }
    async sendSMSNotification(notification, recipient) {
        try {
            const smsContent = `${notification.title}: ${notification.message}`;
            await integrationService_1.integrationService.sendSMS(recipient.phone, smsContent);
            await prisma.notificationDelivery.create({
                data: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'SMS',
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                },
            });
        }
        catch (error) {
            await prisma.notificationDelivery.create({
                data: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'SMS',
                    status: 'FAILED',
                    error: error.message,
                    attemptedAt: new Date(),
                },
            });
            throw error;
        }
    }
    async sendPushNotification(notification, deviceTokens) {
        try {
            const pushData = {
                title: notification.title,
                body: notification.message,
                data: {
                    notificationId: notification.id,
                    type: notification.type,
                    priority: notification.data?.priority,
                    actionUrl: notification.data?.actionUrl,
                },
            };
            await prisma.notificationDelivery.create({
                data: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'PUSH',
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                },
            });
        }
        catch (error) {
            await prisma.notificationDelivery.create({
                data: {
                    notificationId: notification.id,
                    recipientId: notification.recipientId,
                    channel: 'PUSH',
                    status: 'FAILED',
                    error: error.message,
                    attemptedAt: new Date(),
                },
            });
            throw error;
        }
    }
    generateEmailContent(notification) {
        const priorityColor = {
            LOW: '#28a745',
            MEDIUM: '#ffc107',
            HIGH: '#fd7e14',
            URGENT: '#dc3545',
            CRITICAL: '#721c24'
        };
        const priority = notification.data?.priority || 'MEDIUM';
        const color = priorityColor[priority] || '#6c757d';
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${notification.title}</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            ${notification.message}
          </p>
          ${notification.data?.actionUrl ? `
            <div style="text-align: center; margin-top: 30px;">
              <a href="${notification.data.actionUrl}" 
                 style="background-color: ${color}; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Take Action
              </a>
            </div>
          ` : ''}
        </div>
        <div style="background-color: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>This notification was sent by BahinLink Security Management System</p>
          <p>Priority: ${priority}</p>
        </div>
      </div>
    `;
    }
    async markAsRead(notificationId) {
        await prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });
    }
    async markAllAsRead(userId) {
        await prisma.notification.updateMany({
            where: {
                recipientId: userId,
                isRead: false
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { recipientId: userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({
                where: { recipientId: userId }
            })
        ]);
        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getUnreadCount(userId) {
        return await prisma.notification.count({
            where: {
                recipientId: userId,
                isRead: false
            }
        });
    }
    async cleanupExpiredNotifications() {
        const expiredNotifications = await prisma.notification.findMany({
            where: {
                expiresAt: {
                    lt: new Date()
                },
                isRead: true
            }
        });
        for (const notification of expiredNotifications) {
            await prisma.notification.delete({
                where: { id: notification.id }
            });
        }
    }
    async sendEmergencyNotification(data) {
        const emergencyData = {
            ...data,
            priority: data.emergencyLevel === 'CRITICAL' ? 'CRITICAL' : 'URGENT',
            channels: ['PUSH', 'SMS', 'EMAIL', 'IN_APP'],
            metadata: {
                ...data.metadata,
                emergencyLevel: data.emergencyLevel,
                timestamp: new Date().toISOString()
            }
        };
        return await this.sendNotification(emergencyData);
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = NotificationService.getInstance();
//# sourceMappingURL=notificationService.js.map