import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { requireAuth, requireAdmin, requireAgent } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import ReportGenerationService from '../services/reportGenerationService';
import IncidentNotificationService from '../services/incidentNotificationService';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'incidents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `incident-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'));
    }
  }
});

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

// GET /api/incidents - Get incidents with filtering and pagination
router.get('/', [
  requireAuth,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['SECURITY_BREACH', 'THEFT', 'VANDALISM', 'MEDICAL_EMERGENCY', 'FIRE', 'TECHNICAL_ISSUE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_VIOLATION', 'OTHER']),
  query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  query('reportedById').optional().isUUID(),
  query('siteId').optional().isUUID(),
  query('clientId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const severity = req.query.severity as string;
    const status = req.query.status as string;
    const reportedById = req.query.reportedById as string;
    const siteId = req.query.siteId as string;
    const clientId = req.query.clientId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (reportedById) where.reportedById = reportedById;
    if (siteId) where.siteId = siteId;
    if (clientId) where.clientId = clientId;

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate);
      if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    // Get incidents with pagination
    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          reportedBy: {
            include: {
              user: {
                select: {
                  id: true,
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
                  id: true,
                  companyName: true
                }
              }
            }
          },
          client: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true
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
          reports: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: { occurredAt: 'desc' }
      }),
      prisma.incident.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch incidents'
      }
    });
  }
});

// GET /api/incidents/:id - Get incident by ID
router.get('/:id', [
  requireAuth,
  param('id').isUUID().withMessage('Invalid incident ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reportedBy: {
          include: {
            user: {
              select: {
                id: true,
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
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true
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
        reports: {
          include: {
            author: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found'
        }
      });
    }

    res.json({
      success: true,
      data: { incident }
    });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch incident'
      }
    });
  }
});

