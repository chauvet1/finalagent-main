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
router.get('/dashboard/stats', auth_1.requireAuth, async (req, res) => {
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
                const defaultClient = await prisma.client.create({
                    data: {
                        name: 'Demo Client',
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
                clientId: clientId
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
                status: 'IN_PROGRESS'
            }
        });
        const incidentsToday = await prisma.incident.count({
            where: {
                siteId: { in: siteIds },
                occurredAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });
        const pendingRequests = await prisma.clientRequest.count({
            where: {
                clientId: clientId,
                status: {
                    in: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS']
                }
            }
        });
        const totalAgents = await prisma.agentProfile.count({
            where: {
                currentSiteId: { in: siteIds }
            }
        });
        res.json({
            success: true,
            data: {
                activeSites: sites.filter(site => site.status === 'ACTIVE').length,
                totalSites: sites.length,
                activeShifts,
                incidentsToday,
                pendingRequests,
                totalAgents
            }
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch dashboard statistics'
            }
        });
    }
});
router.get('/dashboard/activity', auth_1.requireAuth, async (req, res) => {
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
        const sites = await prisma.site.findMany({
            where: {
                clientId: clientId
            },
            select: { id: true }
        });
        const siteIds = sites.map(site => site.id);
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
        const recentAttendance = await prisma.attendance.findMany({
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
                clockInTime: 'desc'
            },
            take: 10
        });
        res.json({
            success: true,
            data: {
                recentReports: recentReports.map(report => ({
                    id: report.id,
                    type: report.type,
                    title: report.title,
                    status: report.status,
                    agentName: `${report.author.user.firstName} ${report.author.user.lastName}`,
                    siteName: report.site?.name || 'Unknown Site',
                    createdAt: report.createdAt
                })),
                recentIncidents: recentIncidents.map(incident => ({
                    id: incident.id,
                    type: incident.type,
                    title: incident.title,
                    severity: incident.severity,
                    status: incident.status,
                    reportedBy: incident.reportedBy ? `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 'System',
                    siteName: incident.site.name,
                    occurredAt: incident.occurredAt
                })),
                recentAttendance: recentAttendance.map(attendance => ({
                    id: attendance.id,
                    agentName: `${attendance.agent.user.firstName} ${attendance.agent.user.lastName}`,
                    siteName: attendance.site?.name || 'Unknown Site',
                    clockInTime: attendance.clockInTime,
                    clockOutTime: attendance.clockOutTime,
                    status: attendance.status
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching dashboard activity:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch dashboard activity'
            }
        });
    }
});
router.get('/sites/status', auth_1.requireAuth, async (req, res) => {
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
        const sites = await prisma.site.findMany({
            where: {
                clientId: clientId
            },
            include: {
                shifts: {
                    where: {
                        status: 'IN_PROGRESS'
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
                        incidents: {
                            where: {
                                status: 'OPEN'
                            }
                        },
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
            data: {
                sites: sites.map(site => ({
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    status: site.status,
                    securityLevel: site.securityLevel,
                    activeShifts: site.shifts.length,
                    activeAgents: site.shifts.map(shift => ({
                        id: (shift.agent.user.firstName || '') + (shift.agent.user.lastName || ''),
                        name: `${shift.agent.user.firstName || ''} ${shift.agent.user.lastName || ''}`.trim() || 'Unknown Agent',
                        shiftStart: shift.startTime,
                        shiftEnd: shift.endTime
                    })),
                    openIncidents: site._count.incidents,
                    recentReports: site._count.reports,
                    coordinates: site.coordinates
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching sites status:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch sites status'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=client.js.map