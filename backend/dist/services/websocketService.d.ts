import { Server as HTTPServer } from 'http';
import Redis from 'ioredis';
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
declare class WebSocketService {
    private io;
    private redis;
    private locationService;
    private emergencyAlertService;
    private connectedUsers;
    private userSockets;
    private rooms;
    private messageQueue;
    constructor(httpServer: HTTPServer, redisClient: Redis);
    private setupMiddleware;
    private setupEventHandlers;
    private setupRedisSubscriptions;
    private handleConnection;
    private handleDisconnection;
    private handleJoinRoom;
    private handleLeaveRoom;
    private handleSendMessage;
    private handleTypingStart;
    private handleTypingStop;
    private handleLocationUpdate;
    private handleEmergencyAlert;
    private handleStatusUpdate;
    sendToUser(userId: string, event: string, data: any): void;
    broadcastToRoom(roomId: string, event: string, data: any): void;
    broadcastToRole(role: string, event: string, data: any): void;
    broadcastToRoles(roles: string[], event: string, data: any): void;
    broadcastToAll(event: string, data: any): void;
    getConnectedUsers(): string[];
    isUserOnline(userId: string): boolean;
    private canAccessRoom;
    private validateMessage;
    private storeMessage;
    private storeLocationUpdate;
    private storeEmergencyAlert;
    private storeStatusUpdate;
    private queueMessage;
    private sendQueuedMessages;
    private broadcastUserStatus;
    private handleCriticalMessage;
    private startCleanupTasks;
    private cleanupMessageQueue;
    private checkGeofenceViolations;
    private calculateDistance;
}
export default WebSocketService;
//# sourceMappingURL=websocketService.d.ts.map