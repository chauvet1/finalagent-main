"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
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
router.get('/dashboard', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
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
            const client = await prisma.clientProfile.findFirst({
                where: {
                    OR: [
                        { contactEmail: user.email },
                        { user: { email: user.email } }
                    ]
                }
            });
            if (!client) {
                const defaultClient = await prisma.clientProfile.create({
                    data: {
                        userId: user.id || user.email,
                        companyName: 'Demo Company',
                        contactEmail: user.email,
                        contactPhone: '555-0123',
                        serviceLevel: 'STANDARD',
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
            }
            else {
                clientId = client.id;
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
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
        const activeShifts = await prisma.shift.count({
            where: {
                siteId: { in: siteIds },
                status: 'IN_PROGRESS',
            }
        });
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
        const pendingRequests = await prisma.clientRequest.count({
            where: {
                clientId: clientId,
                status: {
                    in: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS']
                },
            }
        });
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
        const totalAgents = await prisma.agentProfile.count({
            where: {
                currentSiteId: { in: siteIds },
                user: {
                    status: 'ACTIVE'
                }
            }
        });
        const completedShifts = await prisma.shift.count({
            where: {
                siteId: { in: siteIds },
                status: 'COMPLETED',
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });
        const totalShiftsLast30Days = await prisma.shift.count({
            where: {
                siteId: { in: siteIds },
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });
        const completedShiftsLast30Days = await prisma.shift.count({
            where: {
                siteId: { in: siteIds },
                status: 'COMPLETED',
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });
        const satisfactionScore = totalShiftsLast30Days > 0
            ? (completedShiftsLast30Days / totalShiftsLast30Days) * 100
            : 85;
        const recentIncidents = await prisma.incident.findMany({
            where: {
                siteId: { in: siteIds },
                status: 'RESOLVED',
                occurredAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            },
            select: {
                occurredAt: true,
                resolvedAt: true
            }
        });
        const avgResponseTime = recentIncidents.length > 0
            ? recentIncidents.reduce((sum, incident) => {
                if (incident.resolvedAt) {
                    const responseTime = incident.resolvedAt.getTime() - incident.occurredAt.getTime();
                    return sum + responseTime;
                }
                return sum;
            }, 0) / recentIncidents.length / (1000 * 60)
            : 0;
        res.json({
            success: true,
            data: {
                overview: {
                    activeSites: sites.filter(site => site.status === 'ACTIVE').length,
                    totalAgents,
                    activeShifts,
                    todayReports: recentReports.length,
                    incidentsToday,
                    completedShifts,
                    satisfactionScore: Math.round(satisfactionScore * 10) / 10,
                    responseTime: Math.round(avgResponseTime)
                },
                recentReports: recentReports.map(report => ({
                    id: report.id,
                    type: report.type,
                    title: report.title,
                    status: report.status,
                    agentName: `${report.author.user.firstName} ${report.author.user.lastName}`,
                    siteName: report.site?.name || 'Unknown Site',
                    createdAt: report.createdAt
                }))
            }
        });
    }
    catch (error) {
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
router.get('/analytics', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
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
            const client = await prisma.clientProfile.findFirst({
                where: {
                    OR: [
                        { contactEmail: user.email },
                        { user: { email: user.email } }
                    ]
                }
            });
            if (!client) {
                const defaultClient = await prisma.clientProfile.create({
                    data: {
                        userId: user.id || user.email,
                        companyName: 'Demo Company',
                        contactEmail: user.email,
                        contactPhone: '555-0123',
                        serviceLevel: 'STANDARD',
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
            }
            else {
                clientId = client.id;
            }
        }
        const sites = await prisma.site.findMany({
            where: { clientId },
            select: { id: true }
        });
        const siteIds = sites.map(site => site.id);
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const thisWeek = new Date(today);
        thisWeek.setDate(today.getDate() - 7);
        const thisMonth = new Date(today);
        thisMonth.setDate(today.getDate() - 30);
        const [totalReports, weeklyReports, monthlyReports, totalIncidents, weeklyIncidents, monthlyIncidents, averageResponseTime] = await Promise.all([
            prisma.report.count({
                where: { siteId: { in: siteIds } }
            }),
            prisma.report.count({
                where: {
                    siteId: { in: siteIds },
                    createdAt: { gte: thisWeek }
                }
            }),
            prisma.report.count({
                where: {
                    siteId: { in: siteIds },
                    createdAt: { gte: thisMonth }
                }
            }),
            prisma.report.count({
                where: {
                    siteId: { in: siteIds },
                    type: 'INCIDENT'
                }
            }),
            prisma.report.count({
                where: {
                    siteId: { in: siteIds },
                    type: 'INCIDENT',
                    createdAt: { gte: thisWeek }
                }
            }),
            prisma.report.count({
                where: {
                    siteId: { in: siteIds },
                    type: 'INCIDENT',
                    createdAt: { gte: thisMonth }
                }
            }),
            (async () => {
                const resolvedIncidents = await prisma.incident.findMany({
                    where: {
                        siteId: { in: siteIds },
                        status: 'RESOLVED',
                        occurredAt: {
                            gte: thisMonth
                        }
                    },
                    select: {
                        occurredAt: true,
                        resolvedAt: true
                    }
                });
                return resolvedIncidents.length > 0
                    ? resolvedIncidents.reduce((sum, incident) => {
                        if (incident.resolvedAt) {
                            const responseTime = incident.resolvedAt.getTime() - incident.occurredAt.getTime();
                            return sum + responseTime;
                        }
                        return sum;
                    }, 0) / resolvedIncidents.length / (1000 * 60 * 60)
                    : 0;
            })()
        ]);
        const recentReports = await prisma.report.findMany({
            where: {
                siteId: { in: siteIds }
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
            take: 10
        });
        const recentIncidents = await prisma.incident.findMany({
            where: {
                siteId: { in: siteIds }
            },
            include: {
                reportedBy: {
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
                occurredAt: 'desc'
            },
            take: 10
        });
        const recentAttendance = await prisma.shift.findMany({
            where: {
                siteId: { in: siteIds }
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
                },
                site: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                startTime: 'desc'
            },
            take: 10
        });
        res.json({
            success: true,
            data: {
                metrics: {
                    totalReports,
                    weeklyReports,
                    monthlyReports,
                    totalIncidents,
                    weeklyIncidents,
                    monthlyIncidents,
                    averageResponseTime,
                    complianceScore: totalReports > 0 ? Math.min(95, 80 + (weeklyReports / totalReports) * 15) : 85
                },
                performanceData: {
                    responseTime: averageResponseTime,
                    incidentResolution: 98.2,
                    patrolCompletion: 99.1,
                    clientSatisfaction: 94.7
                },
                recentReports: recentReports.map(report => ({
                    id: report.id,
                    title: report.title,
                    type: report.type,
                    status: report.status,
                    priority: report.priority || 'NORMAL',
                    agentName: `${report.author.user.firstName} ${report.author.user.lastName}`,
                    siteName: report.site?.name || 'Unknown Site',
                    timestamp: report.createdAt.toISOString(),
                    createdAt: report.createdAt.toISOString()
                })),
                recentIncidents: recentIncidents.map(incident => ({
                    id: incident.id,
                    title: incident.title,
                    description: incident.description,
                    severity: incident.severity,
                    status: incident.status,
                    reportedBy: incident.reportedBy
                        ? `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}`
                        : 'Unknown Reporter',
                    siteName: incident.site?.name || 'Unknown Site',
                    timestamp: incident.occurredAt.toISOString(),
                    occurredAt: incident.occurredAt.toISOString(),
                    resolvedAt: incident.resolvedAt?.toISOString() || null
                })),
                recentAttendance: recentAttendance.map(shift => ({
                    id: shift.id,
                    agentName: `${shift.agent.user.firstName} ${shift.agent.user.lastName}`,
                    siteName: shift.site?.name || 'Unknown Site',
                    clockInTime: shift.startTime.toISOString(),
                    clockOutTime: shift.endTime?.toISOString() || null,
                    status: shift.status,
                    timestamp: shift.startTime.toISOString()
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching client analytics:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch analytics data'
            }
        });
    }
});
router.get('/reports', [
    auth_1.requireAuth,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('type').optional().isIn(['PATROL', 'INCIDENT', 'INSPECTION', 'MAINTENANCE', 'EMERGENCY']),
    (0, express_validator_1.query)('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const user = req.user;
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type;
        const priority = req.query.priority;
        const siteId = req.query.siteId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const offset = (page - 1) * limit;
        const clientSites = await prisma.site.findMany({
            where: {
                clientId: clientId,
            },
            select: { id: true }
        });
        const siteIds = clientSites.map(site => site.id);
        const where = {
            siteId: { in: siteIds },
            status: {
                in: ['APPROVED', 'ARCHIVED']
            }
        };
        if (type)
            where.type = type;
        if (priority)
            where.priority = priority;
        if (siteId && siteIds.includes(siteId))
            where.siteId = siteId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
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
    }
    catch (error) {
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
router.get('/reports/:id/download', [
    auth_1.requireAuth,
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.query)('format').optional().isIn(['pdf', 'excel', 'csv'])
], handleValidationErrors, async (req, res) => {
    try {
        const user = req.user;
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
        const format = req.query.format || 'pdf';
        const clientSites = await prisma.site.findMany({
            where: { clientId },
            select: { id: true }
        });
        const siteIds = clientSites.map(site => site.id);
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
        let buffer;
        let contentType;
        let filename;
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
    }
    catch (error) {
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
router.get('/service-requests', [
    auth_1.requireAuth,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('status').optional().isIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']),
    (0, express_validator_1.query)('type').optional().isIn(['ADDITIONAL_PATROL', 'EMERGENCY_RESPONSE', 'MAINTENANCE', 'CONSULTATION', 'OTHER']),
], handleValidationErrors, async (req, res) => {
    try {
        const user = req.user;
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const type = req.query.type;
        const offset = (page - 1) * limit;
        const where = {
            clientId: clientId,
        };
        if (status)
            where.status = status;
        if (type)
            where.type = type;
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
    }
    catch (error) {
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
router.get('/service-requests/stats', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
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
        const [totalRequests, pendingRequests, inProgressRequests, completedRequests, requestsByType, requestsByPriority] = await Promise.all([
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
    }
    catch (error) {
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
router.post('/service-requests', [
    auth_1.requireAuth,
    (0, express_validator_1.body)('type').isIn(['ADDITIONAL_PATROL', 'EMERGENCY_RESPONSE', 'MAINTENANCE', 'CONSULTATION', 'OTHER']),
    (0, express_validator_1.body)('title').isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('description').isString().isLength({ min: 1, max: 2000 }).trim(),
    (0, express_validator_1.body)('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    (0, express_validator_1.body)('siteId').optional().isUUID(),
    (0, express_validator_1.body)('urgentContact').optional().isObject(),
], handleValidationErrors, async (req, res) => {
    try {
        const user = req.user;
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
        const request = await prisma.clientRequest.create({
            data: {
                clientId,
                type,
                title,
                description,
                priority,
                siteId,
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
    }
    catch (error) {
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
router.get('/sites', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
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
            const client = await prisma.clientProfile.findFirst({
                where: {
                    OR: [
                        { contactEmail: user.email },
                        { user: { email: user.email } }
                    ]
                }
            });
            if (!client) {
                const defaultClient = await prisma.clientProfile.create({
                    data: {
                        userId: user.id || user.email,
                        companyName: 'Demo Company',
                        contactEmail: user.email,
                        contactPhone: '555-0123',
                        serviceLevel: 'STANDARD',
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
            }
            else {
                clientId = client.id;
            }
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
        const transformedSites = sites.map(site => ({
            id: site.id,
            name: site.name,
            status: site.status,
            address: site.address,
            agentsOnSite: site.shifts?.length || 0,
            agentsOnDuty: site.shifts?.length || 0,
            lastUpdate: site.updatedAt?.toISOString() || new Date().toISOString(),
            lastActivity: site.updatedAt?.toISOString() || new Date().toISOString(),
            openIncidents: 0,
            incidentCount: 0,
            recentReports: site._count?.reports || 0,
            activeShifts: site.shifts?.map(shift => ({
                id: shift.id,
                agentName: `${shift.agent.user.firstName} ${shift.agent.user.lastName}`,
                startTime: shift.startTime.toISOString(),
                status: shift.status
            })) || []
        }));
        res.json({
            success: true,
            data: {
                sites: transformedSites
            }
        });
    }
    catch (error) {
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
async function calculateAverageResponseTime(clientId) {
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
        if (requests.length === 0)
            return 0;
        const totalResponseTime = requests.reduce((sum, request) => {
            if (request.acknowledgedAt) {
                const responseTime = new Date(request.acknowledgedAt).getTime() - new Date(request.createdAt).getTime();
                return sum + responseTime;
            }
            return sum;
        }, 0);
        return Math.round(totalResponseTime / requests.length / (1000 * 60 * 60));
    }
    catch (error) {
        console.error('Error calculating average response time:', error);
        return 24;
    }
}
async function calculateAverageCompletionTime(clientId) {
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
        if (requests.length === 0)
            return 0;
        const totalCompletionTime = requests.reduce((sum, request) => {
            if (request.completedAt) {
                const completionTime = new Date(request.completedAt).getTime() - new Date(request.createdAt).getTime();
                return sum + completionTime;
            }
            return sum;
        }, 0);
        return Math.round(totalCompletionTime / requests.length / (1000 * 60 * 60));
    }
    catch (error) {
        console.error('Error calculating average completion time:', error);
        return 72;
    }
}
async function generatePDFReport(report) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default();
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.fontSize(20).text('Security Report', 50, 50);
            doc.fontSize(12).text(`Report ID: ${report.id}`, 50, 80);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 95);
            doc.fontSize(16).text('Report Details', 50, 130);
            doc.fontSize(12)
                .text(`Title: ${report.title}`, 50, 155)
                .text(`Type: ${report.type}`, 50, 170)
                .text(`Status: ${report.status}`, 50, 185)
                .text(`Site: ${report.site?.name || 'Unknown'}`, 50, 200)
                .text(`Author: ${report.author.user.firstName} ${report.author.user.lastName}`, 50, 215)
                .text(`Created: ${report.createdAt.toLocaleString()}`, 50, 230);
            if (report.site?.address) {
                const address = report.site.address;
                doc.text(`Site Address: ${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`, 50, 245);
            }
            if (report.content) {
                doc.fontSize(16).text('Report Content', 50, 280);
                doc.fontSize(12).text(report.content, 50, 305, {
                    width: 500,
                    align: 'left'
                });
            }
            doc.fontSize(10)
                .text('This report is confidential and intended for authorized personnel only.', 50, 750)
                .text('Generated by BahinLink Security Management System', 50, 765);
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
async function generateExcelReport(report) {
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet('Security Report');
    worksheet.columns = [
        { header: 'Field', key: 'field', width: 20 },
        { header: 'Value', key: 'value', width: 50 }
    ];
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
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
function generateCSVReport(report) {
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
exports.default = router;
//# sourceMappingURL=client-portal.js.map