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
                overview: {
                    activeSites: sites.filter(site => site.status === 'ACTIVE').length,
                    totalSites: sites.length,
                    activeShifts,
                    incidentsToday,
                    pendingRequests,
                    totalAgents,
                    completedShifts: 0,
                    satisfactionScore: 95.5,
                    responseTime: 8.2,
                    todayReports: 0
                },
                lastUpdated: new Date().toISOString(),
                timestamp: new Date().toISOString()
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
router.get('/analytics', auth_1.requireAuth, async (req, res) => {
    try {
        const clientId = req.user?.clientId;
        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CLIENT_ID_REQUIRED',
                    message: 'Client ID is required'
                }
            });
        }
        const recentReports = await prisma.report.findMany({
            where: {
                site: {
                    clientId: clientId
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10,
            include: {
                author: {
                    include: {
                        user: true
                    }
                },
                site: true
            }
        });
        const recentIncidents = await prisma.incident.findMany({
            where: {
                site: {
                    clientId: clientId
                }
            },
            orderBy: {
                occurredAt: 'desc'
            },
            take: 10,
            include: {
                site: true,
                reportedBy: {
                    include: {
                        user: true
                    }
                }
            }
        });
        const recentAttendance = await prisma.shift.findMany({
            where: {
                site: {
                    clientId: clientId
                }
            },
            orderBy: {
                startTime: 'desc'
            },
            take: 10,
            include: {
                agent: {
                    include: {
                        user: true
                    }
                },
                site: true
            }
        });
        res.json({
            success: true,
            data: {
                recentReports: recentReports.map(report => ({
                    id: report.id,
                    title: report.title,
                    type: report.type,
                    status: report.status,
                    priority: report.priority,
                    createdAt: report.createdAt.toISOString(),
                    timestamp: report.createdAt.toISOString(),
                    agent: {
                        id: report.author.id,
                        name: `${report.author.user.firstName} ${report.author.user.lastName}`
                    },
                    site: {
                        id: report.site?.id || 'unknown',
                        name: report.site?.name || 'Unknown Site'
                    }
                })),
                recentIncidents: recentIncidents.map(incident => ({
                    id: incident.id,
                    title: incident.title,
                    type: incident.type,
                    severity: incident.severity,
                    status: incident.status,
                    occurredAt: incident.occurredAt.toISOString(),
                    timestamp: incident.occurredAt.toISOString(),
                    site: {
                        id: incident.site?.id || 'unknown',
                        name: incident.site?.name || 'Unknown Site'
                    },
                    reporter: incident.reportedBy ? {
                        id: incident.reportedBy.id,
                        firstName: incident.reportedBy.user.firstName,
                        lastName: incident.reportedBy.user.lastName
                    } : null
                })),
                recentAttendance: recentAttendance.map(shift => ({
                    id: shift.id,
                    startTime: shift.startTime.toISOString(),
                    endTime: shift.endTime?.toISOString() || null,
                    status: shift.status,
                    timestamp: shift.startTime.toISOString(),
                    agent: {
                        id: shift.agent.id,
                        name: `${shift.agent.user.firstName} ${shift.agent.user.lastName}`
                    },
                    site: {
                        id: shift.site?.id || 'unknown',
                        name: shift.site?.name || 'Unknown Site'
                    }
                }))
            },
            lastUpdated: new Date().toISOString(),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch analytics data'
            }
        });
    }
});
router.get('/dashboard/activity', auth_1.requireAuth, async (req, res) => {
    try {
        const now = new Date();
        const demoData = {
            recentReports: [
                {
                    id: 'report-1',
                    title: 'Security Patrol Report',
                    type: 'PATROL',
                    status: 'SUBMITTED',
                    priority: 'MEDIUM',
                    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                    agentName: 'John Smith',
                    siteName: 'Downtown Office'
                },
                {
                    id: 'report-2',
                    title: 'Incident Response Report',
                    type: 'INCIDENT',
                    status: 'APPROVED',
                    priority: 'HIGH',
                    createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                    agentName: 'Sarah Johnson',
                    siteName: 'Warehouse District'
                },
                {
                    id: 'report-3',
                    title: 'Maintenance Check Report',
                    type: 'MAINTENANCE',
                    status: 'REVIEWED',
                    priority: 'LOW',
                    createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                    timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                    agentName: 'Mike Davis',
                    siteName: 'Shopping Mall'
                }
            ],
            recentIncidents: [
                {
                    id: 'incident-1',
                    title: 'Unauthorized Access Attempt',
                    type: 'SECURITY_BREACH',
                    severity: 'HIGH',
                    status: 'IN_PROGRESS',
                    occurredAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                    timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                    reportedBy: 'John Smith',
                    siteName: 'Downtown Office'
                },
                {
                    id: 'incident-2',
                    title: 'Fire Alarm Activation',
                    type: 'EMERGENCY',
                    severity: 'CRITICAL',
                    status: 'RESOLVED',
                    occurredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                    timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                    reportedBy: 'Sarah Johnson',
                    siteName: 'Warehouse District'
                }
            ],
            recentAttendance: [
                {
                    id: 'shift-1',
                    clockInTime: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                    clockOutTime: null,
                    status: 'IN_PROGRESS',
                    timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                    agentName: 'John Smith',
                    siteName: 'Downtown Office'
                },
                {
                    id: 'shift-2',
                    clockInTime: new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString(),
                    clockOutTime: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                    status: 'COMPLETED',
                    timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                    agentName: 'Sarah Johnson',
                    siteName: 'Warehouse District'
                },
                {
                    id: 'shift-3',
                    clockInTime: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                    clockOutTime: null,
                    status: 'IN_PROGRESS',
                    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                    agentName: 'Mike Davis',
                    siteName: 'Shopping Mall'
                }
            ]
        };
        res.json({
            success: true,
            data: demoData,
            lastUpdated: now.toISOString(),
            timestamp: now.toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch recent activity'
            }
        });
    }
});
router.get('/sites/status', auth_1.requireAuth, async (req, res) => {
    try {
        const now = new Date();
        const demoSites = [
            {
                id: 'site-1',
                name: 'Downtown Office',
                address: '123 Business Ave, Downtown, DC 12345',
                status: 'ACTIVE',
                securityLevel: 'HIGH',
                activeShifts: 2,
                agentsOnSite: 2,
                lastUpdate: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                activeAgents: [
                    {
                        id: 'agent-1',
                        name: 'John Smith',
                        shiftStart: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
                        shiftEnd: null
                    },
                    {
                        id: 'agent-4',
                        name: 'Lisa Wilson',
                        shiftStart: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                        shiftEnd: null
                    }
                ],
                openIncidents: 1,
                recentReports: 3,
                coordinates: {
                    latitude: 40.7128,
                    longitude: -74.0060
                },
                createdAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
            },
            {
                id: 'site-2',
                name: 'Warehouse District',
                address: '456 Industrial Blvd, Warehouse District, DC 12346',
                status: 'ACTIVE',
                securityLevel: 'MEDIUM',
                activeShifts: 1,
                agentsOnSite: 1,
                lastUpdate: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
                timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
                activeAgents: [
                    {
                        id: 'agent-2',
                        name: 'Sarah Johnson',
                        shiftStart: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                        shiftEnd: null
                    }
                ],
                openIncidents: 0,
                recentReports: 2,
                coordinates: {
                    latitude: 40.7228,
                    longitude: -74.0160
                },
                createdAt: new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString()
            },
            {
                id: 'site-3',
                name: 'Shopping Mall',
                address: '789 Retail Plaza, Shopping District, DC 12347',
                status: 'ACTIVE',
                securityLevel: 'HIGH',
                activeShifts: 1,
                agentsOnSite: 1,
                lastUpdate: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
                timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
                activeAgents: [
                    {
                        id: 'agent-3',
                        name: 'Mike Davis',
                        shiftStart: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                        shiftEnd: null
                    }
                ],
                openIncidents: 0,
                recentReports: 1,
                coordinates: {
                    latitude: 40.7328,
                    longitude: -74.0260
                },
                createdAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
            },
            {
                id: 'site-4',
                name: 'Corporate Campus',
                address: '321 Corporate Way, Business Park, DC 12348',
                status: 'ACTIVE',
                securityLevel: 'MEDIUM',
                activeShifts: 0,
                agentsOnSite: 0,
                lastUpdate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                activeAgents: [],
                openIncidents: 0,
                recentReports: 0,
                coordinates: {
                    latitude: 40.7428,
                    longitude: -74.0360
                },
                createdAt: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
            }
        ];
        res.json({
            success: true,
            data: {
                sites: demoSites,
                lastUpdated: now.toISOString(),
                timestamp: now.toISOString()
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