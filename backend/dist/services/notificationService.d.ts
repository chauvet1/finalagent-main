import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
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
export declare class NotificationService extends EventEmitter {
    private static instance;
    private io;
    private connectedUsers;
    private constructor();
    static getInstance(): NotificationService;
    setSocketIO(io: SocketIOServer): void;
    private setupSocketHandlers;
    private associateUserSocket;
    private removeUserSocket;
    sendNotification(data: NotificationData): Promise<string>;
    sendBulkNotification(data: NotificationData & {
        recipientRole: string;
    }): Promise<string[]>;
    private deliverNotification;
    private sendInAppNotification;
    private sendEmailNotification;
    private sendSMSNotification;
    private sendPushNotification;
    private generateEmailContent;
    markAsRead(notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
        notifications: {
            status: import(".prisma/client").$Enums.NotificationStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            priority: import(".prisma/client").$Enums.NotificationPriority;
            message: string;
            channels: string[];
            recipientId: string | null;
            isRead: boolean;
            relatedEntityType: string | null;
            relatedEntityId: string | null;
            actionUrl: string | null;
            scheduledFor: Date | null;
            sentAt: Date | null;
            readAt: Date | null;
            expiresAt: Date | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getUnreadCount(userId: string): Promise<number>;
    cleanupExpiredNotifications(): Promise<void>;
    sendEmergencyNotification(data: NotificationData & {
        emergencyLevel: 'CRITICAL' | 'HIGH';
    }): Promise<string>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notificationService.d.ts.map