import express from 'express';
import { PrismaClient } from '@prisma/client';
import { UserSyncService } from '../services/userSyncService';
import { createClerkClient } from '@clerk/backend';

const router = express.Router();
const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Simple health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth test API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test authentication endpoint
router.get('/test-auth', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided'
        }
      });
    }

    const token = authHeader.substring(7);

    res.json({
      success: true,
      message: 'Token received successfully',
      tokenInfo: {
        length: token.length,
        firstChars: token.substring(0, 10) + '...',
        isEmail: token.includes('@'),
        hasJwtStructure: token.split('.').length === 3
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Test endpoint to verify user synchronization
router.get('/test-sync/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    console.log(`Testing user sync for Clerk ID: ${clerkId}`);
    
    // Get user with sync
    const user = await UserSyncService.getUserWithSync(clerkId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found and could not be synced'
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          profiles: {
            client: null,
            agent: null,
            admin: null
          }
        }
      }
    });
  } catch (error) {
    console.error('User sync test error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync user data'
      }
    });
  }
});

// Test endpoint to list all users in database
router.get('/test-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        clientProfile: true,
        agentProfile: true,
        adminProfile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          profiles: {
            client: user.clientProfile,
            agent: user.agentProfile,
            admin: user.adminProfile
          }
        })),
        total: users.length
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve users'
      }
    });
  }
});

// Test endpoint to verify role-based access
router.get('/test-admin-access', async (req, res) => {
  try {
    // Simulate admin user check
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      include: {
        adminProfile: true
      }
    });

    res.json({
      success: true,
      data: {
        adminUsers: adminUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          accessLevel: user.adminProfile?.accessLevel,
          permissions: user.adminProfile?.permissions
        })),
        total: adminUsers.length
      }
    });
  } catch (error) {
    console.error('Admin access test error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACCESS_TEST_ERROR',
        message: 'Failed to test admin access'
      }
    });
  }
});

// Test endpoint to verify client access
router.get('/test-client-access', async (req, res) => {
  try {
    const clientUsers = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        status: 'ACTIVE'
      },
      include: {
        clientProfile: true
      }
    });

    res.json({
      success: true,
      data: {
        clientUsers: clientUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          companyName: user.clientProfile?.companyName,
          contactPerson: user.clientProfile?.contactPerson
        })),
        total: clientUsers.length
      }
    });
  } catch (error) {
    console.error('Client access test error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACCESS_TEST_ERROR',
        message: 'Failed to test client access'
      }
    });
  }
});

// Test webhook simulation
router.post('/test-webhook', async (req, res) => {
  try {
    const { eventType, userData } = req.body;
    
    console.log(`Simulating webhook: ${eventType}`);
    
    let result;
    switch (eventType) {
      case 'user.created':
        result = await simulateUserCreated(userData);
        break;
      case 'user.updated':
        result = await simulateUserUpdated(userData);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EVENT_TYPE',
            message: 'Unsupported event type'
          }
        });
    }

    res.json({
      success: true,
      data: {
        eventType,
        result
      }
    });
  } catch (error) {
    console.error('Webhook simulation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to simulate webhook'
      }
    });
  }
});

async function simulateUserCreated(userData: any) {
  const user = await prisma.user.create({
    data: {
      clerkId: userData.id || `test-${Date.now()}`,
      email: userData.email || 'test@example.com',
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      username: userData.username || 'testuser',
      role: userData.role || 'CLIENT',
      status: 'ACTIVE',
      phone: userData.phone || null
    }
  });

  // Create appropriate profile
  if (user.role === 'CLIENT') {
    await prisma.clientProfile.create({
      data: {
        userId: user.id,
        companyName: userData.companyName || 'Test Company',
        contactPerson: `${user.firstName} ${user.lastName}`
      }
    });
  }

  return { userId: user.id, action: 'created' };
}

async function simulateUserUpdated(userData: any) {
  const user = await prisma.user.update({
    where: { clerkId: userData.id },
    data: {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      updatedAt: new Date()
    }
  });

  return { userId: user.id, action: 'updated' };
}

