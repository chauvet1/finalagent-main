import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
// JWT removed - using Clerk for authentication
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import LocationService from './locationService';
import EmergencyAlertService from './emergencyAlertService';

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  clientId?: string;
  agentId?: string;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  senderId: string;
  recipientId?: string;
  roomId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface Room {
  id: string;
  name: string;
  type: 'private' | 'group' | 'broadcast' | 'emergency';
  participants: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

class WebSocketService {
  private io: SocketIOServer;
  private redis: Redis;
  private locationService: LocationService;
  private emergencyAlertService: EmergencyAlertService;
  private connectedUsers: Map<string, Socket> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private rooms: Map<string, Room> = new Map();
  private messageQueue: Map<string, WebSocketMessage[]> = new Map();

  constructor(httpServer: HTTPServer, redisClient: Redis) {
    this.redis = redisClient;
    this.locationService = new LocationService();
    this.emergencyAlertService = new EmergencyAlertService();
    this.io = new SocketIOServer(httpServer, {
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

    logger.info('WebSocket service initialized');
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify Clerk session token
        const { clerkClient } = require('@clerk/backend');
        const sessionClaims = await clerkClient.verifyToken(token);

        if (!sessionClaims || !sessionClaims.sub) {
          return next(new Error('Invalid token'));
        }

        // Get user from Clerk
        const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
        const user: SocketUser = {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          role: clerkUser.publicMetadata?.role || 'USER',
          permissions: clerkUser.publicMetadata?.permissions || [],
          clientId: clerkUser.publicMetadata?.clientId,
          agentId: clerkUser.publicMetadata?.agentId,
        };

        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      const rateLimitKey = `rate_limit:${socket.data.user.id}`;
      // Implement rate limiting logic here
      next();
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
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

  private setupRedisSubscriptions(): void {
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
        } catch (error) {
          logger.error('Redis message processing error:', error);
        }
      });

      subscriber.on('error', (error) => {
        logger.warn('Redis subscriber error, continuing without Redis pub/sub:', error.message);
      });
    } catch (error) {
      logger.warn('Failed to setup Redis subscriptions, continuing without Redis pub/sub:', error);
    }
  }

  private handleConnection(socket: Socket): void {
    const user = socket.data.user as SocketUser;
    
    // Store socket connection
    this.connectedUsers.set(socket.id, socket);
    
    // Track user sockets
    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    this.userSockets.get(user.id)!.add(socket.id);

    // Join user to their personal room
    socket.join(`user:${user.id}`);
    
    // Join role-based rooms
    socket.join(`role:${user.role}`);
    
    // Join client/agent specific rooms
    if (user.clientId) {
      socket.join(`client:${user.clientId}`);
    }
    if (user.agentId) {
      socket.join(`agent:${user.agentId}`);
    }

    // Send queued messages
    this.sendQueuedMessages(user.id);

    // Broadcast user online status
    this.broadcastUserStatus(user.id, 'online');

    logger.info(`User ${user.email} connected via WebSocket`);
  }

  private handleDisconnection(socket: Socket): void {
    const user = socket.data.user as SocketUser;
    
    // Remove socket connection
    this.connectedUsers.delete(socket.id);
    
    // Update user sockets
    if (this.userSockets.has(user.id)) {
      this.userSockets.get(user.id)!.delete(socket.id);
      
      // If no more sockets for this user, mark as offline
      if (this.userSockets.get(user.id)!.size === 0) {
        this.userSockets.delete(user.id);
        this.broadcastUserStatus(user.id, 'offline');
      }
    }

    logger.info(`User ${user.email} disconnected from WebSocket`);
  }

  private handleJoinRoom(socket: Socket, data: { roomId: string }): void {
    const user = socket.data.user as SocketUser;
    
    // Validate room access
    if (!this.canAccessRoom(user, data.roomId)) {
      socket.emit('error', { message: 'Access denied to room' });
      return;
    }

    socket.join(data.roomId);
    
    // Notify room members
    socket.to(data.roomId).emit('user_joined', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    logger.info(`User ${user.email} joined room ${data.roomId}`);
  }

  private handleLeaveRoom(socket: Socket, data: { roomId: string }): void {
    const user = socket.data.user as SocketUser;
    
    socket.leave(data.roomId);
    
    // Notify room members
    socket.to(data.roomId).emit('user_left', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    logger.info(`User ${user.email} left room ${data.roomId}`);
  }

  private async handleSendMessage(socket: Socket, data: WebSocketMessage): Promise<void> {
    const user = socket.data.user as SocketUser;
    
    try {
      // Validate message
      if (!this.validateMessage(data)) {
        socket.emit('error', { message: 'Invalid message format' });
        return;
      }

      // Create message object
      const message: WebSocketMessage = {
        ...data,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: user.id,
        timestamp: new Date(),
      };

      // Store message in database
      await this.storeMessage(message);

      // Send message based on type
      if (message.recipientId) {
        // Private message
        this.sendToUser(message.recipientId, message.type, message);
        socket.emit('message_sent', { messageId: message.id });
      } else if (message.roomId) {
        // Room message
        this.broadcastToRoom(message.roomId, message.type, message);
        socket.emit('message_sent', { messageId: message.id });
      }

      // Handle priority messages
      if (message.priority === 'critical') {
        this.handleCriticalMessage(message);
      }

    } catch (error) {
      logger.error('Message sending error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTypingStart(socket: Socket, data: { roomId?: string; recipientId?: string }): void {
    const user = socket.data.user as SocketUser;
    
    const typingData = {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    };

    if (data.roomId) {
      socket.to(data.roomId).emit('typing_start', typingData);
    } else if (data.recipientId) {
      this.sendToUser(data.recipientId, 'typing_start', typingData);
    }
  }

  private handleTypingStop(socket: Socket, data: { roomId?: string; recipientId?: string }): void {
    const user = socket.data.user as SocketUser;
    
    const typingData = {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    };

    if (data.roomId) {
      socket.to(data.roomId).emit('typing_stop', typingData);
    } else if (data.recipientId) {
      this.sendToUser(data.recipientId, 'typing_stop', typingData);
    }
  }

  private async handleLocationUpdate(socket: Socket, data: { latitude: number; longitude: number; accuracy?: number; batteryLevel?: number; speed?: number; heading?: number }): Promise<void> {
    const user = socket.data.user as SocketUser;
    
    if (!user.agentId) {
      socket.emit('error', { message: 'Location updates only available for agents' });
      return;
    }

    try {
      // Process location update using LocationService
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

      // Broadcast location update to supervisors and admins
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

      // Broadcast any geofence violations
      if (violations && violations.length > 0) {
        violations.forEach(violation => {
          this.broadcastToRoles(['supervisor', 'admin'], 'geofence_violation', violation);
        });
      }

      // Send confirmation to agent
      socket.emit('location_update_received', {
        timestamp: new Date(),
        violations: violations.length || 0
      });

    } catch (error) {
      logger.error('Failed to process location update:', error);
      socket.emit('error', { message: 'Failed to process location update' });
    }
  }

  private async handleEmergencyAlert(socket: Socket, data: any): Promise<void> {
    const user = socket.data.user as SocketUser;
    
    if (!user.agentId) {
      socket.emit('error', { message: 'Emergency alerts only available for agents' });
      return;
    }

    try {
      // Create emergency alert using EmergencyAlertService
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

      // Broadcast emergency alert to supervisors and admins
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

      // Send confirmation to sender
      socket.emit('emergency_alert_sent', { 
        alertId: alert.id,
        status: 'created',
        escalationLevel: alert.escalationLevel,
        timestamp: alert.timestamp
      });

      logger.warn(`Emergency alert created: ${alert.id} - ${alert.type} from ${alert.agentName}`);

    } catch (error) {
      logger.error('Failed to create emergency alert:', error);
      socket.emit('error', { message: 'Failed to create emergency alert' });
    }
  }

  private handleStatusUpdate(socket: Socket, data: { status: string; metadata?: any }): void {
    const user = socket.data.user as SocketUser;
    
    const statusUpdate = {
      userId: user.id,
      agentId: user.agentId,
      status: data.status,
      metadata: data.metadata,
      timestamp: new Date(),
    };

    // Store status update
    this.storeStatusUpdate(statusUpdate);

    // Broadcast to supervisors
    this.broadcastToRole('supervisor', 'status_update', statusUpdate);
  }

  // Public methods for external use
  public sendToUser(userId: string, event: string, data: any): void {
    const userSockets = this.userSockets.get(userId);
    
    if (userSockets && userSockets.size > 0) {
      // User is online, send immediately
      this.io.to(`user:${userId}`).emit(event, data);
    } else {
      // User is offline, queue message
      this.queueMessage(userId, { event, data });
    }
  }

  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  public broadcastToRole(role: string, event: string, data: any): void {
    this.io.to(`role:${role}`).emit(event, data);
  }

  public broadcastToRoles(roles: string[], event: string, data: any): void {
    roles.forEach(role => this.broadcastToRole(role, event, data));
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Private helper methods
  private canAccessRoom(user: SocketUser, roomId: string): boolean {
    // Implement room access control logic
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    // Check if user is participant
    if (room.participants.includes(user.id)) return true;
    
    // Check role-based access
    if (user.role === 'admin' || user.role === 'supervisor') return true;
    
    return false;
  }

  private validateMessage(message: any): boolean {
    return message && 
           typeof message.type === 'string' && 
           message.payload !== undefined &&
           (message.recipientId || message.roomId);
  }

  private async storeMessage(message: WebSocketMessage): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
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
    } catch (error) {
      logger.error('Failed to store WebSocket message:', error);
    }
  }

  private async storeLocationUpdate(userId: string, location: any): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Get agent profile for this user
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

        // Check for geofence violations
        await this.checkGeofenceViolations(agentProfile.id, location);
      }

      await prisma.$disconnect();
    } catch (error) {
      logger.error('Failed to store location update:', error);
    }
  }

  private async storeEmergencyAlert(alert: any): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Get agent's current site if available
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
    } catch (error) {
      logger.error('Failed to store emergency alert:', error);
    }
  }

  private async storeStatusUpdate(update: any): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Log status change
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
    } catch (error) {
      logger.error('Failed to store status update:', error);
    }
  }

  private queueMessage(userId: string, message: any): void {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    this.messageQueue.get(userId)!.push(message);
  }

  private sendQueuedMessages(userId: string): void {
    const messages = this.messageQueue.get(userId);
    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        this.sendToUser(userId, msg.type, msg);
      });
      this.messageQueue.delete(userId);
    }
  }

  private broadcastUserStatus(userId: string, status: 'online' | 'offline'): void {
    this.broadcastToRole('supervisor', 'user_status_change', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  private handleCriticalMessage(message: WebSocketMessage): void {
    // Handle critical priority messages with special processing
    logger.warn('Critical message received:', message);
  }

  private startCleanupTasks(): void {
    // Clean up old queued messages every hour
    setInterval(() => {
      this.cleanupMessageQueue();
    }, 60 * 60 * 1000);
  }

  private cleanupMessageQueue(): void {
    // Remove old queued messages
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [userId, messages] of this.messageQueue.entries()) {
      const recentMessages = messages.filter(msg => 
        msg.timestamp.getTime() > cutoff
      );
      
      if (recentMessages.length === 0) {
        this.messageQueue.delete(userId);
      } else {
        this.messageQueue.set(userId, recentMessages);
      }
    }
  }

  private async checkGeofenceViolations(agentId: string, location: { latitude: number; longitude: number }): Promise<void> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Get current shift for the agent
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

      // Parse site coordinates
      const siteCoords = currentShift.site.coordinates as any;
      if (!siteCoords.latitude || !siteCoords.longitude || !siteCoords.radius) {
        await prisma.$disconnect();
        return;
      }

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        siteCoords.latitude,
        siteCoords.longitude
      );

      // Check if outside geofence
      if (distance > siteCoords.radius) {
        // Create geofence violation alert
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

        // Store violation in database
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

        // Broadcast violation alert to supervisors and admins
        this.broadcastToRoles(['supervisor', 'admin'], 'geofence_violation', violation);

        logger.warn('Geofence violation detected:', violation);
      }

      await prisma.$disconnect();
    } catch (error) {
      logger.error('Failed to check geofence violations:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

export default WebSocketService;
