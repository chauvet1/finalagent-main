"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
router.get('/dashboard', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const activeShifts = await prisma.shift.count({
            where: {
                status: 'IN_PROGRESS'
            }
        });
        const totalAgents = await prisma.agentProfile.count();
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
    }
    catch (error) {
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
router.get('/performance', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
    (0, express_validator_1.query)('agentId').optional().isUUID(),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const agentId = req.query.agentId;
        const siteId = req.query.siteId;
        const baseWhere = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
        if (agentId)
            baseWhere.agentId = agentId;
        if (siteId)
            baseWhere.siteId = siteId;
        const shiftMetrics = await prisma.shift.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: {
                status: true
            }
        });
        const reportMetrics = await prisma.report.groupBy({
            by: ['type', 'status'],
            where: baseWhere,
            _count: {
                type: true
            }
        });
        const attendanceMetrics = [];
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
    }
    catch (error) {
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
    }
    catch (error) {
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
router.get('/test-dashboard', async (req, res) => {
    console.log('Test dashboard endpoint hit - no auth required');
    try {
        const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = new Date();
        const activeShifts = await prisma.shift.count({
            where: {
                status: 'IN_PROGRESS'
            }
        });
        const totalAgents = await prisma.agentProfile.count();
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
    }
    catch (error) {
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
router.get('/site-stats', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const siteId = req.query.siteId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
        if (siteId) {
            where.siteId = siteId;
        }
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
            averageShiftDuration: 8,
            incidentCount: 0
        };
        res.json({
            success: true,
            data: siteStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.get('/geofence-stats', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const siteId = req.query.siteId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
        if (siteId) {
            where.siteId = siteId;
        }
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
            averageResponseTime: 0,
            criticalViolations: 0
        };
        res.json({
            success: true,
            data: geofenceStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.get('/client-stats', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
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
        const serviceLevelDistribution = await prisma.$queryRaw `
      SELECT "serviceLevel", COUNT(*) as "count"
      FROM "ClientProfile"
      GROUP BY "serviceLevel"
    `;
        const industryDistribution = await prisma.$queryRaw `
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
            averageContractValue: 0,
            topClients: []
        };
        res.json({
            success: true,
            data: clientStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.get('/billing-stats', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
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
            const monthlyValue = client.monthlyValue ? Number(client.monthlyValue) : 0;
            return sum + monthlyValue;
        }, 0);
        const billingStats = {
            totalRevenue: totalMonthlyRevenue,
            outstandingInvoices: 0,
            paidInvoices: 0,
            averageInvoiceAmount: 0,
            revenueByMonth: [],
            paymentsByMethod: [],
            topPayingClients: []
        };
        res.json({
            success: true,
            data: billingStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
exports.default = router;
//# sourceMappingURL=analytics.js.map