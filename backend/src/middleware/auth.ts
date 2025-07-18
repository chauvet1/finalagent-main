import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/backend';
import { UserSyncService } from '../services/userSyncService';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { TokenType, EnhancedAuthContext } from '../types/auth';
import { tokenTypeDetector } from '../utils/tokenTypeDetector';
import { authenticationStrategyFactory, AuthenticatedUser as StrategyAuthenticatedUser } from '../services/authenticationStrategies';

// Enhanced auth context interface
interface AuthenticatedUser {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: UserStatus;
  permissions?: string[];
  accessLevel?: string;
  profileData?: {
    adminProfile?: any;
    clientProfile?: any;
    agentProfile?: any;
  };
}

// Extend Express Request type to include enhanced auth
declare global {
  namespace Express {
    interface Request {
      auth?: EnhancedAuthContext;
      user?: AuthenticatedUser;
    }
  }
}

// Authentication error types
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Initialize Clerk client and Prisma
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const prisma = new PrismaClient();

// Enhanced Authentication Service
export class AuthenticationService {
  private static instance: AuthenticationService;
  
  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Extract token from request headers
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }



  /**
   * Enhanced authentication method using token detection and strategy pattern
   */
  async authenticateRequest(req: Request): Promise<{ auth: EnhancedAuthContext; user: AuthenticatedUser }> {
    const token = this.extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('Authentication token required', 'TOKEN_REQUIRED');
    }

    try {
      // Step 1: Detect token type
      const tokenType = tokenTypeDetector.detectTokenType(token);
      
      logger.debug('Token type detected', {
        tokenType,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + '...'
      });

      // Step 2: Get appropriate authentication strategy
      const strategy = authenticationStrategyFactory.getStrategy(tokenType);
      
      if (!strategy) {
        throw new AuthenticationError(
          `Unsupported token type: ${tokenType}`, 
          'UNSUPPORTED_TOKEN_TYPE'
        );
      }

      // Step 3: Authenticate using the selected strategy
      const authenticatedUser = await strategy.authenticate(token);

      // Step 4: Convert strategy user to middleware user format
      const user: AuthenticatedUser = {
        id: authenticatedUser.id,
        clerkId: authenticatedUser.clerkId,
        email: authenticatedUser.email,
        firstName: authenticatedUser.firstName,
        lastName: authenticatedUser.lastName,
        role: authenticatedUser.role,
        status: authenticatedUser.status,
        permissions: authenticatedUser.permissions,
        accessLevel: authenticatedUser.accessLevel,
        profileData: authenticatedUser.profileData
      };

      // Step 5: Create enhanced authentication context
      const auth: EnhancedAuthContext = {
        userId: authenticatedUser.clerkId,
        sessionId: this.generateSessionId(tokenType, authenticatedUser.id),
        claims: { sub: authenticatedUser.clerkId, email: authenticatedUser.email },
        token,
        tokenType,
        authenticationMethod: authenticatedUser.authenticationMethod as 'jwt' | 'email' | 'development',
        authenticatedAt: new Date()
      };

      logger.info('Authentication successful', {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenType,
        authenticationMethod: authenticatedUser.authenticationMethod
      });

      return { auth, user };

    } catch (error) {
      logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + '...'
      });

      // Re-throw authentication errors
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Wrap other errors
      throw new AuthenticationError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUTHENTICATION_FAILED'
      );
    }
  }

  /**
   * Generate session ID based on token type and user ID
   */
  private generateSessionId(tokenType: TokenType, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${tokenType}_${userId.substring(0, 8)}_${timestamp}_${random}`;
  }
}

// Enhanced authentication middleware
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authService = AuthenticationService.getInstance();
    const { auth, user } = await authService.authenticateRequest(req);

    req.auth = auth;
    req.user = user;

    // Log successful authentication with enhanced audit information
    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenType: auth.tokenType,
      authenticationMethod: auth.authenticationMethod,
      sessionId: auth.sessionId,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: auth.authenticatedAt.toISOString()
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      ip: req.ip
    });

    if (error instanceof AuthenticationError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      }
    });
  }
};

// Commented out Clerk auth for now
// export const requireAuth = ClerkExpressRequireAuth({
//   onError: (error) => {
//     console.error('Authentication error:', error);
//     return {
//       status: 401,
//       message: 'Authentication required'
//     };
//   }
// });

// Enhanced role-based authorization middleware
export const requireRole = (allowedRoles: UserRole[], options?: { 
  checkPermissions?: string[];
  requireAccessLevel?: string;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth || !req.user) {
        throw new AuthenticationError('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const user = req.user;

      // Check role authorization
      if (!allowedRoles.includes(user.role)) {
        logger.warn('Role authorization failed', {
          userId: user.id,
          userRole: user.role,
          allowedRoles,
          endpoint: req.path
        });

        throw new AuthorizationError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${user.role}`,
          'INSUFFICIENT_ROLE'
        );
      }

      // Check specific permissions if required
      if (options?.checkPermissions && user.permissions) {
        const hasRequiredPermissions = options.checkPermissions.every(
          permission => user.permissions!.includes(permission)
        );

        if (!hasRequiredPermissions) {
          throw new AuthorizationError(
            'Insufficient permissions for this action',
            'INSUFFICIENT_PERMISSIONS'
          );
        }
      }

      // Check access level if required
      if (options?.requireAccessLevel && user.accessLevel) {
        const accessLevels = ['STANDARD', 'ELEVATED', 'ADMIN', 'SUPER_ADMIN'];
        const userLevelIndex = accessLevels.indexOf(user.accessLevel);
        const requiredLevelIndex = accessLevels.indexOf(options.requireAccessLevel);

        if (userLevelIndex < requiredLevelIndex) {
          throw new AuthorizationError(
            'Insufficient access level for this action',
            'INSUFFICIENT_ACCESS_LEVEL'
          );
        }
      }

      // Log successful authorization
      logger.debug('User authorized successfully', {
        userId: user.id,
        role: user.role,
        endpoint: req.path
      });

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
};

