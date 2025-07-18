import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth';

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

// GET /api/users - Get all users with pagination and filtering
router.get('/', [
  requireAuth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT']),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
  query('search').optional().isString().trim(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // deletedAt: null // Field doesn't exist in schema
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        select: {
          id: true,
          // username: true, // Field exists but not in select
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          // phone: true, // Field exists but not in select
          // lastLoginAt: true, // Field doesn't exist in schema
          createdAt: true,
          updatedAt: true,
          agentProfile: {
            select: {
              id: true,
              employeeId: true,
              // employmentStatus: true // Field doesn't exist in schema
            }
          },
          clientProfile: {
            select: {
              id: true,
              companyName: true,
              // status: true // Field doesn't exist in schema
            }
          }
        },
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
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users'
      }
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('Invalid user ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        // username: true, // Field exists but not in select
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        // phone: true, // Field exists but not in select
        // profile: true, // Field doesn't exist in schema
        // preferences: true, // Field doesn't exist in schema
        // lastLoginAt: true, // Field doesn't exist in schema
        // twoFactorEnabled: true, // Field doesn't exist in schema
        createdAt: true,
        updatedAt: true,
        agentProfile: {
          select: {
            id: true,
            employeeId: true,
            hireDate: true,
            // employmentStatus: true, // Field doesn't exist in schema
            skills: true,
            certifications: true,
            emergencyContact: true,
            // performanceMetrics: true // Field doesn't exist in schema
          }
        },
        clientProfile: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            // billingAddress: true, // Field exists but not in select
            // status: true, // Field doesn't exist in schema
            // contractStartDate: true, // Field doesn't exist in schema
            // contractEndDate: true // Field doesn't exist in schema
          }
        }
      }
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

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user'
      }
    });
  }
});

// POST /api/users - Create new user (Admin creates user, then they complete Clerk signup)
router.post('/', [
  requireAuth,
  requireAdmin,
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT']),
  body('firstName').optional().isString().isLength({ max: 50 }).trim(),
  body('lastName').optional().isString().isLength({ max: 50 }).trim(),
  body('clerkId').optional().isString().trim(), // For existing Clerk users
], handleValidationErrors, async (req, res) => {
  try {
    const { email, role, firstName, lastName, clerkId } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(clerkId ? [{ clerkId }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or Clerk ID already exists'
        }
      });
    }

    // Create user record (Clerk user creation happens separately)
    const user = await prisma.user.create({
      data: {
        clerkId: clerkId || `pending_${Date.now()}`, // Temporary ID until Clerk signup
        email,
        role,
        firstName,
        lastName,
        status: clerkId ? 'ACTIVE' : 'INACTIVE' // Active if Clerk user exists, inactive if pending
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user'
      }
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('Invalid user ID'),
  body('firstName').optional().isString().isLength({ max: 50 }).trim(),
  body('lastName').optional().isString().isLength({ max: 50 }).trim(),
  body('phone').optional().isString().isLength({ max: 20 }).trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, status } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        // phone, // Field exists but not in update
        status,
        updatedAt: new Date()
      },
      select: {
        id: true,
        // username: true, // Field exists but not in select
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        // phone: true, // Field exists but not in select
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user'
      }
    });
  }
});

// DELETE /api/users/:id - Soft delete user
router.delete('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('Invalid user ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        // deletedAt: new Date(), // Field doesn't exist in schema
        status: 'INACTIVE'
      }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user'
      }
    });
  }
});

export default router;
