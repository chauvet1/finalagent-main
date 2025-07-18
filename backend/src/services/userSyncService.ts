import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import { logger } from '../utils/logger';

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

export class UserSyncService {
  private static prisma = new PrismaClient();
  private static clerkClient = createClerkClient({ 
    secretKey: process.env.CLERK_SECRET_KEY 
  });

  /**
   * Get user from database or sync from Clerk if not found
   */
  static async getUserWithSync(clerkUserId: string): Promise<AuthenticatedUser | null> {
    try {
      // First try to get user from database
      let user = await this.prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        }
      });

      // If user doesn't exist, try to sync from Clerk
      if (!user) {
        user = await this.syncUserFromClerk(clerkUserId);
      }

      if (!user) {
        return null;
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        logger.warn('User account is not active', { clerkUserId, status: user.status });
        return null;
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
      logger.error('User sync failed', { error, clerkUserId });
      return null;
    }
  }

  /**
   * Sync user from Clerk to local database
   */
  private static async syncUserFromClerk(clerkUserId: string) {
    try {
      // Get user data from Clerk
      const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        logger.warn('User not found in Clerk', { clerkUserId });
        return null;
      }

      // Extract user information
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      const firstName = clerkUser.firstName;
      const lastName = clerkUser.lastName;

      if (!email) {
        logger.warn('User has no email address in Clerk', { clerkUserId });
        return null;
      }

      // Determine user role based on email domain or other criteria
      const role = this.determineUserRole(email);

      // Create user in database
      const user = await this.prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email,
          firstName,
          lastName,
          role,
          status: 'ACTIVE'
        },
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        }
      });

      // Create appropriate profile based on role
      await this.createUserProfile(user.id, role);

      logger.info('User synced from Clerk', { 
        clerkUserId, 
        email, 
        role,
        userId: user.id 
      });

      return user;
    } catch (error) {
      logger.error('Failed to sync user from Clerk', { error, clerkUserId });
      return null;
    }
  }

  /**
   * Determine user role based on email or other criteria
   */
  private static determineUserRole(email: string): UserRole {
    // Admin emails
    if (email.includes('admin@') || email.includes('@bahinlink.com')) {
      return 'ADMIN';
    }

    // Supervisor emails
    if (email.includes('supervisor@') || email.includes('manager@')) {
      return 'SUPERVISOR';
    }

    // Agent emails
    if (email.includes('agent@') || email.includes('guard@')) {
      return 'AGENT';
    }

    // Default to client for external emails
    return 'CLIENT';
  }

  /**
   * Create appropriate user profile based on role
   */
  private static async createUserProfile(userId: string, role: UserRole) {
    try {
      switch (role) {
        case 'ADMIN':
        case 'SUPERVISOR':
          await this.prisma.adminProfile.create({
            data: {
              userId,
              department: 'Security Operations',
              position: role === 'ADMIN' ? 'Administrator' : 'Supervisor',
              permissions: role === 'ADMIN' ? 
                ['USER_MANAGEMENT', 'SYSTEM_CONFIG', 'REPORTS', 'ANALYTICS'] :
                ['AGENT_MANAGEMENT', 'REPORTS', 'MONITORING'],
              accessLevel: role === 'ADMIN' ? 'ADMIN' : 'ELEVATED'
            }
          });
          break;

        case 'AGENT':
          await this.prisma.agentProfile.create({
            data: {
              userId,
              employeeId: `EMP_${Date.now()}`,
              hireDate: new Date(),
              skills: [],
              certifications: []
            }
          });
          break;

        case 'CLIENT':
          await this.prisma.clientProfile.create({
            data: {
              userId,
              serviceLevel: 'STANDARD'
            }
          });
          break;
      }

      logger.info('User profile created', { userId, role });
    } catch (error) {
      logger.error('Failed to create user profile', { error, userId, role });
    }
  }

  /**
   * Update user information from Clerk
   */
  static async updateUserFromClerk(clerkUserId: string): Promise<AuthenticatedUser | null> {
    try {
      const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        return null;
      }

      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      const firstName = clerkUser.firstName;
      const lastName = clerkUser.lastName;

      if (!email) {
        return null;
      }

      // Update user in database
      const user = await this.prisma.user.update({
        where: { clerkId: clerkUserId },
        data: {
          email,
          firstName,
          lastName,
          updatedAt: new Date()
        },
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        }
      });

      logger.info('User updated from Clerk', { clerkUserId, email });

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
      logger.error('Failed to update user from Clerk', { error, clerkUserId });
      return null;
    }
  }

  /**
   * Cleanup inactive users
   */
  static async cleanupInactiveUsers(daysInactive: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await this.prisma.user.updateMany({
        where: {
          status: 'ACTIVE',
          updatedAt: {
            lt: cutoffDate
          }
        },
        data: {
          status: 'INACTIVE'
        }
      });

      logger.info('Inactive users cleaned up', { 
        count: result.count, 
        daysInactive 
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup inactive users', { error });
      return 0;
    }
  }
}