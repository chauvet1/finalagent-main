import { TokenType, EnhancedAuthContext } from '../types/auth';
import { UserRole, UserStatus, PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import { logger } from '../utils/logger';
import { UserSyncService } from './userSyncService';

/**
 * Authenticated user interface
 */
export interface AuthenticatedUser {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: UserStatus;
  permissions?: string[];
  accessLevel?: string;
  authenticationMethod: string;
  profileData?: {
    adminProfile?: any;
    clientProfile?: any;
    agentProfile?: any;
  };
}

/**
 * Authentication strategy interface
 */
export interface AuthenticationStrategy {
  /**
   * Authenticate a token and return user information
   * @param token - The authentication token
   * @returns Promise resolving to authenticated user
   */
  authenticate(token: string): Promise<AuthenticatedUser>;

  /**
   * Check if this strategy can handle the given token type
   * @param tokenType - The type of token to check
   * @returns True if strategy can handle this token type
   */
  canHandle(tokenType: TokenType): boolean;

  /**
   * Get the authentication method name for this strategy
   * @returns The authentication method identifier
   */
  getAuthenticationMethod(): string;
}

/**
 * JWT Authentication Strategy for Clerk tokens
 */
export class JWTAuthenticationStrategy implements AuthenticationStrategy {
  private clerkClient: any;
  private prisma: PrismaClient;

  constructor() {
    this.clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    this.prisma = new PrismaClient();
  }

  canHandle(tokenType: TokenType): boolean {
    return tokenType === TokenType.JWT;
  }

  getAuthenticationMethod(): string {
    return 'jwt';
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    try {
      // Check if we have valid Clerk configuration
      const hasValidClerkConfig = process.env.CLERK_SECRET_KEY &&
                                 process.env.CLERK_SECRET_KEY.startsWith('sk_') &&
                                 process.env.CLERK_SECRET_KEY.length > 20;

      if (!hasValidClerkConfig) {
        throw new Error('Clerk configuration invalid');
      }

      let userId: string;
      let claims: any;

      // Try JWT verification first
      try {
        const { verifyToken } = await import('@clerk/backend');
        const sessionClaims = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!
        });

        userId = sessionClaims.sub;
        claims = sessionClaims;

        logger.debug('JWT token verified successfully', {
          userId: userId.substring(0, 8) + '...',
          tokenLength: token.length
        });
      } catch (jwtError) {
        logger.debug('JWT verification failed, trying direct user lookup', { 
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error' 
        });

        // Fallback to direct user lookup
        const user = await this.clerkClient.users.getUser(token);
        if (!user || !user.id) {
          throw new Error('User not found in Clerk');
        }

        userId = user.id;
        claims = { sub: user.id };
      }

      // Get user from database
      const user = await this.getUserFromDatabase(userId);
      if (!user) {
        // Try to sync user from Clerk if not found
        const syncedUser = await UserSyncService.getUserWithSync(userId);
        if (!syncedUser) {
          throw new Error('User not found in database and sync failed');
        }
        return {
          ...syncedUser,
          authenticationMethod: this.getAuthenticationMethod()
        };
      }

      logger.info('JWT authentication successful', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        ...user,
        authenticationMethod: this.getAuthenticationMethod()
      };
    } catch (error) {
      logger.error('JWT authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenLength: token.length
      });
      throw new Error(`JWT authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getUserFromDatabase(clerkUserId: string): Promise<Omit<AuthenticatedUser, 'authenticationMethod'> | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        }
      });

      if (!user) {
        return null;
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error('User account is not active');
      }

      return {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        status: user.status,
        permissions: user.adminProfile?.permissions || [],
        accessLevel: user.adminProfile?.accessLevel || undefined,
        profileData: {
          adminProfile: user.adminProfile,
          clientProfile: user.clientProfile,
          agentProfile: user.agentProfile
        }
      };
    } catch (error) {
      logger.error('Database user lookup failed', { error, clerkUserId });
      throw error;
    }
  }
}

/**
 * Email Authentication Strategy for email-based authentication
 */
export class EmailAuthenticationStrategy implements AuthenticationStrategy {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  canHandle(tokenType: TokenType): boolean {
    return tokenType === TokenType.EMAIL;
  }

  getAuthenticationMethod(): string {
    return 'email';
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(token)) {
        throw new Error('Invalid email format');
      }

      // Look up user by email
      let user = await this.prisma.user.findUnique({
        where: { email: token },
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        }
      });

      // Create user if not found (development mode)
      if (!user) {
        logger.info('Creating new user for email authentication', { email: token });
        
        user = await this.prisma.user.create({
          data: {
            clerkId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: token,
            firstName: 'Email',
            lastName: 'User',
            role: 'ADMIN', // Default to admin for email auth
            status: 'ACTIVE'
          },
          include: {
            adminProfile: true,
            clientProfile: true,
            agentProfile: true
          }
        });
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error('User account is not active');
      }

      logger.info('Email authentication successful', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        status: user.status,
        permissions: user.adminProfile?.permissions || [],
        accessLevel: user.adminProfile?.accessLevel || undefined,
        authenticationMethod: this.getAuthenticationMethod(),
        profileData: {
          adminProfile: user.adminProfile,
          clientProfile: user.clientProfile,
          agentProfile: user.agentProfile
        }
      };
    } catch (error) {
      logger.error('Email authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: token
      });
      throw new Error(`Email authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Development Authentication Strategy for development tokens
 */
export class DevelopmentAuthenticationStrategy implements AuthenticationStrategy {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Check if we're in development mode
   */
  private isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.NODE_ENV === 'test' ||
           process.env.ENABLE_DEV_AUTH === 'true';
  }

  /**
   * Get development user role based on email domain or configuration
   */
  private getDevelopmentUserRole(email: string): 'ADMIN' | 'CLIENT' | 'AGENT' | 'SUPERVISOR' {
    // Check for specific role indicators in email
    if (email.includes('admin') || email.includes('dev')) {
      return 'ADMIN';
    }
    if (email.includes('client')) {
      return 'CLIENT';
    }
    if (email.includes('agent')) {
      return 'AGENT';
    }
    if (email.includes('supervisor')) {
      return 'SUPERVISOR';
    }
    
    // Default to ADMIN for development
    return 'ADMIN';
  }

  canHandle(tokenType: TokenType): boolean {
    return tokenType === TokenType.DEVELOPMENT;
  }

  getAuthenticationMethod(): string {
    return 'development';
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    try {
      // Check if development authentication is enabled
      if (!this.isDevelopmentMode()) {
        logger.warn('Development authentication attempted in non-development environment', {
          nodeEnv: process.env.NODE_ENV,
          enableDevAuth: process.env.ENABLE_DEV_AUTH
        });
        throw new Error('Development authentication is not enabled in this environment');
      }

      // Extract email from development token (format: "dev:email@domain.com")
      if (!token.startsWith('dev:')) {
        throw new Error('Invalid development token format');
      }

      const email = token.substring(4); // Remove 'dev:' prefix
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format in development token');
      }

      // Determine appropriate role for development user
      const developmentRole = this.getDevelopmentUserRole(email);

      // Look up user by email
      let user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        }
      });

      // Create user if not found
      if (!user) {
        logger.info('Creating new user for development authentication', { 
          email, 
          role: developmentRole,
          developmentMode: true 
        });
        
        user = await this.prisma.user.create({
          data: {
            clerkId: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            email,
            firstName: 'Development',
            lastName: 'User',
            role: developmentRole,
            status: 'ACTIVE'
          },
          include: {
            adminProfile: true,
            clientProfile: true,
            agentProfile: true
          }
        });

        // Create appropriate profile based on role
        if (developmentRole === 'ADMIN' || developmentRole === 'SUPERVISOR') {
          await this.prisma.adminProfile.create({
            data: {
              userId: user.id,
              permissions: ['read', 'write', 'delete', 'admin'],
              accessLevel: developmentRole === 'ADMIN' ? 'ADMIN' : 'ELEVATED',
              department: 'Development',
              position: developmentRole === 'ADMIN' ? 'Development Admin' : 'Development Supervisor'
            }
          });
        } else if (developmentRole === 'CLIENT') {
          await this.prisma.clientProfile.create({
            data: {
              userId: user.id,
              companyName: 'Development Company',
              contactPerson: 'Development Contact'
            }
          });
        } else if (developmentRole === 'AGENT') {
          await this.prisma.agentProfile.create({
            data: {
              userId: user.id,
              employeeId: `DEV-${Date.now()}`,
              hireDate: new Date(),
              skills: ['development', 'testing'],
              certifications: ['Development Certification']
            }
          });
        }

        // Refresh user data with new profiles
        user = await this.prisma.user.findUnique({
          where: { id: user.id },
          include: {
            adminProfile: true,
            clientProfile: true,
            agentProfile: true
          }
        });
      }

      // Check if user is active
      if (user && user.status !== 'ACTIVE') {
        throw new Error('User account is not active');
      }

      if (!user) {
        throw new Error('Failed to create or retrieve development user');
      }

      logger.info('Development authentication successful', {
        userId: user.id,
        email: user.email,
        role: user.role,
        developmentMode: true,
        environment: process.env.NODE_ENV
      });

      return {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        status: user.status,
        permissions: user.adminProfile?.permissions || [],
        accessLevel: user.adminProfile?.accessLevel || undefined,
        authenticationMethod: this.getAuthenticationMethod(),
        profileData: {
          adminProfile: user.adminProfile,
          clientProfile: user.clientProfile,
          agentProfile: user.agentProfile
        }
      };
    } catch (error) {
      logger.error('Development authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token: token.substring(0, 20) + '...',
        developmentMode: this.isDevelopmentMode(),
        environment: process.env.NODE_ENV
      });
      throw new Error(`Development authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Authentication Strategy Factory
 */
export class AuthenticationStrategyFactory {
  private strategies: AuthenticationStrategy[];

  constructor() {
    this.strategies = [
      new JWTAuthenticationStrategy(),
      new EmailAuthenticationStrategy(),
      new DevelopmentAuthenticationStrategy()
    ];
  }

  /**
   * Get the appropriate authentication strategy for a token type
   * @param tokenType - The type of token
   * @returns The authentication strategy or null if none found
   */
  getStrategy(tokenType: TokenType): AuthenticationStrategy | null {
    return this.strategies.find(strategy => strategy.canHandle(tokenType)) || null;
  }

  /**
   * Get all available strategies
   * @returns Array of all authentication strategies
   */
  getAllStrategies(): AuthenticationStrategy[] {
    return [...this.strategies];
  }

  /**
   * Add a custom authentication strategy
   * @param strategy - The strategy to add
   */
  addStrategy(strategy: AuthenticationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove a strategy by authentication method
   * @param authenticationMethod - The method identifier to remove
   */
  removeStrategy(authenticationMethod: string): void {
    this.strategies = this.strategies.filter(
      strategy => strategy.getAuthenticationMethod() !== authenticationMethod
    );
  }
}

/**
 * Singleton factory instance
 */
export const authenticationStrategyFactory = new AuthenticationStrategyFactory();