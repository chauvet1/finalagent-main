declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Database
      DATABASE_URL: string;
      
      // Server
      PORT?: string;
      NODE_ENV: 'development' | 'production' | 'test';
      
      // Authentication
      JWT_SECRET: string;
      JWT_EXPIRES_IN?: string;
      
      // Clerk Authentication
      CLERK_SECRET_KEY?: string;
      CLERK_PUBLISHABLE_KEY?: string;
      
      // Redis
      REDIS_URL?: string;
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      
      // AWS S3
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION?: string;
      AWS_S3_BUCKET?: string;
      
      // Email (SendGrid)
      SENDGRID_API_KEY?: string;
      SENDGRID_FROM_EMAIL?: string;
      
      // SMS (Twilio)
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_PHONE_NUMBER?: string;
      
      // Push Notifications (Firebase)
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_CLIENT_EMAIL?: string;
      FIREBASE_PRIVATE_KEY?: string;
      
      // Apple Push Notifications
      APNS_KEY_PATH?: string;
      APNS_KEY_ID?: string;
      APNS_TEAM_ID?: string;
      
      // Web Push
      VAPID_EMAIL?: string;
      VAPID_PUBLIC_KEY?: string;
      VAPID_PRIVATE_KEY?: string;
      
      // Messaging
      MESSAGE_ENCRYPTION_KEY?: string;
      
      // CORS
      ALLOWED_ORIGINS?: string;
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
      
      // Logging
      LOG_LEVEL?: string;
      LOG_FILE_PATH?: string;
      
      // Monitoring
      ENABLE_METRICS?: string;
      METRICS_PORT?: string;
      
      // Security
      CORS_ORIGIN?: string;
      SESSION_SECRET?: string;
      
      // File Upload
      MAX_FILE_SIZE?: string;
      ALLOWED_FILE_TYPES?: string;
      
      // Geofencing
      GEOFENCING_ENABLED?: string;
      GEOFENCING_RADIUS?: string;
      
      // Notifications
      NOTIFICATION_BATCH_SIZE?: string;
      NOTIFICATION_RETRY_ATTEMPTS?: string;
      
      // Integration
      INTEGRATION_TIMEOUT?: string;
      INTEGRATION_RETRY_DELAY?: string;
      
      // Development
      ENABLE_SWAGGER?: string;
      ENABLE_GRAPHIQL?: string;
      
      // Testing
      TEST_DATABASE_URL?: string;
      
      // Optional features
      ENABLE_WEBSOCKETS?: string;
      ENABLE_REAL_TIME_TRACKING?: string;
      ENABLE_EMERGENCY_ALERTS?: string;
      ENABLE_AUTOMATIC_SCHEDULING?: string;
    }
  }
}

export {}; 