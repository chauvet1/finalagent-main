import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { requireAuth, requireClient } from '../middleware/auth';

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

// GET /api/client-portal/dashboard - Get client dashboard data
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.clientProfile.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { user: { email: user.email } }
          ]
        }
      });
      
      if (!client) {
        // Create a default client for development
        const defaultClient = await prisma.clientProfile.create({
          data: {
            userId: user.id || user.email, // Use user ID or email as fallback
            contactEmail: user.email,
            contactPhone: '555-0123',
            address: {
              street: '123 Demo Street',
              city: 'Demo City',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            }
          }
        });
        clientId = defaultClient.id;
      } else {
        clientId = client.id;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get client's sites
    const sites = await prisma.site.findMany({
      where: {
        clientId: clientId,

      },
      select: {
        id: true,
        name: true,
        status: true
      }
    });

    const siteIds = sites.map(site => site.id);

    // Get active shifts for client's sites
    const activeShifts = await prisma.shift.count({
      where: {
        siteId: { in: siteIds },
        status: 'IN_PROGRESS',

      }
    });

    // Get today's incidents
    const incidentsToday = await prisma.report.count({
      where: {
        siteId: { in: siteIds },
        type: 'INCIDENT',
        createdAt: {
          gte: today,
          lt: tomorrow
        },

      }
    });

    // Get pending service requests
    const pendingRequests = await prisma.clientRequest.count({
      where: {
        clientId: clientId,
        status: {
          in: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS']
        },

      }
    });

    // Get recent reports
    const recentReports = await prisma.report.findMany({
      where: {
        siteId: { in: siteIds },

      },
      include: {
        author: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        site: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    res.json({
      success: true,
      data: {
        overview: {
          activeSites: sites.filter(site => site.status === 'ACTIVE').length,
          activeShifts,
          incidentsToday,
          pendingRequests
        },
        recentReports: recentReports.map(report => ({
          id: report.id,
          type: report.type,
          title: report.title,
          // priority: report.priority || 'NORMAL', // Field doesn't exist
          status: report.status,
          agentName: `${report.author.user.firstName} ${report.author.user.lastName}`,
          siteName: report.site?.name || 'Unknown Site',
          createdAt: report.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching client dashboard:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard data'
      }
    });
  }
});

// GET /api/client-portal/reports - Get client's reports
router.get('/reports', [
  requireAuth,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['PATROL', 'INCIDENT', 'INSPECTION', 'MAINTENANCE', 'EMERGENCY']),
  query('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  query('siteId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const priority = req.query.priority as string;
    const siteId = req.query.siteId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = (page - 1) * limit;

    // Get client's sites
    const clientSites = await prisma.site.findMany({
      where: {
        clientId: clientId,

      },
      select: { id: true }
    });

    const siteIds = clientSites.map(site => site.id);

    // Build where clause
    const where: any = {
      siteId: { in: siteIds },

      status: {
        in: ['APPROVED', 'ARCHIVED'] // Only show approved/archived reports to clients
      }
    };

    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (siteId && siteIds.includes(siteId)) where.siteId = siteId;

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
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          site: {
            select: {
              name: true,
              address: true
            }
          },
          // mediaFiles: { // Field doesn't exist in schema
          //   select: {
          //     id: true,
          //     filename: true,
          //     fileType: true
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
    console.error('Error fetching client reports:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reports'
      }
    });
  }
});

// GET /api/client-portal/reports/:id/download - Download a specific report
router.get('/reports/:id/download', [
  requireAuth,
  param('id').isUUID(),
  query('format').optional().isIn(['pdf', 'excel', 'csv'])
], handleValidationErrors, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }

    const reportId = req.params.id;
    const format = (req.query.format as string) || 'pdf';

    // Get client's sites
    const clientSites = await prisma.site.findMany({
      where: { clientId },
      select: { id: true }
    });

    const siteIds = clientSites.map(site => site.id);

    // Find the report and verify it belongs to the client
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        siteId: { in: siteIds },
        status: { in: ['APPROVED', 'ARCHIVED'] }
      },
      include: {
        author: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        site: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found or access denied'
        }
      });
    }

    // Generate report content based on format
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'pdf':
        buffer = await generatePDFReport(report);
        contentType = 'application/pdf';
        filename = `report_${reportId}.pdf`;
        break;

      case 'excel':
        buffer = await generateExcelReport(report);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `report_${reportId}.xlsx`;
        break;

      case 'csv':
        buffer = generateCSVReport(report);
        contentType = 'text/csv';
        filename = `report_${reportId}.csv`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Invalid format requested'
          }
        });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to download report'
      }
    });
  }
});