// POST /api/incidents - Create new incident
router.post('/', [
  requireAuth,
  requireAgent,
], upload.array('evidence', 5), [
  body('title').isString().isLength({ min: 1, max: 200 }).trim(),
  body('description').isString().isLength({ min: 1, max: 5000 }).trim(),
  body('type').isIn(['SECURITY_BREACH', 'THEFT', 'VANDALISM', 'MEDICAL_EMERGENCY', 'FIRE', 'TECHNICAL_ISSUE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_VIOLATION', 'OTHER']),
  body('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  body('siteId').isUUID().withMessage('Valid site ID is required'),
  body('reportedById').optional().isUUID(),
  body('clientId').optional().isUUID(),
  body('shiftId').optional().isUUID(),
  body('location').optional().isString().isLength({ max: 500 }),
  body('occurredAt').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      severity = 'MEDIUM',
      siteId,
      reportedById,
      clientId,
      shiftId,
      location,
      occurredAt
    } = req.body;

    // Validate that site exists
    const site = await prisma.site.findUnique({ 
      where: { id: siteId },
      include: {
        client: true
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

    // Validate agent if provided
    if (reportedById) {
      const agent = await prisma.agentProfile.findUnique({ where: { id: reportedById } });
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Reporting agent not found'
          }
        });
      }
    }

    // Validate shift if provided
    if (shiftId) {
      const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
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

    // Process uploaded files
    const evidenceFiles = req.files as Express.Multer.File[];
    const evidence = evidenceFiles ? evidenceFiles.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    })) : [];

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        type,
        severity,
        siteId,
        reportedById,
        clientId: clientId || site.clientId,
        shiftId,
        location,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        status: 'OPEN',
        evidence: evidence.length > 0 ? evidence : undefined
      },
      include: {
        reportedBy: {
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

    // Send notifications for the incident
    const notificationService = IncidentNotificationService.getInstance();
    await notificationService.notifyIncidentCreated({
      incidentId: incident.id,
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      siteId: incident.siteId,
      siteName: incident.site.name,
      reportedById: incident.reportedById || undefined,
      reportedByName: incident.reportedBy ? 
        `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 
        undefined,
      occurredAt: incident.occurredAt,
      location: incident.location || undefined,
      description: incident.description
    });

    res.status(201).json({
      success: true,
      data: { incident },
      message: 'Incident created successfully'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create incident'
      }
    });
  }
});

// PUT /api/incidents/:id - Update incident
router.put('/:id', [
  requireAuth,
  requireAgent,
  param('id').isUUID().withMessage('Invalid incident ID'),
  body('title').optional().isString().isLength({ min: 1, max: 200 }).trim(),
  body('description').optional().isString().isLength({ min: 1, max: 5000 }).trim(),
  body('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  body('location').optional().isString().isLength({ max: 500 }),
  body('resolvedAt').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if incident exists
    const existingIncident = await prisma.incident.findUnique({
      where: { id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    if (!existingIncident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found'
        }
      });
    }

    // Store old status for notification comparison
    const oldStatus = existingIncident.status;

    // If status is being changed to RESOLVED, set resolvedAt
    if (updateData.status === 'RESOLVED' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    // Update incident
    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        reportedBy: {
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

    // Send notifications for status changes
    const notificationService = IncidentNotificationService.getInstance();
    
    // Handle resolution notification
    if (incident.status === 'RESOLVED' && oldStatus !== 'RESOLVED') {
      await notificationService.notifyIncidentResolved({
        incidentId: incident.id,
        title: incident.title,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        siteId: incident.siteId,
        siteName: incident.site.name,
        reportedById: incident.reportedById || undefined,
        reportedByName: incident.reportedBy ? 
          `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 
          undefined,
        occurredAt: incident.occurredAt,
        location: incident.location || undefined,
        description: incident.description
      });
    }
    
    // Handle general status update notifications
    if (incident.status !== oldStatus) {
      await notificationService.notifyIncidentStatusUpdate({
        incidentId: incident.id,
        title: incident.title,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        siteId: incident.siteId,
        siteName: incident.site.name,
        reportedById: incident.reportedById || undefined,
        reportedByName: incident.reportedBy ? 
          `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 
          undefined,
        occurredAt: incident.occurredAt,
        location: incident.location || undefined,
        description: incident.description
      }, oldStatus, incident.status);
    }

    res.json({
      success: true,
      data: { incident },
      message: 'Incident updated successfully'
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update incident'
      }
    });
  }
});

// POST /api/incidents/:id/escalate - Escalate incident
router.post('/:id/escalate', [
  requireAuth,
  requireAgent,
  param('id').isUUID().withMessage('Invalid incident ID'),
  body('escalationReason').isString().isLength({ min: 1, max: 1000 }).trim(),
  body('escalatedTo').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { escalationReason, escalatedTo } = req.body;

    // Check if incident exists
    const existingIncident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reportedBy: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        site: {
          include: {
            client: true
          }
        }
      }
    });

    if (!existingIncident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found'
        }
      });
    }

    // Update incident severity and status
    const incident = await prisma.incident.update({
      where: { id },
      data: {
        severity: existingIncident.severity === 'CRITICAL' ? 'CRITICAL' : 
                 existingIncident.severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      }
    });

    // Send escalation notifications
    const notificationService = IncidentNotificationService.getInstance();
    await notificationService.notifyIncidentEscalated({
      incidentId: incident.id,
      title: existingIncident.title,
      type: existingIncident.type,
      severity: incident.severity,
      status: incident.status,
      siteId: existingIncident.siteId,
      siteName: existingIncident.site.name,
      reportedById: existingIncident.reportedById || undefined,
      reportedByName: existingIncident.reportedBy ? 
        `${existingIncident.reportedBy.user.firstName} ${existingIncident.reportedBy.user.lastName}` : 
        undefined,
      occurredAt: existingIncident.occurredAt,
      location: existingIncident.location || undefined,
      description: existingIncident.description
    }, escalationReason);

    res.json({
      success: true,
      data: { incident },
      message: 'Incident escalated successfully'
    });
  } catch (error) {
    console.error('Error escalating incident:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to escalate incident'
      }
    });
  }
});

// GET /api/incidents/:id/reports - Get reports related to incident
router.get('/:id/reports', [
  requireAuth,
  param('id').isUUID().withMessage('Invalid incident ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if incident exists
    const incident = await prisma.incident.findUnique({
      where: { id }
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found'
        }
      });
    }

    // Get related reports
    const reports = await prisma.report.findMany({
      where: { incidentId: id },
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { reports },
      totalReports: reports.length
    });
  } catch (error) {
    console.error('Error fetching incident reports:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch incident reports'
      }
    });
  }
});

// POST /api/incidents/reports/generate - Generate incident report
router.post('/reports/generate', [
  requireAuth,
  requireAdmin,
  body('format').isIn(['PDF', 'EXCEL']).withMessage('Format must be PDF or EXCEL'),
  body('type').optional().isIn(['INCIDENT_SUMMARY', 'INCIDENT_DETAILED', 'INCIDENT_ANALYTICS']),
  body('filters').optional().isObject(),
  body('includeEvidence').optional().isBoolean(),
], handleValidationErrors, async (req, res) => {
  try {
    const { format, type = 'INCIDENT_DETAILED', filters, includeEvidence = false } = req.body;

    const reportService = ReportGenerationService.getInstance();
    
    // Parse filters if provided
    const parsedFilters = filters ? {
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      siteId: filters.siteId,
      severity: filters.severity,
      status: filters.status,
      type: filters.type
    } : undefined;

    const reportPath = await reportService.generateIncidentReport({
      format,
      type,
      filters: parsedFilters,
      includeEvidence
    });

    const filename = path.basename(reportPath);
    
    res.json({
      success: true,
      data: {
        filename,
        downloadUrl: `/api/incidents/reports/download/${filename}`,
        generatedAt: new Date().toISOString()
      },
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Error generating incident report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_GENERATION_ERROR',
        message: 'Failed to generate incident report'
      }
    });
  }
});

// GET /api/incidents/reports/download/:filename - Download generated report
router.get('/reports/download/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename'
        }
      });
    }

    const reportService = ReportGenerationService.getInstance();
    const filePath = await reportService.getReportFile(filename);

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report file not found'
        }
      });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    let disposition = 'attachment';

    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FILE_STREAM_ERROR',
            message: 'Error streaming file'
          }
        });
      }
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download report'
      }
    });
  }
});

// GET /api/incidents/stats - Get incident statistics
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get incident counts
    const [
      totalIncidents,
      openIncidents,
      inProgressIncidents,
      resolvedIncidents,
      incidentsToday,
      incidentsThisWeek,
      incidentsThisMonth,
      criticalIncidents,
      highSeverityIncidents
    ] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { status: 'OPEN' } }),
      prisma.incident.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.incident.count({ where: { status: 'RESOLVED' } }),
      prisma.incident.count({ where: { occurredAt: { gte: today } } }),
      prisma.incident.count({ where: { occurredAt: { gte: thisWeek } } }),
      prisma.incident.count({ where: { occurredAt: { gte: thisMonth } } }),
      prisma.incident.count({ where: { severity: 'CRITICAL' } }),
      prisma.incident.count({ where: { severity: 'HIGH' } })
    ]);

    // Get incident types breakdown
    const incidentTypes = await prisma.incident.groupBy({
      by: ['type'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    // Calculate average resolution time
    const resolvedIncidentsWithTime = await prisma.incident.findMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { not: null }
      },
      select: {
        occurredAt: true,
        resolvedAt: true
      }
    });

    let averageResolutionTime = 0;
    if (resolvedIncidentsWithTime.length > 0) {
      const totalResolutionTime = resolvedIncidentsWithTime.reduce((sum, incident) => {
        const resolutionTime = new Date(incident.resolvedAt!).getTime() - new Date(incident.occurredAt).getTime();
        return sum + resolutionTime;
      }, 0);
      averageResolutionTime = Math.round(totalResolutionTime / resolvedIncidentsWithTime.length / (1000 * 60 * 60)); // in hours
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalIncidents,
          openIncidents,
          inProgressIncidents,
          resolvedIncidents,
          incidentsToday,
          incidentsThisWeek,
          incidentsThisMonth,
          criticalIncidents,
          highSeverityIncidents,
          averageResolutionTime
        },
        breakdown: {
          byType: incidentTypes.map(type => ({
            type: type.type,
            count: type._count.id
          })),
          bySeverity: [
            { severity: 'LOW', count: await prisma.incident.count({ where: { severity: 'LOW' } }) },
            { severity: 'MEDIUM', count: await prisma.incident.count({ where: { severity: 'MEDIUM' } }) },
            { severity: 'HIGH', count: await prisma.incident.count({ where: { severity: 'HIGH' } }) },
            { severity: 'CRITICAL', count: await prisma.incident.count({ where: { severity: 'CRITICAL' } }) }
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error fetching incident statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch incident statistics'
      }
    });
  }
});

export default router;