"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const apn_1 = __importDefault(require("apn"));
const web_push_1 = __importDefault(require("web-push"));
const logger_1 = require("../utils/logger");
const redis_1 = require("../config/redis");
const client_1 = require("@prisma/client");
class PushNotificationService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.initializeFirebase();
        this.initializeAPNS();
        this.initializeWebPush();
    }
    initializeFirebase() {
        try {
            if (!firebase_admin_1.default.apps.length) {
                firebase_admin_1.default.initializeApp({
                    credential: firebase_admin_1.default.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    }),
                });
            }
            this.fcm = firebase_admin_1.default.messaging();
            logger_1.logger.info('Firebase Cloud Messaging initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Firebase:', error);
        }
    }
    initializeAPNS() {
        try {
            this.apnProvider = new apn_1.default.Provider({
                token: {
                    key: process.env.APNS_KEY_PATH || '',
                    keyId: process.env.APNS_KEY_ID || '',
                    teamId: process.env.APNS_TEAM_ID || '',
                },
                production: process.env.NODE_ENV === 'production',
            });
            logger_1.logger.info('Apple Push Notification Service initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize APNS:', error);
        }
    }
    initializeWebPush() {
        try {
            web_push_1.default.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, process.env.VAPID_PUBLIC_KEY || '', process.env.VAPID_PRIVATE_KEY || '');
            logger_1.logger.info('Web Push initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Web Push:', error);
        }
    }
    async sendNotification(notification) {
        try {
            const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const fullNotification = {
                ...notification,
                id: notificationId,
                createdAt: new Date(),
            };
            const preferences = await this.getUserPreferences(notification.userId);
            if (!this.shouldSendNotification(fullNotification, preferences)) {
                logger_1.logger.info(`Notification blocked by user preferences: ${notificationId}`);
                return notificationId;
            }
            const deviceTokens = await this.getUserDeviceTokens(notification.userId);
            if (deviceTokens.length === 0) {
                logger_1.logger.warn(`No device tokens found for user: ${notification.userId}`);
                return notificationId;
            }
            await this.storeNotification(fullNotification);
            const sendPromises = deviceTokens.map(device => this.sendToDevice(fullNotification, device));
            const results = await Promise.allSettled(sendPromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            logger_1.logger.info(`Notification sent: ${notificationId}, successful: ${successful}, failed: ${failed}`);
            await this.updateNotificationStatus(notificationId, {
                sent: successful,
                failed: failed,
                sentAt: new Date(),
            });
            return notificationId;
        }
        catch (error) {
            logger_1.logger.error('Failed to send notification:', error);
            throw error;
        }
    }
    async sendBulkNotifications(notifications) {
        try {
            const notificationIds = [];
            const batchSize = 100;
            for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize);
                const batchPromises = batch.map(notification => this.sendNotification(notification));
                const batchResults = await Promise.allSettled(batchPromises);
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        notificationIds.push(result.value);
                    }
                    else {
                        logger_1.logger.error(`Failed to send notification ${i + index}:`, result.reason);
                    }
                });
            }
            return notificationIds;
        }
        catch (error) {
            logger_1.logger.error('Failed to send bulk notifications:', error);
            throw error;
        }
    }
    async registerDeviceToken(userId, token, platform, deviceId, metadata = {}) {
        try {
            const deviceToken = {
                userId,
                token,
                platform,
                deviceId,
                isActive: true,
                lastUsed: new Date(),
                ...metadata,
            };
            await this.storeDeviceToken(deviceToken);
            await this.deactivateOldTokens(userId, deviceId, token);
            logger_1.logger.info(`Device token registered for user ${userId}, platform: ${platform}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to register device token:', error);
            throw error;
        }
    }
    async unregisterDeviceToken(userId, token) {
        try {
            await this.deactivateDeviceToken(token);
            logger_1.logger.info(`Device token unregistered for user ${userId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to unregister device token:', error);
            throw error;
        }
    }
    async updateNotificationPreferences(userId, preferences) {
        try {
            const currentPreferences = await this.getUserPreferences(userId);
            const updatedPreferences = { ...currentPreferences, ...preferences, userId };
            await this.storeUserPreferences(updatedPreferences);
            logger_1.logger.info(`Notification preferences updated for user ${userId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to update notification preferences:', error);
            throw error;
        }
    }
    async sendEmergencyAlert(userIds, alert) {
        try {
            const notifications = userIds.map(userId => ({
                userId,
                title: alert.title,
                body: alert.body,
                priority: 'critical',
                category: 'emergency',
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
            logger_1.logger.warn(`Emergency alert sent to ${userIds.length} users`);
        }
        catch (error) {
            logger_1.logger.error('Failed to send emergency alert:', error);
            throw error;
        }
    }
    async scheduleNotification(notification, scheduledFor) {
        try {
            const notificationId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const scheduledNotification = {
                ...notification,
                id: notificationId,
                scheduledFor,
                createdAt: new Date(),
            };
            await this.storeScheduledNotification(scheduledNotification);
            const delay = scheduledFor.getTime() - Date.now();
            if (delay > 0) {
                await this.scheduleJob(notificationId, delay);
            }
            logger_1.logger.info(`Notification scheduled: ${notificationId} for ${scheduledFor.toISOString()}`);
            return notificationId;
        }
        catch (error) {
            logger_1.logger.error('Failed to schedule notification:', error);
            throw error;
        }
    }
    async sendToDevice(notification, device) {
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
            await this.updateDeviceLastUsed(device.token);
        }
        catch (error) {
            logger_1.logger.error(`Failed to send to ${device.platform} device:`, error);
            if (this.isInvalidTokenError(error)) {
                await this.deactivateDeviceToken(device.token);
            }
            throw error;
        }
    }
    async sendToAndroid(notification, device) {
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
    async sendToIOS(notification, device) {
        const apnNotification = new apn_1.default.Notification();
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
    async sendToWeb(notification, device) {
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
        await web_push_1.default.sendNotification({
            endpoint: device.token,
            keys: {
                p256dh: '',
                auth: '',
            },
        }, payload);
    }
    shouldSendNotification(notification, preferences) {
        if (!preferences.enabled)
            return false;
        const categoryEnabled = preferences.categories[notification.category];
        if (!categoryEnabled)
            return false;
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
    isInQuietHours(currentTime, quietHours) {
        const current = this.timeToMinutes(currentTime);
        const start = this.timeToMinutes(quietHours.startTime);
        const end = this.timeToMinutes(quietHours.endTime);
        if (start <= end) {
            return current >= start && current <= end;
        }
        else {
            return current >= start || current <= end;
        }
    }
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
    mapPriorityToAndroid(priority) {
        return priority === 'high' || priority === 'critical' ? 'high' : 'normal';
    }
    mapPriorityToIOS(priority) {
        switch (priority) {
            case 'critical': return 10;
            case 'high': return 10;
            case 'normal': return 5;
            case 'low': return 1;
            default: return 5;
        }
    }
    isInvalidTokenError(error) {
        return error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered' ||
            error.status === 410;
    }
    async storeNotification(notification) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to store notification:', error);
            throw error;
        }
    }
    async storeDeviceToken(deviceToken) {
        try {
            await this.deactivateOldTokens(deviceToken.userId, deviceToken.deviceId, deviceToken.token);
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
        }
        catch (error) {
            logger_1.logger.error('Failed to store device token:', error);
            throw error;
        }
    }
    async getUserDeviceTokens(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { deviceTokens: true }
            });
            if (!user || !user.deviceTokens) {
                return [];
            }
            const tokens = Array.isArray(user.deviceTokens) ? user.deviceTokens : [];
            return tokens.map((token) => ({
                userId: token.userId || userId,
                token: token.token,
                platform: token.platform,
                deviceId: token.deviceId || '',
                isActive: token.isActive !== false,
                lastUsed: new Date(token.lastUsed || Date.now()),
                appVersion: token.appVersion,
                osVersion: token.osVersion,
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to get user device tokens:', error);
            return [];
        }
    }
    async getUserPreferences(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { notificationSettings: true }
            });
            if (!user || !user.notificationSettings) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get user preferences:', error);
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
    async storeUserPreferences(preferences) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to store user preferences:', error);
            throw error;
        }
    }
    async updateNotificationStatus(notificationId, status) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to update notification status:', error);
        }
    }
    async deactivateOldTokens(userId, deviceId, currentToken) {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to deactivate old tokens:', error);
        }
    }
    async deactivateDeviceToken(token) {
        try {
            await this.prisma.deviceToken.update({
                where: { token: token },
                data: {
                    isActive: false,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to deactivate device token:', error);
        }
    }
    async updateDeviceLastUsed(token) {
        try {
            await this.prisma.deviceToken.update({
                where: { token: token },
                data: {
                    lastUsed: new Date(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update device last used:', error);
        }
    }
    async storeScheduledNotification(notification) {
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
                    scheduledFor: notification.scheduledFor,
                    status: 'scheduled',
                    createdAt: notification.createdAt,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to store scheduled notification:', error);
            throw error;
        }
    }
    async scheduleJob(notificationId, delay) {
        try {
            await redis_1.redisClient.setex(`scheduled_notification:${notificationId}`, Math.ceil(delay / 1000), notificationId);
            await this.prisma.notificationJob.create({
                data: {
                    id: crypto.randomUUID(),
                    notificationId: notificationId,
                    scheduledFor: new Date(Date.now() + delay),
                    status: 'scheduled',
                    createdAt: new Date(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to schedule notification job:', error);
            throw error;
        }
    }
}
exports.default = PushNotificationService;
//# sourceMappingURL=pushNotificationService.js.map