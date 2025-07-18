import admin from 'firebase-admin';
import apn from 'apn';
import webpush from 'web-push';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { PrismaClient } from '@prisma/client';

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
    startTime: string; // HH:mm format
    endTime: string;
    timezone: string;
  };
  sounds: {
    messages: string;
    alerts: string;
    emergencies: string;
  };
}

class PushNotificationService {
  private fcm!: admin.messaging.Messaging;
  private apnProvider!: apn.Provider;
  private webPushConfig: any;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeFirebase();
    this.initializeAPNS();
    this.initializeWebPush();
  }

  private initializeFirebase(): void {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }
      this.fcm = admin.messaging();
      logger.info('Firebase Cloud Messaging initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  private initializeAPNS(): void {
    try {
      this.apnProvider = new apn.Provider({
        token: {
          key: process.env.APNS_KEY_PATH || '',
          keyId: process.env.APNS_KEY_ID || '',
          teamId: process.env.APNS_TEAM_ID || '',
        },
        production: process.env.NODE_ENV === 'production',
      });
      logger.info('Apple Push Notification Service initialized');
    } catch (error) {
      logger.error('Failed to initialize APNS:', error);
    }
  }

  private initializeWebPush(): void {
    try {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL}`,
        process.env.VAPID_PUBLIC_KEY || '',
        process.env.VAPID_PRIVATE_KEY || ''
      );
      logger.info('Web Push initialized');
    } catch (error) {
      logger.error('Failed to initialize Web Push:', error);
    }
  }

  public async sendNotification(notification: Omit<PushNotification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fullNotification: PushNotification = {
        ...notification,
        id: notificationId,
        createdAt: new Date(),
      };

      // Check user preferences
      const preferences = await this.getUserPreferences(notification.userId);
      if (!this.shouldSendNotification(fullNotification, preferences)) {
        logger.info(`Notification blocked by user preferences: ${notificationId}`);
        return notificationId;
      }

      // Get user device tokens
      const deviceTokens = await this.getUserDeviceTokens(notification.userId);
      if (deviceTokens.length === 0) {
        logger.warn(`No device tokens found for user: ${notification.userId}`);
        return notificationId;
      }

      // Store notification
      await this.storeNotification(fullNotification);

      // Send to all user devices
      const sendPromises = deviceTokens.map(device => 
        this.sendToDevice(fullNotification, device)
      );

      const results = await Promise.allSettled(sendPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      logger.info(`Notification sent: ${notificationId}, successful: ${successful}, failed: ${failed}`);

      // Update notification status
      await this.updateNotificationStatus(notificationId, {
        sent: successful,
        failed: failed,
        sentAt: new Date(),
      });

      return notificationId;

    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  public async sendBulkNotifications(
    notifications: Array<Omit<PushNotification, 'id' | 'createdAt'>>
  ): Promise<string[]> {
    try {
      const notificationIds: string[] = [];
      
      // Process in batches to avoid overwhelming the services
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const batchPromises = batch.map(notification => this.sendNotification(notification));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            notificationIds.push(result.value);
          } else {
            logger.error(`Failed to send notification ${i + index}:`, result.reason);
          }
        });
      }

      return notificationIds;

    } catch (error) {
      logger.error('Failed to send bulk notifications:', error);
      throw error;
    }
  }

  public async registerDeviceToken(
    userId: string,
    token: string,
    platform: DeviceToken['platform'],
    deviceId: string,
    metadata: {
      appVersion?: string;
      osVersion?: string;
    } = {}
  ): Promise<void> {
    try {
      const deviceToken: DeviceToken = {
        userId,
        token,
        platform,
        deviceId,
        isActive: true,
        lastUsed: new Date(),
        ...metadata,
      };

      // Store device token
      await this.storeDeviceToken(deviceToken);

      // Deactivate old tokens for the same device
      await this.deactivateOldTokens(userId, deviceId, token);

      logger.info(`Device token registered for user ${userId}, platform: ${platform}`);

    } catch (error) {
      logger.error('Failed to register device token:', error);
      throw error;
    }
  }

  public async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    try {
      await this.deactivateDeviceToken(token);
      logger.info(`Device token unregistered for user ${userId}`);
    } catch (error) {
      logger.error('Failed to unregister device token:', error);
      throw error;
    }
  }

  public async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences, userId };
      
      await this.storeUserPreferences(updatedPreferences);
      logger.info(`Notification preferences updated for user ${userId}`);

    } catch (error) {
      logger.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  public async sendEmergencyAlert(
    userIds: string[],
    alert: {
      title: string;
      body: string;
      location?: { latitude: number; longitude: number };
      alertType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title: alert.title,
        body: alert.body,
        priority: 'critical' as const,
        category: 'emergency' as const,
        sound: 'emergency.wav',
        data: {
          type: 'emergency_alert',
          alertType: alert.alertType,
          severity: alert.severity,
          location: alert.location,
        },
        actionButtons: [
          { id: 'acknowledge', title: 'Acknowledge', action: 'acknowledge_emergency' },
          { id: 'respond', title: 'Respond', action: 'respond_emergency' },
        ],
      }));

      await this.sendBulkNotifications(notifications);
      logger.warn(`Emergency alert sent to ${userIds.length} users`);

    } catch (error) {
      logger.error('Failed to send emergency alert:', error);
      throw error;
    }
  }

  public async scheduleNotification(
    notification: Omit<PushNotification, 'id' | 'createdAt'>,
    scheduledFor: Date
  ): Promise<string> {
    try {
      const notificationId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const scheduledNotification: PushNotification = {
        ...notification,
        id: notificationId,
        scheduledFor,
        createdAt: new Date(),
      };

      // Store scheduled notification
      await this.storeScheduledNotification(scheduledNotification);

      // Schedule using Redis or job queue
      const delay = scheduledFor.getTime() - Date.now();
      if (delay > 0) {
        await this.scheduleJob(notificationId, delay);
      }

      logger.info(`Notification scheduled: ${notificationId} for ${scheduledFor.toISOString()}`);
      return notificationId;

    } catch (error) {
      logger.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  private async sendToDevice(notification: PushNotification, device: DeviceToken): Promise<void> {
    try {
      switch (device.platform) {
        case 'android':
          await this.sendToAndroid(notification, device);
          break;
        case 'ios':
          await this.sendToIOS(notification, device);
          break;
        case 'web':
          await this.sendToWeb(notification, device);
          break;
        default:
          throw new Error(`Unsupported platform: ${device.platform}`);
      }

      // Update device last used
      await this.updateDeviceLastUsed(device.token);

    } catch (error) {
      logger.error(`Failed to send to ${device.platform} device:`, error);
      
      // Handle invalid tokens
      if (this.isInvalidTokenError(error)) {
        await this.deactivateDeviceToken(device.token);
      }
      
      throw error;
    }
  }

  private async sendToAndroid(notification: PushNotification, device: DeviceToken): Promise<void> {
    const message = {
      token: device.token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: {
        ...notification.data,
        notificationId: notification.id,
        category: notification.category,
        priority: notification.priority,
      },
      android: {
        priority: this.mapPriorityToAndroid(notification.priority),
        notification: {
          sound: notification.sound || 'default',
          channelId: notification.category,
          defaultSound: !notification.sound,
        },
      },
    };

    await this.fcm.send(message);
  }

  private async sendToIOS(notification: PushNotification, device: DeviceToken): Promise<void> {
    const apnNotification = new apn.Notification();
    
    apnNotification.alert = {
      title: notification.title,
      body: notification.body,
    };
    
    apnNotification.sound = notification.sound || 'default';
    if (notification.badge !== undefined) {
      apnNotification.badge = notification.badge;
    }
    apnNotification.priority = this.mapPriorityToIOS(notification.priority);
    apnNotification.payload = {
      ...notification.data,
      notificationId: notification.id,
    };

    if (notification.expiresAt) {
      apnNotification.expiry = Math.floor(notification.expiresAt.getTime() / 1000);
    }

    const result = await this.apnProvider.send(apnNotification, device.token);
    
    if (result.failed.length > 0) {
      throw new Error(`APNS send failed: ${result.failed[0].error}`);
    }
  }

  private async sendToWeb(notification: PushNotification, device: DeviceToken): Promise<void> {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      image: notification.imageUrl,
      data: {
        ...notification.data,
        notificationId: notification.id,
      },
      actions: notification.actionButtons?.map(button => ({
        action: button.action,
        title: button.title,
      })),
    });

    await webpush.sendNotification(
      {
        endpoint: device.token,
        keys: {
          p256dh: '', // These would be stored with the token
          auth: '',
        },
      },
      payload
    );
  }

  private shouldSendNotification(
    notification: PushNotification,
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.enabled) return false;
    
    // Check category preferences
    const categoryEnabled = preferences.categories[notification.category as keyof typeof preferences.categories];
    if (!categoryEnabled) return false;

    // Check quiet hours
    if (preferences.quietHours.enabled && notification.priority !== 'critical') {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        timeZone: preferences.quietHours.timezone 
      });
      
      if (this.isInQuietHours(currentTime, preferences.quietHours)) {
        return false;
      }
    }

    return true;
  }

  private isInQuietHours(currentTime: string, quietHours: NotificationPreferences['quietHours']): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(quietHours.startTime);
    const end = this.timeToMinutes(quietHours.endTime);

    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Quiet hours span midnight
      return current >= start || current <= end;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private mapPriorityToAndroid(priority: PushNotification['priority']): 'normal' | 'high' {
    return priority === 'high' || priority === 'critical' ? 'high' : 'normal';
  }

  private mapPriorityToIOS(priority: PushNotification['priority']): number {
    switch (priority) {
      case 'critical': return 10;
      case 'high': return 10;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }

  private isInvalidTokenError(error: any): boolean {
    // Check for various invalid token error patterns
    return error.code === 'messaging/invalid-registration-token' ||
           error.code === 'messaging/registration-token-not-registered' ||
           error.status === 410;
  }

  // Database operations - Real implementations
  private async storeNotification(notification: PushNotification): Promise<void> {
    try {
      await this.prisma.pushNotification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          category: notification.category,
          priority: notification.priority,
          sound: notification.sound,
          badge: notification.badge,
          scheduledFor: notification.scheduledFor,
          status: 'pending',
          createdAt: notification.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to store notification:', error);
      throw error;
    }
  }

  private async storeDeviceToken(deviceToken: DeviceToken): Promise<void> {
    try {
      // First, deactivate old tokens for the same device
      await this.deactivateOldTokens(deviceToken.userId, deviceToken.deviceId, deviceToken.token);
      
      // Store or update the device token
      await this.prisma.deviceToken.upsert({
        where: {
          token: deviceToken.token,
        },
        update: {
          userId: deviceToken.userId,
          platform: deviceToken.platform,
          deviceId: deviceToken.deviceId,
          isActive: deviceToken.isActive,
          lastUsed: deviceToken.lastUsed,
          appVersion: deviceToken.appVersion,
          osVersion: deviceToken.osVersion,
        },
        create: {
          token: deviceToken.token,
          userId: deviceToken.userId,
          platform: deviceToken.platform,
          deviceId: deviceToken.deviceId,
          isActive: deviceToken.isActive,
          lastUsed: deviceToken.lastUsed,
          appVersion: deviceToken.appVersion,
          osVersion: deviceToken.osVersion,
        },
      });
    } catch (error) {
      logger.error('Failed to store device token:', error);
      throw error;
    }
  }

  private async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    try {
      // Get user's device tokens from the User model
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { deviceTokens: true }
      });

      if (!user || !user.deviceTokens) {
        return [];
      }

      // Parse the JSON device tokens
      const tokens = Array.isArray(user.deviceTokens) ? user.deviceTokens : [];
      return tokens.map((token: any) => ({
        userId: token.userId || userId,
        token: token.token,
        platform: token.platform as 'ios' | 'android' | 'web',
        deviceId: token.deviceId || '',
        isActive: token.isActive !== false,
        lastUsed: new Date(token.lastUsed || Date.now()),
        appVersion: token.appVersion,
        osVersion: token.osVersion,
      }));
    } catch (error) {
      logger.error('Failed to get user device tokens:', error);
      return [];
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Get user's notification preferences from the User model
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationSettings: true }
      });

      if (!user || !user.notificationSettings) {
        // Return default preferences if none exist
        return {
          userId,
          enabled: true,
          categories: {
            messages: true,
            alerts: true,
            emergencies: true,
            shifts: true,
            system: true,
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'UTC',
          },
          sounds: {
            messages: 'default',
            alerts: 'alert.wav',
            emergencies: 'emergency.wav',
          },
        };
      }

      // Parse the JSON notification settings
      const settings = typeof user.notificationSettings === 'string' 
        ? JSON.parse(user.notificationSettings) 
        : user.notificationSettings;

      return {
        userId,
        enabled: settings.enabled !== false,
        categories: {
          messages: settings.categories?.messages !== false,
          alerts: settings.categories?.alerts !== false,
          emergencies: settings.categories?.emergencies !== false,
          shifts: settings.categories?.shifts !== false,
          system: settings.categories?.system !== false,
        },
        quietHours: {
          enabled: settings.quietHours?.enabled === true,
          startTime: settings.quietHours?.startTime || '22:00',
          endTime: settings.quietHours?.endTime || '08:00',
          timezone: settings.quietHours?.timezone || 'UTC',
        },
        sounds: {
          messages: settings.sounds?.messages || 'default',
          alerts: settings.sounds?.alerts || 'alert.wav',
          emergencies: settings.sounds?.emergencies || 'emergency.wav',
        },
      };
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      // Return default preferences on error
      return {
        userId,
        enabled: true,
        categories: {
          messages: true,
          alerts: true,
          emergencies: true,
          shifts: true,
          system: true,
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        sounds: {
          messages: 'default',
          alerts: 'alert.wav',
          emergencies: 'emergency.wav',
        },
      };
    }
  }

  private async storeUserPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: preferences.userId },
        data: {
          notificationSettings: {
            enabled: preferences.enabled,
            categories: preferences.categories,
            quietHours: preferences.quietHours,
            sounds: preferences.sounds,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to store user preferences:', error);
      throw error;
    }
  }

  private async updateNotificationStatus(notificationId: string, status: any): Promise<void> {
    try {
      await this.prisma.pushNotification.update({
        where: { id: notificationId },
        data: {
          status: status.status,
          deliveredAt: status.deliveredAt,
          failureReason: status.failureReason,
          metadata: status.metadata || {},
        },
      });
    } catch (error) {
      logger.error('Failed to update notification status:', error);
    }
  }

  private async deactivateOldTokens(userId: string, deviceId: string, currentToken: string): Promise<void> {
    try {
      await this.prisma.deviceToken.updateMany({
        where: {
          userId: userId,
          deviceId: deviceId,
          token: {
            not: currentToken,
          },
        },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      logger.error('Failed to deactivate old tokens:', error);
    }
  }

  private async deactivateDeviceToken(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.update({
        where: { token: token },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      logger.error('Failed to deactivate device token:', error);
    }
  }

  private async updateDeviceLastUsed(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.update({
        where: { token: token },
        data: {
          lastUsed: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update device last used:', error);
    }
  }

  private async storeScheduledNotification(notification: PushNotification): Promise<void> {
    try {
      await this.prisma.scheduledNotification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          category: notification.category,
          priority: notification.priority,
          sound: notification.sound,
          badge: notification.badge,
          scheduledFor: notification.scheduledFor!,
          status: 'scheduled',
          createdAt: notification.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to store scheduled notification:', error);
      throw error;
    }
  }

  private async scheduleJob(notificationId: string, delay: number): Promise<void> {
    try {
      // Store in Redis with expiration
      await redisClient.setex(`scheduled_notification:${notificationId}`, Math.ceil(delay / 1000), notificationId);
      
      // Also store in database for persistence
      await this.prisma.notificationJob.create({
        data: {
          id: crypto.randomUUID(),
          notificationId: notificationId,
          scheduledFor: new Date(Date.now() + delay),
          status: 'scheduled',
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to schedule notification job:', error);
      throw error;
    }
  }
}

export default PushNotificationService;
