import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { integrationService } from './integrationService';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface NotificationData {
  type: 'SYSTEM' | 'SECURITY' | 'INCIDENT' | 'SHIFT' | 'TRAINING' | 'MAINTENANCE' | 'BILLING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  title: string;
  message: string;
  recipientId?: string;
  recipientRole?: string;
  senderId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  expiresAt?: Date;
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
  metadata?: any;
}

export class NotificationService extends EventEmitter {
  private static instance: NotificationService;
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds

  private constructor() {
    super();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    if (!this.io) return;

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

  private associateUserSocket(userId: string, socketId: string) {
    const userSockets = this.connectedUsers.get(userId) || [];
    userSockets.push(socketId);
    this.connectedUsers.set(userId, userSockets);
  }

  private removeUserSocket(socketId: string) {
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

  public async sendNotification(data: NotificationData): Promise<string> {
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
          } as any,
          channels: data.channels,
          expiresAt: data.expiresAt,
          isRead: false,
        },
      });

      await this.deliverNotification(notification, data.channels);

      this.emit('notification.sent', { notificationId: notification.id, data });
      return notification.id;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw new Error('Failed to send notification');
    }
  }

  public async sendBulkNotification(data: NotificationData & { recipientRole: string }): Promise<string[]> {
    try {
      const users = await prisma.user.findMany({
        where: { role: data.recipientRole as any },
        select: { id: true, email: true, phone: true },
      });

      const notificationIds: string[] = [];

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
            } as any,
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
    } catch (error) {
      console.error('Failed to send bulk notification:', error);
      throw new Error('Failed to send bulk notification');
    }
  }

  private async deliverNotification(notification: any, channels: string[]) {
    const deliveryPromises: Promise<any>[] = [];

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
      const deviceTokens: string[] = []; // TODO: Implement device token retrieval
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

  private async sendInAppNotification(notification: any) {
    if (!this.io) return;

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

  private async sendEmailNotification(notification: any, recipient: any) {
    try {
      const emailContent = this.generateEmailContent(notification);
      
      await integrationService.sendEmail(
        recipient.email,
        notification.title,
        emailContent,
        true
      );

      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          channel: 'EMAIL',
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          channel: 'EMAIL',
          status: 'FAILED',
          error: (error as any).message,
          attemptedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async sendSMSNotification(notification: any, recipient: any) {
    try {
      const smsContent = `${notification.title}: ${notification.message}`;
      
      await integrationService.sendSMS(recipient.phone, smsContent);

      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          channel: 'SMS',
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          channel: 'SMS',
          status: 'FAILED',
          error: (error as any).message,
          attemptedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async sendPushNotification(notification: any, deviceTokens: string[]) {
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

      // TODO: Implement push notification service
      // await pushNotificationService.send(deviceTokens, pushData);

      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          channel: 'PUSH',
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          channel: 'PUSH',
          status: 'FAILED',
          error: (error as any).message,
          attemptedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private generateEmailContent(notification: any): string {
    const priorityColor = {
      LOW: '#28a745',
      MEDIUM: '#ffc107',
      HIGH: '#fd7e14',
      URGENT: '#dc3545',
      CRITICAL: '#721c24'
    };

    const priority = notification.data?.priority || 'MEDIUM';
    const color = priorityColor[priority as keyof typeof priorityColor] || '#6c757d';

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

  public async markAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });
  }

  public async markAllAsRead(userId: string): Promise<void> {
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

  public async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
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

  public async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: { 
        recipientId: userId,
        isRead: false
      }
    });
  }

  public async cleanupExpiredNotifications(): Promise<void> {
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

  public async sendEmergencyNotification(data: NotificationData & { emergencyLevel: 'CRITICAL' | 'HIGH' }) {
    const emergencyData = {
      ...data,
      priority: data.emergencyLevel === 'CRITICAL' ? 'CRITICAL' : 'URGENT' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT',
      channels: ['PUSH', 'SMS', 'EMAIL', 'IN_APP'] as ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[],
      metadata: {
        ...data.metadata,
        emergencyLevel: data.emergencyLevel,
        timestamp: new Date().toISOString()
      }
    };

    return await this.sendNotification(emergencyData);
  }
}

export const notificationService = NotificationService.getInstance();
