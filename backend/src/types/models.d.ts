import { Prisma } from '@prisma/client';

// Base types
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

// Prisma model extensions
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    agent?: true;
    client?: true;
    notifications: true;
    messages: true;
    deviceTokens: true;
    notificationSettings: true;
  };
}>;

export type AgentWithRelations = Prisma.AgentGetPayload<{
  include: {
    user: true;
    shifts: true;
    site: true;
    locationUpdates: true;
    reports: true;
  };
}>;

export type SiteWithRelations = Prisma.SiteGetPayload<{
  include: {
    agents: true;
    shifts: true;
    geofenceZones: true;
    locationUpdates: true;
  };
}>;

export type ShiftWithRelations = Prisma.ShiftGetPayload<{
  include: {
    assignments: true;
    site: true;
    reports: true;
  };
}>;

export type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: {
    deliveries: true;
    recipients: true;
  };
}>;

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    sender: true;
    recipient: true;
    conversation: true;
  };
}>;

// Service interfaces
export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channels: string[];
  recipientId?: string;
  recipientRole?: string;
  metadata?: Record<string, any>;
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  badge?: number;
  category?: string;
  priority?: 'normal' | 'high' | 'urgent';
}

export interface GeofenceEventData {
  agentId: string;
  zoneId: string;
  eventType: 'ENTER' | 'EXIT' | 'DWELL' | 'VIOLATION';
  latitude: number;
  longitude: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface GeofenceZoneData {
  name: string;
  type: 'EMERGENCY' | 'ENTRY' | 'EXIT' | 'RESTRICTED' | 'PATROL';
  coordinates: GeoCoordinate[];
  siteId: string;
  radius?: number;
  description?: string;
}

export interface GeofenceRuleData {
  name: string;
  zoneId: string;
  conditions: {
    maxDwellTime?: number;
    maxSpeed?: number;
    restrictedHours?: {
      start: string;
      end: string;
    };
  };
  actions: GeofenceAction[];
  priority: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export interface GeofenceAction {
  type: 'NOTIFICATION' | 'ALERT' | 'CHECK_IN' | 'AUDIT_LOG';
  parameters: Record<string, any>;
}

export interface MessageData {
  conversationId: string;
  senderId: string;
  recipientId?: string;
  content: string;
  type: 'text' | 'image' | 'location' | 'system' | 'file' | 'voice';
  metadata?: Record<string, any>;
}

export interface ConversationData {
  type: 'emergency' | 'private' | 'group' | 'broadcast';
  name?: string;
  description?: string;
  participants: {
    userId: string;
    role: 'admin' | 'member' | 'moderator';
    joinedAt: Date;
    notificationSettings: {
      emailNotifications: boolean;
      smsNotifications: boolean;
      pushNotifications: boolean;
    };
  }[];
  settings: {
    allowFileSharing: boolean;
    allowVoiceMessages: boolean;
    requireApproval: boolean;
  };
  metadata?: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  event: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface LocationUpdateData {
  agentId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  siteId: string;
}

export interface HealthCheckData {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface IntegrationData {
  type: string;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  apiKey?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Service configuration types
export interface ServiceConfig {
  name: string;
  version: string;
  environment: string;
  port: number;
  database: {
    url: string;
  };
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    filePath?: string;
  };
}

// Error types
export interface AppError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Event types
export interface EventData {
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
  correlationId?: string;
}

// Audit types
export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Notification delivery types
export interface NotificationDeliveryData {
  notificationId: string;
  recipientId: string;
  channel: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: Date;
  error?: string;
}

// Check-in types
export interface CheckInData {
  agentId: string;
  siteId: string;
  checkpointId?: string;
  method: 'GPS' | 'QR_CODE' | 'MANUAL' | 'NFC';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  metadata?: Record<string, any>;
}

// Export all Prisma types for convenience
export * from '@prisma/client'; 