// Basic types for the application
export interface Config {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    ssl?: boolean;
    retryAttempts?: number;
    pool?: {
      min: number;
      max: number;
      acquireTimeoutMillis?: number;
      createTimeoutMillis?: number;
      destroyTimeoutMillis?: number;
      idleTimeoutMillis?: number;
      reapIntervalMillis?: number;
      createRetryIntervalMillis?: number;
      retryAttempts?: number;
    };
  };
  redis: {
    url: string;
    password?: string;
    db?: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  monitoring: {
    enabled: boolean;
    port: number;
    metricsPath: string;
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    bcryptRounds: number;
    sessionTimeout: number;
  };
  integrations: {
    twilio: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    };
    sendgrid: {
      apiKey: string;
      fromEmail: string;
    };
    firebase: {
      projectId: string;
      privateKey: string;
      clientEmail: string;
    };
    aws: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      s3: {
        bucket: string;
      };
    };
  };
}

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

export interface WebSocketMessage {
  type: string;
  event: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface AppError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;
  details?: Record<string, any>;
} 