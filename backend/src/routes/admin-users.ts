import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to handle validation errors
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required'
      }
    });
  }
  next();
};

// POST /api/admin-users/invite - Invite a new admin user
router.post('/invite', requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['ADMIN', 'SUPERVISOR']),
  body('firstName').isString().isLength({ min: 1, max: 50 }).trim(),
  body('lastName').isString().isLength({ min: 1, max: 50 }).trim(),
  body('accessLevel').optional().isIn(['STANDARD', 'ELEVATED', 'ADMIN', 'SUPER_ADMIN']),
  body('department').optional().isString().isLength({ max: 100 }).trim(),
  body('position').optional().isString().isLength({ max: 100 }).trim(),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, role, firstName, lastName, accessLevel, department, position } = req.body;
    const invitedBy = req.user.id;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }

    // Create Clerk user invitation
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      publicMetadata: {
        role,
        accessLevel: accessLevel || 'STANDARD',
        invitedBy
      },
      skipPasswordRequirement: true, // User will set password on first login
    });

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        firstName,
        lastName,
        role,
        status: 'ACTIVE'
      }
    });

    // Create admin profile if role is ADMIN or SUPERVISOR
    if (role === 'ADMIN' || role === 'SUPERVISOR') {
      await prisma.adminProfile.create({
        data: {
          userId: user.id,
          department: department || null,
          position: position || null,
          accessLevel: accessLevel || 'STANDARD',
          permissions: getDefaultPermissions(role, accessLevel)
        }
      });
    }

    // Send invitation email through Clerk
    await clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role,
        invitedBy: req.user.email
      }
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status
        },
        message: 'Admin user invited successfully. They will receive an email to complete their registration.'
      }
    });

  } catch (error) {
    console.error('Error inviting admin user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INVITATION_FAILED',
        message: 'Failed to invite admin user'
      }
    });
  }
});

// GET /api/admin-users - Get all admin users
router.get('/', requireAdmin, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['ADMIN', 'SUPERVISOR']),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const where: any = {
      role: {
        in: role ? [role] : ['ADMIN', 'SUPERVISOR']
      }
    };

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          adminProfile: true
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch admin users'
      }
    });
  }
});

// PUT /api/admin-users/:id/role - Update admin user role
router.put('/:id/role', requireAdmin, [
  param('id').isString(),
  body('role').isIn(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT']),
  body('accessLevel').optional().isIn(['STANDARD', 'ELEVATED', 'ADMIN', 'SUPER_ADMIN']),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, accessLevel } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { adminProfile: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    // Update Clerk user metadata
    await clerkClient.users.updateUserMetadata(user.clerkId, {
      publicMetadata: {
        role,
        accessLevel: accessLevel || user.adminProfile?.accessLevel || 'STANDARD'
      }
    });

    // Update or create admin profile
    if (role === 'ADMIN' || role === 'SUPERVISOR') {
      await prisma.adminProfile.upsert({
        where: { userId: id },
        update: {
          accessLevel: accessLevel || 'STANDARD',
          permissions: getDefaultPermissions(role, accessLevel)
        },
        create: {
          userId: id,
          accessLevel: accessLevel || 'STANDARD',
          permissions: getDefaultPermissions(role, accessLevel)
        }
      });
    } else if (user.adminProfile) {
      // Remove admin profile if no longer admin/supervisor
      await prisma.adminProfile.delete({
        where: { userId: id }
      });
    }

    res.json({
      success: true,
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update user role'
      }
    });
  }
});

// Helper function to get default permissions based on role and access level
function getDefaultPermissions(role: string, accessLevel?: string): string[] {
  const basePermissions = {
    ADMIN: [
      'users.read', 'users.write', 'users.delete',
      'sites.read', 'sites.write', 'sites.delete',
      'shifts.read', 'shifts.write', 'shifts.delete',
      'reports.read', 'reports.write',
      'analytics.read',
      'settings.read', 'settings.write'
    ],
    SUPERVISOR: [
      'users.read',
      'sites.read', 'sites.write',
      'shifts.read', 'shifts.write',
      'reports.read', 'reports.write',
      'analytics.read'
    ]
  };

  const permissions = basePermissions[role as keyof typeof basePermissions] || [];

  // Add elevated permissions based on access level
  if (accessLevel === 'SUPER_ADMIN') {
    permissions.push('system.admin', 'audit.read', 'integrations.manage');
  } else if (accessLevel === 'ADMIN') {
    permissions.push('audit.read');
  }

  return permissions;
}

export default router;
