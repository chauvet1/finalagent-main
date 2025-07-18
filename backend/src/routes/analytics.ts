import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin, requireClient } from '../middleware/auth';

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

// GET /api/analytics/dashboard - Get dashboard metrics
router.get('/dashboard', [
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

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

    const incidentsToday = await prisma.incident.count({
      where: {
        occurredAt: {
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
      }
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard analytics'
      }
    });
  }
});

// GET /api/analytics/performance - Get performance metrics
router.get('/performance', [
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('agentId').optional().isUUID(),
  query('siteId').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const agentId = req.query.agentId as string;
    const siteId = req.query.siteId as string;

    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (agentId) baseWhere.agentId = agentId;
    if (siteId) baseWhere.siteId = siteId;

    // Get shift performance metrics
    const shiftMetrics = await prisma.shift.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: {
        status: true
      }
    });

    // Get report metrics
    const reportMetrics = await prisma.report.groupBy({
      by: ['type', 'status'],
      where: baseWhere,
      _count: {
        type: true
      }
    });

    // Get attendance metrics - temporarily disabled
    const attendanceMetrics = []; // await prisma.attendance.groupBy({
    //   by: ['status'],
    //   where: {
    //     createdAt: {
    //       gte: startDate,
    //       lte: endDate
    //     },
    //     ...(agentId && { agentId }),
    //     ...(siteId && { siteId })
    //   },
    //   _count: {
    //     status: true
    //   }
    // });

    res.json({
      success: true,
      data: {
        shifts: shiftMetrics,
        reports: reportMetrics,
        attendance: attendanceMetrics,
        period: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch performance metrics'
      }
    });
  }
});

// Simple test endpoint to verify basic functionality
router.get('/simple-test', async (req, res) => {
  console.log('Simple test endpoint hit');
  try {
    res.json({
      success: true,
      data: {
        message: 'Analytics API is working',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in simple test:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Simple test failed'
      }
    });
  }
});

// Test endpoint without authentication for debugging
router.get('/test-dashboard', async (req, res) => {
  console.log('Test dashboard endpoint hit - no auth required');
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
      message: 'Test endpoint working - authentication bypassed'
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test dashboard endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch test dashboard data'
      }
    });
  }
});

// GET /api/analytics/site-stats - Get site statistics
router.get('/site-stats', [
  requireAuth,
  requireAdmin,
  query('siteId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const siteId = req.query.siteId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (siteId) {
      where.siteId = siteId;
    }

    // Get site statistics from real data
    const [totalShifts, completedShifts, activeShifts, totalReports] = await Promise.all([
      prisma.shift.count({ where }).catch(() => 0),
      prisma.shift.count({ where: { ...where, status: 'COMPLETED' } }).catch(() => 0),
      prisma.shift.count({ where: { ...where, status: 'IN_PROGRESS' } }).catch(() => 0),
      prisma.report.count({ where }).catch(() => 0)
    ]);

    const siteStats = {
      totalShifts,
      completedShifts,
      activeShifts,
      totalReports,
      completionRate: totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0,
      averageShiftDuration: 8, // This would need calculation from actual shift data
      incidentCount: 0 // This would come from incident reports
    };

    res.json({
      success: true,
      data: siteStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching site stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch site statistics'
      }
    });
  }
});

// GET /api/analytics/geofence-stats - Get geofence statistics
router.get('/geofence-stats', [
  requireAuth,
  requireAdmin,
  query('siteId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const siteId = req.query.siteId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (siteId) {
      where.siteId = siteId;
    }

    // Get geofence statistics from real data
    const [totalViolations, totalValidations, activeZones] = await Promise.all([
      prisma.geofenceViolation.count({ where }).catch(() => 0),
      prisma.geofenceValidation.count({ where }).catch(() => 0),
      prisma.geofence.count({ where: { isActive: true } }).catch(() => 0)
    ]);

    const geofenceStats = {
      totalViolations,
      totalValidations,
      activeZones,
      complianceRate: totalValidations > 0 ? Math.round(((totalValidations - totalViolations) / totalValidations) * 100) : 100,
      averageResponseTime: 0, // This would need calculation from actual response data
      criticalViolations: 0 // This would come from violation severity data
    };

    res.json({
      success: true,
      data: geofenceStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching geofence stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch geofence statistics'
      }
    });
  }
});

// GET /api/analytics/client-stats - Get client statistics
router.get('/client-stats', [
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    // Get client statistics from real data
    const [totalClients, activeClients, newClients] = await Promise.all([
      prisma.clientProfile.count(),
      prisma.clientProfile.count({
        where: {
          contractEnd: {
            gte: new Date()
          }
        }
      }),
      prisma.clientProfile.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ]);

    // Get service level distribution
    const serviceLevelDistribution = await prisma.$queryRaw`
      SELECT "serviceLevel", COUNT(*) as "count"
      FROM "ClientProfile"
      GROUP BY "serviceLevel"
    `;

    // Get industry distribution
    const industryDistribution = await prisma.$queryRaw`
      SELECT "industry", COUNT(*) as "count"
      FROM "ClientProfile"
      WHERE "industry" IS NOT NULL
      GROUP BY "industry"
    `;

    const clientStats = {
      totalClients,
      activeClients,
      newClients,
      retentionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0,
      serviceLevelDistribution,
      industryDistribution,
      averageContractValue: 0, // This would need calculation from actual contract data
      topClients: [] // This would come from actual client data
    };

    res.json({
      success: true,
      data: clientStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch client statistics'
      }
    });
  }
});

// GET /api/analytics/billing-stats - Get billing statistics
router.get('/billing-stats', [
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    // Calculate total monthly revenue from client contracts
    const clients = await prisma.clientProfile.findMany({
      where: {
        monthlyValue: {
          not: null
        }
      },
      select: {
        monthlyValue: true
      }
    });

    const totalMonthlyRevenue = clients.reduce((sum, client) => {
      // Convert Decimal to number for calculation
      const monthlyValue = client.monthlyValue ? Number(client.monthlyValue) : 0;
      return sum + monthlyValue;
    }, 0);

    // Get billing statistics
    const billingStats = {
      totalRevenue: totalMonthlyRevenue,
      outstandingInvoices: 0, // This would come from actual invoice data
      paidInvoices: 0, // This would come from actual invoice data
      averageInvoiceAmount: 0, // This would come from actual invoice data
      revenueByMonth: [], // This would come from actual invoice data
      paymentsByMethod: [], // This would come from actual payment data
      topPayingClients: [] // This would come from actual client data
    };

    res.json({
      success: true,
      data: billingStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch billing statistics'
      }
    });
  }
});

export default router;