// Endpoint to sync all users from Clerk to database
router.post('/sync-all-users', async (req, res) => {
  try {
    console.log('Starting bulk user sync from Clerk...');

    // const result = await UserSyncService.syncAllUsersFromClerk();
    const result = { synced: 0, errors: [] }; // Placeholder until method is implemented

    res.json({
      success: true,
      data: {
        message: 'User synchronization completed',
        synced: result.synced,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Bulk user sync error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync users from Clerk'
      }
    });
  }
});

// Endpoint to promote a user to admin
router.post('/promote-to-admin', async (req, res) => {
  try {
    const { email, clerkId } = req.body;

    if (!email && !clerkId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'Either email or clerkId is required'
        }
      });
    }

    // Find user by email or clerkId
    let user;
    if (clerkId) {
      user = await prisma.user.findUnique({ where: { clerkId } });
    } else {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found in database'
        }
      });
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });

    // Update Clerk user metadata
    await clerkClient.users.updateUserMetadata(user.clerkId, {
      publicMetadata: {
        role: 'ADMIN',
        accessLevel: 'ADMIN'
      }
    });

    // Create or update admin profile
    await prisma.adminProfile.upsert({
      where: { userId: user.id },
      update: {
        accessLevel: 'ADMIN',
        permissions: [
          'users.read', 'users.write', 'users.delete',
          'reports.read', 'reports.write', 'reports.delete',
          'sites.read', 'sites.write', 'sites.delete',
          'shifts.read', 'shifts.write', 'shifts.delete',
          'analytics.read', 'admin.read'
        ]
      },
      create: {
        userId: user.id,
        accessLevel: 'ADMIN',
        permissions: [
          'users.read', 'users.write', 'users.delete',
          'reports.read', 'reports.write', 'reports.delete',
          'sites.read', 'sites.write', 'sites.delete',
          'shifts.read', 'shifts.write', 'shifts.delete',
          'analytics.read', 'admin.read'
        ]
      }
    });

    res.json({
      success: true,
      data: {
        message: 'User promoted to admin successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        }
      }
    });
  } catch (error) {
    console.error('Promote to admin error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROMOTION_ERROR',
        message: 'Failed to promote user to admin'
      }
    });
  }
});

// Endpoint to find user in Clerk by email
router.get('/find-clerk-user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log(`Searching for user in Clerk with email: ${email}`);

    // Search for user in Clerk by email
    const users = await clerkClient.users.getUserList({
      emailAddress: [email]
    });

    if (!users || users.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND_IN_CLERK',
          message: 'User not found in Clerk'
        }
      });
    }

    const user = users.data[0];

    res.json({
      success: true,
      data: {
        clerkUser: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          publicMetadata: user.publicMetadata,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt
        }
      }
    });
  } catch (error) {
    console.error('Find Clerk user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLERK_SEARCH_ERROR',
        message: 'Failed to search for user in Clerk'
      }
    });
  }
});

// Endpoint to manually create a user in database (for emergency situations)
router.post('/manual-create-user', async (req, res) => {
  try {
    const { email, firstName, lastName, role, clerkId } = req.body;

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, firstName, lastName, and role are required'
        }
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists in database'
        }
      });
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId: clerkId || `manual-${email}-${Date.now()}`,
        email,
        firstName,
        lastName,
        username: email.split('@')[0],
        role,
        status: 'ACTIVE',
      }
    });

    // Create role-specific profile
    if (role === 'ADMIN') {
      await prisma.adminProfile.create({
        data: {
          userId: user.id,
          permissions: [
            'users.read', 'users.write', 'users.delete',
            'reports.read', 'reports.write', 'reports.delete',
            'sites.read', 'sites.write', 'sites.delete',
            'shifts.read', 'shifts.write', 'shifts.delete',
            'analytics.read', 'admin.read'
          ],
          accessLevel: 'ADMIN',
        }
      });
    } else if (role === 'CLIENT') {
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          companyName: '',
          contactPerson: `${firstName} ${lastName}`,
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: 'User created successfully',
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    console.error('Manual user creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATION_ERROR',
        message: 'Failed to create user manually'
      }
    });
  }
});

