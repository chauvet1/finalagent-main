const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserRepository extends BaseRepository {
  constructor(prisma) {
    super(prisma, 'user');
  }

  /**
   * Find user by email with security considerations
   */
  async findByEmail(email) {
    try {
      return await this.model.findUnique({
        where: { 
          email: email.toLowerCase(),
          deletedAt: null
        },
        include: {
          agent: true,
          client: true
        }
      });
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    try {
      return await this.model.findUnique({
        where: { 
          username,
          deletedAt: null
        },
        include: {
          agent: true,
          client: true
        }
      });
    } catch (error) {
      throw new Error(`Failed to find user by username: ${error.message}`);
    }
  }

  /**
   * Create user with password hashing
   */
  async createUser(userData) {
    try {
      const { password, ...userInfo } = userData;
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Normalize email
      const normalizedEmail = userInfo.email.toLowerCase();
      
      return await this.create({
        ...userInfo,
        email: normalizedEmail,
        passwordHash,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('User with this email or username already exists');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Authenticate user
   */
  async authenticate(identifier, password) {
    try {
      // Find user by email or username
      const user = await this.model.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ],
          deletedAt: null,
          status: 'ACTIVE'
        },
        include: {
          agent: true,
          client: true
        }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await this.update(user.id, {
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });

      // Remove sensitive data
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Update password
   */
  async updatePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      return await this.update(userId, {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Get users with role-based filtering
   */
  async findByRole(role, options = {}) {
    try {
      return await this.findMany({
        ...options,
        where: {
          role,
          deletedAt: null,
          ...options.where
        },
        include: {
          agent: role === 'AGENT',
          client: role === 'CLIENT',
          ...options.include
        }
      });
    } catch (error) {
      throw new Error(`Failed to find users by role: ${error.message}`);
    }
  }

  /**
   * Get active users with last activity
   */
  async getActiveUsers(timeframe = '24h') {
    try {
      const timeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeMap[timeframe] || 24;
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await this.findMany({
        where: {
          lastLoginAt: {
            gte: cutoffTime
          },
          deletedAt: null,
          status: 'ACTIVE'
        },
        orderBy: {
          lastLoginAt: 'desc'
        }
      });
    } catch (error) {
      throw new Error(`Failed to get active users: ${error.message}`);
    }
  }

  /**
   * Soft delete user
   */
  async softDelete(userId) {
    try {
      return await this.update(userId, {
        deletedAt: new Date(),
        status: 'INACTIVE',
        updatedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Restore soft deleted user
   */
  async restore(userId) {
    try {
      return await this.update(userId, {
        deletedAt: null,
        status: 'ACTIVE',
        updatedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to restore user: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const stats = await this.aggregate({
        where: {
          deletedAt: null
        },
        _count: {
          id: true
        }
      });

      const roleStats = await this.groupBy({
        by: ['role'],
        where: {
          deletedAt: null
        },
        _count: {
          id: true
        }
      });

      const statusStats = await this.groupBy({
        by: ['status'],
        where: {
          deletedAt: null
        },
        _count: {
          id: true
        }
      });

      return {
        total: stats._count.id,
        byRole: roleStats.reduce((acc, item) => {
          acc[item.role] = item._count.id;
          return acc;
        }, {}),
        byStatus: statusStats.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {})
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }
}

module.exports = UserRepository;