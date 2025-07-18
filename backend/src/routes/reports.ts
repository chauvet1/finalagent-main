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

// GET /api/reports - Get reports with filtering and pagination
router.get('/', [
  requireAuth,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['PATROL', 'INCIDENT', 'INSPECTION', 'MAINTENANCE', 'EMERGENCY']),
  query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']),
  query('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  query('agentId').optional().isUUID(),
  query('siteId').optional().isUUID(),
  query('shiftId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const agentId = req.query.agentId as string;
    const siteId = req.query.siteId as string;
    const shiftId = req.query.shiftId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // deletedAt: null // Field doesn't exist in schema
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (agentId) where.agentId = agentId;
    if (siteId) where.siteId = siteId;
    if (shiftId) where.shiftId = shiftId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          author: {
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
              client: {
                select: {
                  companyName: true
                }
              }
            }
          },
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true
            }
          },
          // reviewer: { // Field doesn't exist in schema
          //   select: {
          //     firstName: true,
          //     lastName: true
          //   }
          // },
          // mediaFiles: { // Field doesn't exist in schema
          //   select: {
          //     id: true,
          //     filename: true,
          //     fileType: true,
          //     fileSize: true
          //   }
          // },
          // _count: {
          //   select: {
          //     mediaFiles: true
          //   }
          // }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.report.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reports'
      }
    });
  }
});

// GET /api/reports/:id - Get report by ID
router.get('/:id', [
  requireAuth,
  param('id').isUUID().withMessage('Invalid report ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        author: {
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
                companyName: true,
                contactPerson: true
              }
            }
          }
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true
          }
        },
        // reviewer: { // Field doesn't exist in schema
        //   select: {
        //     id: true,
        //     firstName: true,
        //     lastName: true,
        //     email: true
        //   }
        // },
        // mediaFiles: true, // Field doesn't exist in schema
        // template: { // Field doesn't exist in schema
        //   select: {
        //     id: true,
        //     name: true,
        //     fields: true
        //   }
        // }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch report'
      }
    });
  }
});

// POST /api/reports - Create new report
router.post('/', [
  requireAuth,
  requireAgent,
  body('type').isIn(['PATROL', 'INCIDENT', 'INSPECTION', 'MAINTENANCE', 'EMERGENCY']),
  body('title').isString().isLength({ min: 1, max: 200 }).trim(),
  body('content').isString().isLength({ min: 1, max: 10000 }).trim(),
  body('agentId').isUUID().withMessage('Valid agent ID is required'),
  body('siteId').isUUID().withMessage('Valid site ID is required'),
  body('shiftId').optional().isUUID(),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  body('location').optional().isObject(),
  body('templateId').optional().isUUID(),
  body('formData').optional().isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      type,
      title,
      content,
      agentId,
      siteId,
      shiftId,
      priority = 'NORMAL',
      location,
      templateId,
      formData
    } = req.body;

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

    // Validate shift if provided
    if (shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId }
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
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        type,
        title,
        content,
        authorId: agentId,
        siteId,
        shiftId,
        priority,
        // location, // Field doesn't exist in schema
        // templateId, // Field doesn't exist in schema
        // formData, // Field doesn't exist in schema
        status: 'DRAFT',
        reportDate: new Date() // Required field
      },
      include: {
        author: {
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
      data: { report }
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create report'
      }
    });
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', [
  requireAuth,
  requireAgent,
  param('id').isUUID().withMessage('Invalid report ID'),
  body('title').optional().isString().isLength({ min: 1, max: 200 }).trim(),
  body('content').optional().isString().isLength({ min: 1, max: 10000 }).trim(),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  body('status').optional().isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']),
  body('reviewNotes').optional().isString().isLength({ max: 2000 }).trim(),
  body('formData').optional().isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if report exists
    const existingReport = await prisma.report.findUnique({
      where: { id }
    });

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    // Update report
    const report = await prisma.report.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        author: {
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
      data: { report }
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update report'
      }
    });
  }
});

// POST /api/reports/:id/submit - Submit report for review
router.post('/:id/submit', [
  requireAuth,
  requireAgent,
  param('id').isUUID().withMessage('Invalid report ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if report exists and is in draft status
    const existingReport = await prisma.report.findUnique({
      where: { id }
    });

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    if (existingReport.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only draft reports can be submitted'
        }
      });
    }

    // Update report status
    const report = await prisma.report.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: { report },
      message: 'Report submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to submit report'
      }
    });
  }
});

export default router;