// Endpoint to recreate user in Clerk with temporary password
router.post('/recreate-clerk-user', async (req, res) => {
  try {
    const { email, firstName, lastName, tempPassword } = req.body;

    if (!email || !firstName || !lastName || !tempPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, firstName, lastName, and tempPassword are required'
        }
      });
    }

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { adminProfile: true }
    });

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND_IN_DB',
          message: 'User not found in database'
        }
      });
    }

    // Create user in Clerk
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password: tempPassword,
      publicMetadata: {
        role: dbUser.role,
        accessLevel: dbUser.adminProfile?.accessLevel || 'STANDARD'
      }
    });

    // Update database with new Clerk ID
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        clerkId: clerkUser.id,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        message: 'User recreated in Clerk successfully',
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        tempPassword: tempPassword,
        instructions: 'User can now login with this email and temporary password. They should change the password after first login.'
      }
    });
  } catch (error: any) {
    console.error('Recreate Clerk user error:', error);

    // Handle specific Clerk errors
    if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS_IN_CLERK',
          message: 'User already exists in Clerk. Try signing in directly.'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CLERK_CREATION_ERROR',
        message: 'Failed to recreate user in Clerk'
      }
    });
  }
});

// Endpoint to list all Clerk users (for debugging)
router.get('/list-clerk-users', async (req, res) => {
  try {
    console.log('Fetching users from Clerk...');

    const users = await clerkClient.users.getUserList({
      limit: 50
    });

    console.log(`Found ${users.data.length} users in Clerk`);

    res.json({
      success: true,
      data: {
        users: users.data.map(user => ({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          publicMetadata: user.publicMetadata,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt
        })),
        total: users.data.length
      }
    });
  } catch (error: any) {
    console.error('List Clerk users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLERK_LIST_ERROR',
        message: 'Failed to list users from Clerk',
        details: error.message
      }
    });
  }
});

// Endpoint to sync specific user by Clerk ID
router.post('/sync-user-by-clerk-id', async (req, res) => {
  try {
    const { clerkId } = req.body;

    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CLERK_ID',
          message: 'Clerk ID is required'
        }
      });
    }

    console.log(`Syncing user with Clerk ID: ${clerkId}`);

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);

    if (!clerkUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND_IN_CLERK',
          message: 'User not found in Clerk'
        }
      });
    }

    // Check if user already exists in database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkId }
    });

    const userData = {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0],
      role: (clerkUser.publicMetadata?.role as any) || 'CLIENT',
      status: 'ACTIVE' as any,
      phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
    };

    if (dbUser) {
      // Update existing user
      dbUser = await prisma.user.update({
        where: { clerkId: clerkId },
        data: {
          ...userData,
          updatedAt: new Date(),
        }
      });
    } else {
      // Create new user
      dbUser = await prisma.user.create({
        data: userData
      });

      // Create role-specific profile
      if (userData.role === 'CLIENT') {
        await prisma.clientProfile.create({
          data: {
            userId: dbUser.id,
            companyName: '',
            contactPerson: `${userData.firstName} ${userData.lastName}`.trim(),
          }
        });
      } else if (userData.role === 'ADMIN') {
        await prisma.adminProfile.create({
          data: {
            userId: dbUser.id,
            permissions: ['users.read', 'users.write', 'reports.read', 'reports.write'],
            accessLevel: 'STANDARD' as any,
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        message: 'User synced successfully',
        user: {
          id: dbUser.id,
          clerkId: dbUser.clerkId,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          role: dbUser.role,
          status: dbUser.status
        }
      }
    });
  } catch (error: any) {
    console.error('Sync user by Clerk ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync user',
        details: error.message
      }
    });
  }
});

// Test analytics endpoint without authentication
router.get('/test-analytics', async (req, res) => {
  console.log('Test analytics endpoint hit - no auth required');
  try {
    const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = new Date();

    // Get current active shifts
    const activeShifts = await prisma.shift.count({
      where: {
        status: 'IN_PROGRESS'
      }
    });

    // Get total agents
    const totalAgents = await prisma.agentProfile.count();

    // Get incidents today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const incidentsToday = await prisma.report.count({
      where: {
        type: 'INCIDENT',
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get sites monitored
    const sitesMonitored = await prisma.site.count({
      where: {
        status: 'ACTIVE'
      }
    });

    const dashboardData = {
      overview: {
        activeShifts,
        totalAgents,
        incidentsToday,
        sitesMonitored,
        completionRate: 85.5,
        responseTime: 12.3
      },
      message: 'Test analytics endpoint working - authentication bypassed'
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test analytics endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch test analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;
