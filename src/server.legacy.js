import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import configurations and middleware
import config from './config/config.js';
import logger from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { validateApiKey } from './middleware/auth.js';

// Import routes
// Note: Auth routes removed - using Clerk for authentication
import userRoutes from './routes/users.js';
import agentRoutes from './routes/agents.js';
import siteRoutes from './routes/sites.js';
import shiftRoutes from './routes/shifts.js';
import attendanceRoutes from './routes/attendance.js';
import locationRoutes from './routes/locations.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import messageRoutes from './routes/messages.js';
import clientRoutes from './routes/clients.js';
import mediaRoutes from './routes/media.js';
import healthRoutes from './routes/health.js';
import geofencingRoutes from './routes/geofencing.js';
import gdprRoutes from './routes/gdpr.js';
import messagingRoutes from './routes/messaging.js';
import filesRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import performanceRoutes from './routes/performance.js';
import integrationRoutes from './routes/integration.js';
import qrCodeRoutes from './routes/qrCode.js';
import clientPortalRoutes from './routes/clientPortal.js';
import syncRoutes from './routes/sync.js';
import routeRoutes from './routes/routes.js';
import monitoringRoutes, { initializeMonitoringService } from './routes/monitoring.js';
import schedulingRoutes from './routes/scheduling.js';
import workforceRoutes from './routes/workforce.js';
import intelligentSchedulingRoutes from './routes/intelligentScheduling.js';
import mobileRoutes from './routes/mobile.js';
import analyticsRoutes from './routes/analytics.js';

// Import services
import { initializeRedis } from './services/redis.js';
import { initializeSocketIO } from './services/socketIO.js';
import WebSocketService from './services/websocket.js';
import NotificationService from './services/notification.js';
import { startBackgroundJobs } from './services/backgroundJobs.js';

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Prisma client
const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    credentials: true,
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: config.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Trust proxy if behind load balancer
if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Make Prisma and Socket.IO available to routes
app.locals.prisma = prisma;
app.locals.io = io;

// Health check routes (no auth required)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API routes
// Note: /api/auth routes removed - using Clerk for authentication
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/geofencing', geofencingRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api', qrCodeRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/intelligent-scheduling', intelligentSchedulingRoutes);
app.use('/api/workforce', workforceRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/analytics', analyticsRoutes);

// API documentation (development only)
if (config.NODE_ENV === 'development' && config.ENABLE_API_DOCS) {
  (async () => {
    const { default: swaggerJsdoc } = await import('swagger-jsdoc');
    const { default: swaggerUi } = await import('swagger-ui-express');
    
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'BahinLink API',
          version: '1.0.0',
          description: 'Workforce Management Solution API',
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}/api`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: ['./src/routes/*.js', './src/models/*.js'],
    };

    const specs = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  })();
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BahinLink API Server',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    docs: config.NODE_ENV === 'development' ? '/api-docs' : undefined,
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      
      // Close Redis connection if initialized
      const { getRedisClient } = await import('./services/redis.js');
      const redis = getRedisClient();
      if (redis) {
        await redis.quit();
        logger.info('Redis connection closed.');
      }
      
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
// Add global error handlers to prevent process exit
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process for unhandled rejections
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit the process for uncaught exceptions in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Initialize Redis (non-blocking)
    logger.info('Starting Redis initialization...');
    initializeRedis().then(() => {
      logger.info('Redis initialization completed successfully');
    }).catch((error) => {
      logger.error('Redis initialization failed with error:', error);
      logger.info('Continuing without Redis...');
    });
    logger.info('Redis initialization started (non-blocking)');
    
    // Initialize WebSocket service
    logger.info('Starting WebSocket service initialization...');
    const webSocketService = new WebSocketService(server, prisma);
    logger.info('WebSocket service created successfully');
    
    logger.info('Starting Notification service initialization...');
    const notificationService = new NotificationService(prisma, webSocketService);
    logger.info('Notification service created successfully');

    // Make services available globally
    app.locals.webSocketService = webSocketService;
    app.locals.notificationService = notificationService;
    logger.info('WebSocket and Notification services initialized successfully');
    
    // Start background jobs
    if (config.NODE_ENV === 'production') {
      startBackgroundJobs(prisma);
      logger.info('Background jobs started successfully');
    }
    
    // Start HTTP server
    server.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
      logger.info(`API documentation available at http://localhost:${config.PORT}/api-docs`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export { app, server, prisma };
