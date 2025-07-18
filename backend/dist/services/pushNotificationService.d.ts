export interface PushNotification {
    id: string;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'critical';
    category: 'message' | 'alert' | 'emergency' | 'shift' | 'system';
    sound?: string;
    badge?: number;
    imageUrl?: string;
    actionButtons?: Array<{
        id: string;
        title: string;
        action: string;
    }>;
    scheduledFor?: Date;
    expiresAt?: Date;
    createdAt: Date;
}
export interface DeviceToken {
    userId: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId: string;
    isActive: boolean;
    lastUsed: Date;
    appVersion?: string;
    osVersion?: string;
}
export interface NotificationPreferences {
    userId: string;
    enabled: boolean;
    categories: {
        messages: boolean;
        alerts: boolean;
        emergencies: boolean;
        shifts: boolean;
        system: boolean;
    };
    quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        timezone: string;
    };
    sounds: {
        messages: string;
        alerts: string;
        emergencies: string;
    };
}
declare class PushNotificationService {
    private fcm;
    private apnProvider;
    private webPushConfig;
    private prisma;
    constructor();
    private initializeFirebase;
    private initializeAPNS;
    private initializeWebPush;
    sendNotification(notification: Omit<PushNotification, 'id' | 'createdAt'>): Promise<string>;
    sendBulkNotifications(notifications: Array<Omit<PushNotification, 'id' | 'createdAt'>>): Promise<string[]>;
    registerDeviceToken(userId: string, token: string, platform: DeviceToken['platform'], deviceId: string, metadata?: {
        appVersion?: string;
        osVersion?: string;
    }): Promise<void>;
    unregisterDeviceToken(userId: string, token: string): Promise<void>;
    updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>;
    sendEmergencyAlert(userIds: string[], alert: {
        title: string;
        body: string;
        location?: {
            latitude: number;
            longitude: number;
        };
        alertType: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }): Promise<void>;
    scheduleNotification(notification: Omit<PushNotification, 'id' | 'createdAt'>, scheduledFor: Date): Promise<string>;
    private sendToDevice;
    private sendToAndroid;
    private sendToIOS;
    private sendToWeb;
    private shouldSendNotification;
    private isInQuietHours;
    private timeToMinutes;
    private mapPriorityToAndroid;
    private mapPriorityToIOS;
    private isInvalidTokenError;
    private storeNotification;
    private storeDeviceToken;
    private getUserDeviceTokens;
    private getUserPreferences;
    private storeUserPreferences;
    private updateNotificationStatus;
    private deactivateOldTokens;
    private deactivateDeviceToken;
    private updateDeviceLastUsed;
    private storeScheduledNotification;
    private scheduleJob;
}
export default PushNotificationService;
//# sourceMappingURL=pushNotificationService.d.ts.map