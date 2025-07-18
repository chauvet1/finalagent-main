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

// GET /api/sites - Get all sites with pagination and filtering
router.get('/', [
  requireAuth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED']),
  query('clientId').optional().isUUID(),
  query('search').optional().isString().trim(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const clientId = req.query.clientId as string;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
    };

    if (status) {
      where.status = status;
    }

    // Note: clientId filter disabled due to database schema mismatch
    // if (clientId) {
    //   where.clientId = clientId;
    // }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    console.log('Sites endpoint hit - attempting database query');
    console.log('Query parameters:', { page, limit, status, clientId, search });
    console.log('Where clause:', where);

    // Get sites with pagination - simplified query without client relation due to schema mismatch
    const [sites, total] = await Promise.all([
      prisma.site.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.site.count({ where })
    ]);

    console.log('Database query successful. Found sites:', sites.length);

    res.json({
      success: true,
      data: {
        sites,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch sites',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/sites/:id - Get site by ID
router.get('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('Invalid site ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            billingAddress: true
          }
        },
        shifts: {
          where: {

            startTime: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          },
          include: {
            agent: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: { startTime: 'desc' }
        },
        geofences: true,
        // equipmentList: true, // Field doesn't exist in schema
        reports: {
          where: {

            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30))
            }
          },
          select: {
            id: true,
            type: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found'
        }
      });
    }

    res.json({
      success: true,
      data: { site }
    });
  } catch (error) {
    console.error('Error fetching site:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch site'
      }
    });
  }
});

// POST /api/sites - Create new site
router.post('/', [
  requireAuth,
  requireAdmin,
  body('name').isString().isLength({ min: 1, max: 200 }).trim(),
  body('address').isString().isLength({ min: 1, max: 500 }).trim(),
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('coordinates.latitude').isFloat({ min: -90, max: 90 }),
  body('coordinates.longitude').isFloat({ min: -180, max: 180 }),
  body('description').optional().isString().isLength({ max: 1000 }).trim(),
  body('contactInfo').optional().isObject(),
  body('accessInstructions').optional().isString().isLength({ max: 2000 }).trim(),
  body('emergencyProcedures').optional().isString().isLength({ max: 2000 }).trim(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      address,
      clientId,
      coordinates,
      description,
      contactInfo,
      accessInstructions,
      emergencyProcedures
    } = req.body;

    // Validate that client exists
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    // Create site
    const site = await prisma.site.create({
      data: {
        name,
        address,
        city: address || 'Unknown', // Required field
        country: 'US', // Required field with default
        type: 'OFFICE', // Required field with default
        clientId,
        coordinates,
        description,
        // contactInfo, // Field doesn't exist in schema
        // accessInstructions, // Field doesn't exist in schema
        // emergencyProcedures, // Field doesn't exist in schema
        status: 'ACTIVE'
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { site }
    });
  } catch (error) {
    console.error('Error creating site:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create site'
      }
    });
  }
});

// PUT /api/sites/:id - Update site
router.put('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('Invalid site ID'),
  body('name').optional().isString().isLength({ min: 1, max: 200 }).trim(),
  body('address').optional().isString().isLength({ min: 1, max: 500 }).trim(),
  body('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
  body('description').optional().isString().isLength({ max: 1000 }).trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED']),
  body('contactInfo').optional().isObject(),
  body('accessInstructions').optional().isString().isLength({ max: 2000 }).trim(),
  body('emergencyProcedures').optional().isString().isLength({ max: 2000 }).trim(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id }
    });

    if (!existingSite) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found'
        }
      });
    }

    // Update site
    const site = await prisma.site.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { site }
    });
  } catch (error) {
    console.error('Error updating site:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update site'
      }
    });
  }
});

// DELETE /api/sites/:id - Soft delete site
router.delete('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('Invalid site ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id }
    });

    if (!existingSite) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found'
        }
      });
    }

    // Check for active shifts
    const activeShifts = await prisma.shift.count({
      where: {
        siteId: id,
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        },
        // deletedAt: null // Field doesn't exist in schema
      }
    });

    if (activeShifts > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SITE_HAS_ACTIVE_SHIFTS',
          message: 'Cannot delete site with active shifts'
        }
      });
    }

    // Soft delete site
    await prisma.site.update({
      where: { id },
      data: {
        // deletedAt: new Date(), // Field doesn't exist in schema
        status: 'INACTIVE'
      }
    });

    res.json({
      success: true,
      message: 'Site deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete site'
      }
    });
  }
});

export default router;