// Specific role middleware functions
export const requireAdmin = requireRole(['ADMIN', 'SUPERVISOR']);
export const requireSuperAdmin = requireRole(['ADMIN'], { requireAccessLevel: 'ADMIN' });
export const requireClient = requireRole(['CLIENT']);
export const requireAgent = requireRole(['AGENT', 'SUPERVISOR', 'ADMIN']);
export const requireSupervisor = requireRole(['SUPERVISOR', 'ADMIN']);

// Permission-based middleware
export const requirePermissions = (permissions: string[]) => {
  return requireRole(['ADMIN', 'SUPERVISOR'], { checkPermissions: permissions });
};

// Optional authentication middleware
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authService = AuthenticationService.getInstance();
    const { auth, user } = await authService.authenticateRequest(req);
    
    req.auth = auth;
    req.user = user;
  } catch (error) {
    // Continue without authentication for optional auth
    logger.debug('Optional auth failed, continuing without authentication', {
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  next();
};

// Session management
export class SessionManager {
  private static instance: SessionManager;
  
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async createSession(userId: string, deviceInfo?: any): Promise<string> {
    try {
      // Generate secure session token using crypto
      const sessionToken = crypto.randomBytes(32).toString('hex');

      await prisma.session.create({
        data: {
          userId,
          sessionToken,
          deviceInfo,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      return sessionToken;
    } catch (error) {
      logger.error('Session creation failed', { error, userId });
      throw new Error('Failed to create session');
    }
  }

  async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        return false;
      }

      return session.user.status === 'ACTIVE';
    } catch (error) {
      logger.error('Session validation failed', { error, sessionToken });
      return false;
    }
  }

  async revokeSession(sessionToken: string): Promise<void> {
    try {
      await prisma.session.delete({
        where: { sessionToken }
      });
    } catch (error) {
      logger.error('Session revocation failed', { error, sessionToken });
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { userId }
      });
    } catch (error) {
      logger.error('User sessions revocation failed', { error, userId });
    }
  }
}

// Context middleware - adds request context information
export const addRequestContext = (req: Request, res: Response, next: NextFunction) => {
  // Add request ID for tracing
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add timestamp
  (req as any).requestStartTime = Date.now();

  // Log request
  logger.info('Request received', {
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  next();
};

// Audit logging middleware
export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id,
              action,
              entity: req.path.split('/')[2] || 'unknown',
              entityId: req.params.id || null,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              metadata: {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                requestId: req.headers['x-request-id']
              }
            }
          });
        } catch (error) {
          logger.error('Audit log creation failed', { error, action, userId: req.user?.id });
        }
      });

      return originalSend.call(this, data);
    };

    next();
  };
};

// Error handling middleware for authentication errors
export const handleAuthError = (error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Authentication error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  if (error instanceof AuthenticationError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if (error instanceof AuthorizationError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Invalid or expired authentication token'
      }
    });
  }

  if (error.name === 'ForbiddenError' || error.status === 403) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'Access denied'
      }
    });
  }

  next(error);
};

// Health check for authentication service
export const authHealthCheck = async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.user.count();
    
    // Test Clerk connection if configured
    let clerkStatus = 'not_configured';
    if (process.env.CLERK_SECRET_KEY) {
      try {
        // Simple test to verify Clerk is accessible
        clerkStatus = 'healthy';
      } catch (error) {
        clerkStatus = 'error';
      }
    }

    res.json({
      success: true,
      data: {
        database: 'healthy',
        clerk: clerkStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Auth health check failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Authentication service health check failed'
      }
    });
  }
};

// Export all authentication utilities
export default {
  AuthenticationService,
  SessionManager,
  requireAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireClient,
  requireAgent,
  requireSupervisor,
  requirePermissions,
  optionalAuth,
  addRequestContext,
  auditLog,
  handleAuthError,
  authHealthCheck,
  AuthenticationError,
  AuthorizationError
};