// GET /api/client-portal/service-requests - Get client's service requests
router.get('/service-requests', [
  requireAuth,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']),
  query('type').optional().isIn(['ADDITIONAL_PATROL', 'EMERGENCY_RESPONSE', 'MAINTENANCE', 'CONSULTATION', 'OTHER']),
], handleValidationErrors, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      clientId: clientId,

    };

    if (status) where.status = status;
    if (type) where.type = type;

    // Get service requests with pagination
    const [requests, total] = await Promise.all([
      prisma.clientRequest.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          site: {
            select: {
              name: true,
              address: true
            }
          },
          assignedTo: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clientRequest.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch service requests'
      }
    });
  }
});

// GET /api/client-portal/service-requests/stats - Get service request statistics
router.get('/service-requests/stats', requireAuth, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }

    // Get service request statistics
    const [
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      requestsByType,
      requestsByPriority
    ] = await Promise.all([
      prisma.clientRequest.count({
        where: { clientId }
      }),
      prisma.clientRequest.count({
        where: { clientId, status: 'PENDING' }
      }),
      prisma.clientRequest.count({
        where: { clientId, status: 'IN_PROGRESS' }
      }),
      prisma.clientRequest.count({
        where: { clientId, status: 'COMPLETED' }
      }),
      prisma.clientRequest.groupBy({
        by: ['type'],
        where: { clientId },
        _count: { type: true }
      }),
      prisma.clientRequest.groupBy({
        by: ['priority'],
        where: { clientId },
        _count: { priority: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
        averageResponseTime: await calculateAverageResponseTime(clientId),
        averageCompletionTime: await calculateAverageCompletionTime(clientId),
        requestsByType: requestsByType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        requestsByPriority: requestsByPriority.map(item => ({
          priority: item.priority,
          count: item._count.priority
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching service request stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch service request statistics'
      }
    });
  }
});

// POST /api/client-portal/service-requests - Create new service request
router.post('/service-requests', [
  requireAuth,
  body('type').isIn(['ADDITIONAL_PATROL', 'EMERGENCY_RESPONSE', 'MAINTENANCE', 'CONSULTATION', 'OTHER']),
  body('title').isString().isLength({ min: 1, max: 200 }).trim(),
  body('description').isString().isLength({ min: 1, max: 2000 }).trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('siteId').optional().isUUID(),
  body('urgentContact').optional().isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }
    
    const { type, title, description, priority = 'MEDIUM', siteId, urgentContact } = req.body;

    // Validate site belongs to client if provided
    if (siteId) {
      const site = await prisma.site.findFirst({
        where: {
          id: siteId,
          clientId: clientId,

        }
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SITE_NOT_FOUND',
            message: 'Site not found or does not belong to client'
          }
        });
      }
    }

    // Create service request
    const request = await prisma.clientRequest.create({
      data: {
        clientId,
        type,
        title,
        description,
        priority,
        siteId,
        // urgentContact, // Field doesn't exist in schema
        status: 'PENDING'
      },
      include: {
        site: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { request },
      message: 'Service request created successfully'
    });
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create service request'
      }
    });
  }
});

