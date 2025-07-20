"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const locationService_1 = __importDefault(require("./locationService"));
const emergencyAlertService_1 = __importDefault(require("./emergencyAlertService"));
class WebSocketService {
    constructor(httpServer, redisClient) {
        this.connectedUsers = new Map();
        this.userSockets = new Map();
        this.rooms = new Map();
        this.messageQueue = new Map();
        this.redis = redisClient;
        this.locationService = new locationService_1.default();
        this.emergencyAlertService = new emergencyAlertService_1.default();
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000,
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupRedisSubscriptions();
        this.startCleanupTasks();
        logger_1.logger.info('WebSocket service initialized');
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const { clerkClient } = require('@clerk/backend');
                const sessionClaims = await clerkClient.verifyToken(token);
                if (!sessionClaims || !sessionClaims.sub) {
                    return next(new Error('Invalid token'));
                }
                const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
                const user = {
                    id: clerkUser.id,
                    email: clerkUser.emailAddresses[0]?.emailAddress || '',
                    role: clerkUser.publicMetadata?.role || 'USER',
                    permissions: clerkUser.publicMetadata?.permissions || [],
                    clientId: clerkUser.publicMetadata?.clientId,
                    agentId: clerkUser.publicMetadata?.agentId,
                };
                socket.data.user = user;
                next();
            }
            catch (error) {
                logger_1.logger.error('WebSocket authentication error:', error);
                next(new Error('Invalid authentication token'));
            }
        });
        this.io.use((socket, next) => {
            const rateLimitKey = `rate_limit:${socket.data.user.id}`;
            next();
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
            socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
            socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
            socket.on('send_message', (data) => this.handleSendMessage(socket, data));
            socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
            socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
            socket.on('location_update', (data) => this.handleLocationUpdate(socket, data));
            socket.on('emergency_alert', (data) => this.handleEmergencyAlert(socket, data));
            socket.on('status_update', (data) => this.handleStatusUpdate(socket, data));
            socket.on('disconnect', () => this.handleDisconnection(socket));
        });
    }
    setupRedisSubscriptions() {
        try {
            const subscriber = this.redis.duplicate();
            subscriber.subscribe('websocket:broadcast', 'websocket:room', 'websocket:user');
            subscriber.on('message', (channel, message) => {
                try {
                    const data = JSON.parse(message);
                    switch (channel) {
                        case 'websocket:broadcast':
                            this.broadcastToAll(data.event, data.payload);
                            break;
                        case 'websocket:room':
                            this.broadcastToRoom(data.roomId, data.event, data.payload);
                            break;
                        case 'websocket:user':
                            this.sendToUser(data.userId, data.event, data.payload);
                            break;
                    }
                }
                catch (error) {
                    logger_1.logger.error('Redis message processing error:', error);
                }
            });
            subscriber.on('error', (error) => {
                logger_1.logger.warn('Redis subscriber error, continuing without Redis pub/sub:', error.message);
            });
        }
        catch (error) {
            logger_1.logger.warn('Failed to setup Redis subscriptions, continuing without Redis pub/sub:', error);
        }
    }
    handleConnection(socket) {
        const user = socket.data.user;
        this.connectedUsers.set(socket.id, socket);
        if (!this.userSockets.has(user.id)) {
            this.userSockets.set(user.id, new Set());
        }
        this.userSockets.get(user.id).add(socket.id);
        socket.join(`user:${user.id}`);
        socket.join(`role:${user.role}`);
        if (user.clientId) {
            socket.join(`client:${user.clientId}`);
        }
        if (user.agentId) {
            socket.join(`agent:${user.agentId}`);
        }
        this.sendQueuedMessages(user.id);
        this.broadcastUserStatus(user.id, 'online');
        logger_1.logger.info(`User ${user.email} connected via WebSocket`);
    }
    handleDisconnection(socket) {
        const user = socket.data.user;
        this.connectedUsers.delete(socket.id);
        if (this.userSockets.has(user.id)) {
            this.userSockets.get(user.id).delete(socket.id);
            if (this.userSockets.get(user.id).size === 0) {
                this.userSockets.delete(user.id);
                this.broadcastUserStatus(user.id, 'offline');
            }
        }
        logger_1.logger.info(`User ${user.email} disconnected from WebSocket`);
    }
    handleJoinRoom(socket, data) {
        const user = socket.data.user;
        if (!this.canAccessRoom(user, data.roomId)) {
            socket.emit('error', { message: 'Access denied to room' });
            return;
        }
        socket.join(data.roomId);
        socket.to(data.roomId).emit('user_joined', {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        });
        logger_1.logger.info(`User ${user.email} joined room ${data.roomId}`);
    }
    handleLeaveRoom(socket, data) {
        const user = socket.data.user;
        socket.leave(data.roomId);
        socket.to(data.roomId).emit('user_left', {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        });
        logger_1.logger.info(`User ${user.email} left room ${data.roomId}`);
    }
    async handleSendMessage(socket, data) {
        const user = socket.data.user;
        try {
            if (!this.validateMessage(data)) {
                socket.emit('error', { message: 'Invalid message format' });
                return;
            }
            const message = {
                ...data,
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                senderId: user.id,
                timestamp: new Date(),
            };
            await this.storeMessage(message);
            if (message.recipientId) {
                this.sendToUser(message.recipientId, message.type, message);
                socket.emit('message_sent', { messageId: message.id });
            }
            else if (message.roomId) {
                this.broadcastToRoom(message.roomId, message.type, message);
                socket.emit('message_sent', { messageId: message.id });
            }
            if (message.priority === 'critical') {
                this.handleCriticalMessage(message);
            }
        }
        catch (error) {
            logger_1.logger.error('Message sending error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }
    handleTypingStart(socket, data) {
        const user = socket.data.user;
        const typingData = {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        };
        if (data.roomId) {
            socket.to(data.roomId).emit('typing_start', typingData);
        }
        else if (data.recipientId) {
            this.sendToUser(data.recipientId, 'typing_start', typingData);
        }
    }
    handleTypingStop(socket, data) {
        const user = socket.data.user;
        const typingData = {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        };
        if (data.roomId) {
            socket.to(data.roomId).emit('typing_stop', typingData);
        }
        else if (data.recipientId) {
            this.sendToUser(data.recipientId, 'typing_stop', typingData);
        }
    }
    async handleLocationUpdate(socket, data) {
        const user = socket.data.user;
        if (!user.agentId) {
            socket.emit('error', { message: 'Location updates only available for agents' });
            return;
        }
        try {
            const locationUpdate = {
                agentId: user.agentId,
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: data.accuracy || 0,
                timestamp: new Date(),
                batteryLevel: data.batteryLevel,
                speed: data.speed,
                heading: data.heading
            };
            const violations = await this.locationService.processLocationUpdate(locationUpdate);
            this.broadcastToRoles(['supervisor', 'admin'], 'location_update', {
                userId: user.id,
                agentId: user.agentId,
                location: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    accuracy: data.accuracy,
                    batteryLevel: data.batteryLevel
                },
                timestamp: new Date(),
            });
            if (violations && violations.length > 0) {
                violations.forEach(violation => {
                    this.broadcastToRoles(['supervisor', 'admin'], 'geofence_violation', violation);
                });
            }
            socket.emit('location_update_received', {
                timestamp: new Date(),
                violations: violations.length || 0
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to process location update:', error);
            socket.emit('error', { message: 'Failed to process location update' });
        }
    }
    async handleEmergencyAlert(socket, data) {
        const user = socket.data.user;
        if (!user.agentId) {
            socket.emit('error', { message: 'Emergency alerts only available for agents' });
            return;
        }
        try {
            const alert = await this.emergencyAlertService.createEmergencyAlert({
                type: data.type || 'GENERAL',
                agentId: user.agentId,
                location: data.location,
                description: data.description,
                metadata: {
                    userAgent: socket.handshake.headers['user-agent'],
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                }
            });
            this.broadcastToRoles(['supervisor', 'admin'], 'emergency_alert', {
                id: alert.id,
                type: alert.type,
                priority: alert.priority,
                agentId: alert.agentId,
                agentName: alert.agentName,
                location: alert.location,
                description: alert.description,
                timestamp: alert.timestamp,
                status: alert.status,
                escalationLevel: alert.escalationLevel
            });
            socket.emit('emergency_alert_sent', {
                alertId: alert.id,
                status: 'created',
                escalationLevel: alert.escalationLevel,
                timestamp: alert.timestamp
            });
            logger_1.logger.warn(`Emergency alert created: ${alert.id} - ${alert.type} from ${alert.agentName}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to create emergency alert:', error);
            socket.emit('error', { message: 'Failed to create emergency alert' });
        }
    }
    handleStatusUpdate(socket, data) {
        const user = socket.data.user;
        const statusUpdate = {
            userId: user.id,
            agentId: user.agentId,
            status: data.status,
            metadata: data.metadata,
            timestamp: new Date(),
        };
        this.storeStatusUpdate(statusUpdate);
        this.broadcastToRole('supervisor', 'status_update', statusUpdate);
    }
    sendToUser(userId, event, data) {
        const userSockets = this.userSockets.get(userId);
        if (userSockets && userSockets.size > 0) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
        else {
            this.queueMessage(userId, { event, data });
        }
    }
    broadcastToRoom(roomId, event, data) {
        this.io.to(roomId).emit(event, data);
    }
    broadcastToRole(role, event, data) {
        this.io.to(`role:${role}`).emit(event, data);
    }
    broadcastToRoles(roles, event, data) {
        roles.forEach(role => this.broadcastToRole(role, event, data));
    }
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }
    getConnectedUsers() {
        return Array.from(this.userSockets.keys());
    }
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }
    canAccessRoom(user, roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        if (room.participants.includes(user.id))
            return true;
        if (user.role === 'admin' || user.role === 'supervisor')
            return true;
        return false;
    }
    validateMessage(message) {
        return message &&
            typeof message.type === 'string' &&
            message.payload !== undefined &&
            (message.recipientId || message.roomId);
    }
    async storeMessage(message) {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            await prisma.communication.create({
                data: {
                    type: 'MESSAGE',
                    subject: `WebSocket Message - ${message.type}`,
                    content: JSON.stringify(message.payload),
                    priority: message.priority === 'critical' ? 'EMERGENCY' :
                        message.priority === 'high' ? 'HIGH' :
                            message.priority === 'normal' ? 'NORMAL' : 'LOW',
                    isUrgent: message.priority === 'critical',
                    senderId: message.senderId,
                    sentAt: message.timestamp,
                    recipients: message.recipientId ? {
                        create: [{
                                userId: message.recipientId,
                                deliveredAt: new Date()
                            }]
                    } : undefined
                }
            });
            await prisma.$disconnect();
        }
        catch (error) {
            logger_1.logger.error('Failed to store WebSocket message:', error);
        }
    }
    async storeLocationUpdate(userId, location) {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const agentProfile = await prisma.agentProfile.findFirst({
                where: { userId }
            });
            if (agentProfile) {
                await prisma.trackingLog.create({
                    data: {
                        agentId: agentProfile.id,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy || 0,
                        timestamp: new Date(),
                        battery: location.batteryLevel,
                        status: 'ACTIVE'
                    }
                });
                await this.checkGeofenceViolations(agentProfile.id, location);
            }
            await prisma.$disconnect();
        }
        catch (error) {
            logger_1.logger.error('Failed to store location update:', error);
        }
    }
    async storeEmergencyAlert(alert) {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const agent = await prisma.agentProfile.findUnique({
                where: { id: alert.agentId },
                include: { currentSite: true }
            });
            await prisma.incident.create({
                data: {
                    title: `Emergency Alert - ${alert.type}`,
                    description: alert.description || 'Emergency alert triggered',
                    type: 'OTHER',
                    severity: 'CRITICAL',
                    status: 'OPEN',
                    occurredAt: alert.timestamp,
                    reportedById: alert.agentId,
                    siteId: agent?.currentSiteId || 'unknown',
                    location: alert.location ? JSON.stringify(alert.location) : null,
                    evidence: JSON.stringify({
                        alertId: alert.id,
                        metadata: alert
                    })
                }
            });
            await prisma.$disconnect();
        }
        catch (error) {
            logger_1.logger.error('Failed to store emergency alert:', error);
        }
    }
    async storeStatusUpdate(update) {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            await prisma.communication.create({
                data: {
                    type: 'MESSAGE',
                    subject: `Status Update - ${update.status}`,
                    content: JSON.stringify(update),
                    priority: 'NORMAL',
                    senderId: update.userId,
                    sentAt: update.timestamp
                }
            });
            await prisma.$disconnect();
        }
        catch (error) {
            logger_1.logger.error('Failed to store status update:', error);
        }
    }
    queueMessage(userId, message) {
        if (!this.messageQueue.has(userId)) {
            this.messageQueue.set(userId, []);
        }
        this.messageQueue.get(userId).push(message);
    }
    sendQueuedMessages(userId) {
        const messages = this.messageQueue.get(userId);
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                this.sendToUser(userId, msg.type, msg);
            });
            this.messageQueue.delete(userId);
        }
    }
    broadcastUserStatus(userId, status) {
        this.broadcastToRole('supervisor', 'user_status_change', {
            userId,
            status,
            timestamp: new Date(),
        });
    }
    handleCriticalMessage(message) {
        logger_1.logger.warn('Critical message received:', message);
    }
    startCleanupTasks() {
        setInterval(() => {
            this.cleanupMessageQueue();
        }, 60 * 60 * 1000);
    }
    cleanupMessageQueue() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        for (const [userId, messages] of this.messageQueue.entries()) {
            const recentMessages = messages.filter(msg => msg.timestamp.getTime() > cutoff);
            if (recentMessages.length === 0) {
                this.messageQueue.delete(userId);
            }
            else {
                this.messageQueue.set(userId, recentMessages);
            }
        }
    }
    async checkGeofenceViolations(agentId, location) {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const currentShift = await prisma.shift.findFirst({
                where: {
                    agentId,
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
                await prisma.$disconnect();
                return;
            }
            const siteCoords = currentShift.site.coordinates;
            if (!siteCoords.latitude || !siteCoords.longitude || !siteCoords.radius) {
                await prisma.$disconnect();
                return;
            }
            const distance = this.calculateDistance(location.latitude, location.longitude, siteCoords.latitude, siteCoords.longitude);
            if (distance > siteCoords.radius) {
                const violation = {
                    agentId,
                    agentName: `${currentShift.agent.user.firstName} ${currentShift.agent.user.lastName}`,
                    siteId: currentShift.siteId,
                    siteName: currentShift.site.name,
                    location,
                    distance,
                    allowedRadius: siteCoords.radius,
                    timestamp: new Date()
                };
                await prisma.incident.create({
                    data: {
                        title: `Geofence Violation - ${currentShift.site.name}`,
                        description: `Agent ${violation.agentName} is ${Math.round(distance)}m outside the allowed ${siteCoords.radius}m radius`,
                        type: 'ACCESS_VIOLATION',
                        severity: 'MEDIUM',
                        status: 'OPEN',
                        occurredAt: new Date(),
                        reportedById: agentId,
                        siteId: currentShift.siteId,
                        location: JSON.stringify(location),
                        evidence: JSON.stringify(violation)
                    }
                });
                this.broadcastToRoles(['supervisor', 'admin'], 'geofence_violation', violation);
                logger_1.logger.warn('Geofence violation detected:', violation);
            }
            await prisma.$disconnect();
        }
        catch (error) {
            logger_1.logger.error('Failed to check geofence violations:', error);
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
}
exports.default = WebSocketService;
//# sourceMappingURL=websocketService.js.map