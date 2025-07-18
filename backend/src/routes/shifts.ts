import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin, requireAgent } from '../middleware/auth';

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

// GET /api/shifts - Get shifts with filtering and pagination
router.get('/', requireAuth, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  query('agentId').optional().isUUID(),
  query('siteId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const agentId = req.query.agentId as string;
    const siteId = req.query.siteId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // deletedAt: null // Field doesn't exist in schema
    };

    if (status) {
      where.status = status;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (siteId) {
      where.siteId = siteId;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    // Get shifts with pagination
    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          agent: {
            select: {
              id: true,
              employeeId: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          site: {
            select: {
              id: true,
              name: true,
              address: true,
              coordinates: true
            }
          },
          // supervisor: { // Commented out as this relation doesn't exist in current schema
          //   select: {
          //     id: true,
          //     user: {
          //       select: {
          //         firstName: true,
          //         lastName: true
          //       }
          //     }
          //   }
          // },
          // attendanceRecords: { // Field doesn't exist in schema
          //   select: {
          //     id: true,
          //     clockInTime: true,
          //     clockOutTime: true,
          //     status: true,
          //     method: true
          //   }
          // }
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.shift.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        shifts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch shifts'
      }
    });
  }
});

// GET /api/shifts/:id - Get shift by ID
router.get('/:id', requireAuth, [
  param('id').isUUID().withMessage('Invalid shift ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        agent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        site: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true
              }
            }
          }
        },
        // supervisor: { // Field doesn't exist in schema
        //   include: {
        //     user: {
        //       select: {
        //         firstName: true,
        //         lastName: true,
        //         email: true
        //       }
        //     }
        //   }
        // },
        // attendanceRecords: true, // Field doesn't exist in schema
        reports: {
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true
          }
        }
      }
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHIFT_NOT_FOUND',
          message: 'Shift not found'
        }
      });
    }

    res.json({
      success: true,
      data: { shift }
    });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch shift'
      }
    });
  }
});

// POST /api/shifts - Create new shift
router.post('/', requireAuth, requireAdmin, [
  body('agentId').isUUID().withMessage('Valid agent ID is required'),
  body('siteId').isUUID().withMessage('Valid site ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('type').optional().isIn(['REGULAR', 'OVERTIME', 'EMERGENCY', 'TRAINING']),
  body('supervisorId').optional().isUUID(),
  body('instructions').optional().isString().isLength({ max: 1000 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { agentId, siteId, startTime, endTime, type = 'REGULAR', supervisorId, instructions } = req.body;

    // Validate that agent and site exist
    const [agent, site] = await Promise.all([
      prisma.agentProfile.findUnique({ where: { id: agentId } }),
      prisma.site.findUnique({ where: { id: siteId } })
    ]);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found'
        }
      });
    }

    if (!site) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SITE_NOT_FOUND',
          message: 'Site not found'
        }
      });
    }

    // Check for scheduling conflicts
    const conflictingShift = await prisma.shift.findFirst({
      where: {
        agentId,

        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        },
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } }
            ]
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } }
            ]
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } }
            ]
          }
        ]
      }
    });

    if (conflictingShift) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SCHEDULING_CONFLICT',
          message: 'Agent already has a shift scheduled during this time'
        }
      });
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        agentId,
        siteId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type,
        // supervisorId, // Field doesn't exist in schema
        // instructions, // Field doesn't exist in schema
        status: 'SCHEDULED'
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        site: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { shift }
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create shift'
      }
    });
  }
});

// PUT /api/shifts/:id - Update shift
router.put('/:id', requireAuth, requireAdmin, [
  param('id').isUUID().withMessage('Invalid shift ID'),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  body('instructions').optional().isString().isLength({ max: 1000 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, status, instructions } = req.body;

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id }
    });

    if (!existingShift) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHIFT_NOT_FOUND',
          message: 'Shift not found'
        }
      });
    }

    // Update shift
    const shift = await prisma.shift.update({
      where: { id },
      data: {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(status && { status }),
        ...(instructions && { instructions }),
        updatedAt: new Date()
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        site: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { shift }
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update shift'
      }
    });
  }
});

// DELETE /api/shifts/:id - Delete shift
router.delete('/:id', requireAuth, requireAdmin, [
  param('id').isUUID().withMessage('Invalid shift ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id },
      include: {
        attendance: true,
        reports: true,
        incidents: true
      }
    });

    if (!existingShift) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHIFT_NOT_FOUND',
          message: 'Shift not found'
        }
      });
    }

    // Check if shift can be deleted (no attendance records, reports, or incidents)
    if (existingShift.attendance.length > 0 || existingShift.reports.length > 0 || existingShift.incidents.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SHIFT_HAS_DEPENDENCIES',
          message: 'Cannot delete shift with existing attendance records, reports, or incidents'
        }
      });
    }

    // Delete the shift
    await prisma.shift.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete shift'
      }
    });
  }
});

export default router;
     