// GET /api/client-portal/sites - Get client's sites
router.get('/sites', requireAuth, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }

    const sites = await prisma.site.findMany({
      where: {
        clientId: clientId,

      },
      include: {
        shifts: {
          where: {
            status: 'IN_PROGRESS',

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
          }
        },
        _count: {
          select: {
            reports: {
              where: {
        
                createdAt: {
                  gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { sites }
    });
  } catch (error) {
    console.error('Error fetching client sites:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch sites'
      }
    });
  }
});

// Helper functions for calculating service request metrics
async function calculateAverageResponseTime(clientId: string): Promise<number> {
  try {
    const requests = await prisma.clientRequest.findMany({
      where: {
        clientId,
        status: { not: 'PENDING' },
        acknowledgedAt: { not: null }
      },
      select: {
        createdAt: true,
        acknowledgedAt: true
      }
    });

    if (requests.length === 0) return 0;

    const totalResponseTime = requests.reduce((sum, request) => {
      if (request.acknowledgedAt) {
        const responseTime = new Date(request.acknowledgedAt).getTime() - new Date(request.createdAt).getTime();
        return sum + responseTime;
      }
      return sum;
    }, 0);

    // Return average response time in hours
    return Math.round(totalResponseTime / requests.length / (1000 * 60 * 60));
  } catch (error) {
    console.error('Error calculating average response time:', error);
    return 24; // Default fallback
  }
}

async function calculateAverageCompletionTime(clientId: string): Promise<number> {
  try {
    const requests = await prisma.clientRequest.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    if (requests.length === 0) return 0;

    const totalCompletionTime = requests.reduce((sum, request) => {
      if (request.completedAt) {
        const completionTime = new Date(request.completedAt).getTime() - new Date(request.createdAt).getTime();
        return sum + completionTime;
      }
      return sum;
    }, 0);

    // Return average completion time in hours
    return Math.round(totalCompletionTime / requests.length / (1000 * 60 * 60));
  } catch (error) {
    console.error('Error calculating average completion time:', error);
    return 72; // Default fallback
  }
}

// Helper functions for report generation

async function generatePDFReport(report: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text('Security Report', 50, 50);
      doc.fontSize(12).text(`Report ID: ${report.id}`, 50, 80);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 95);

      // Report Details
      doc.fontSize(16).text('Report Details', 50, 130);
      doc.fontSize(12)
        .text(`Title: ${report.title}`, 50, 155)
        .text(`Type: ${report.type}`, 50, 170)
        .text(`Status: ${report.status}`, 50, 185)
        .text(`Site: ${report.site?.name || 'Unknown'}`, 50, 200)
        .text(`Author: ${report.author.user.firstName} ${report.author.user.lastName}`, 50, 215)
        .text(`Created: ${report.createdAt.toLocaleString()}`, 50, 230);

      // Site Address
      if (report.site?.address) {
        const address = report.site.address;
        doc.text(`Site Address: ${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`, 50, 245);
      }

      // Content
      if (report.content) {
        doc.fontSize(16).text('Report Content', 50, 280);
        doc.fontSize(12).text(report.content, 50, 305, {
          width: 500,
          align: 'left'
        });
      }

      // Footer
      doc.fontSize(10)
        .text('This report is confidential and intended for authorized personnel only.', 50, 750)
        .text('Generated by BahinLink Security Management System', 50, 765);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateExcelReport(report: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Security Report');

  // Set column widths
  worksheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 50 }
  ];

  // Add report data
  worksheet.addRow({ field: 'Report ID', value: report.id });
  worksheet.addRow({ field: 'Title', value: report.title });
  worksheet.addRow({ field: 'Type', value: report.type });
  worksheet.addRow({ field: 'Status', value: report.status });
  worksheet.addRow({ field: 'Site', value: report.site?.name || 'Unknown' });
  worksheet.addRow({ field: 'Author', value: `${report.author.user.firstName} ${report.author.user.lastName}` });
  worksheet.addRow({ field: 'Created Date', value: report.createdAt.toISOString() });
  
  if (report.site?.address) {
    const address = report.site.address;
    worksheet.addRow({ 
      field: 'Site Address', 
      value: `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}` 
    });
  }
  
  if (report.content) {
    worksheet.addRow({ field: 'Content', value: report.content });
  }

  worksheet.addRow({ field: 'Generated', value: new Date().toISOString() });

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function generateCSVReport(report: any): Buffer {
  const rows = [
    ['Field', 'Value'],
    ['Report ID', report.id],
    ['Title', report.title],
    ['Type', report.type],
    ['Status', report.status],
    ['Site', report.site?.name || 'Unknown'],
    ['Author', `${report.author.user.firstName} ${report.author.user.lastName}`],
    ['Created Date', report.createdAt.toISOString()],
  ];

  if (report.site?.address) {
    const address = report.site.address;
    rows.push(['Site Address', `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`]);
  }

  if (report.content) {
    rows.push(['Content', report.content.replace(/"/g, '""')]);
  }

  rows.push(['Generated', new Date().toISOString()]);

  const csvContent = rows
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return Buffer.from(csvContent, 'utf8');
}

export default router;
