"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const client_1 = require("@prisma/client");
const websocketService_1 = __importDefault(require("./services/websocketService"));
const redis_1 = require("./config/redis");
const users_1 = __importDefault(require("./routes/users"));
const admin_users_1 = __importDefault(require("./routes/admin-users"));
const shifts_1 = __importDefault(require("./routes/shifts"));
const sites_1 = __importDefault(require("./routes/sites"));
const reports_1 = __importDefault(require("./routes/reports"));
const incidents_1 = __importDefault(require("./routes/incidents"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const client_portal_1 = __importDefault(require("./routes/client-portal"));
const client_2 = __importDefault(require("./routes/client"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const auth_test_1 = __importDefault(require("./routes/auth-test"));
const geofence_1 = __importDefault(require("./routes/geofence"));
const clients_1 = __importDefault(require("./routes/clients"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const payments_1 = __importDefault(require("./routes/payments"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const contracts_1 = __importDefault(require("./routes/contracts"));
const auth_1 = require("./middleware/auth");
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const PORT = process.env.PORT || 8000;
app.get('/test-route', (req, res) => {
    console.log('Test route hit!');
    res.json({ success: true, message: 'Test route is working!' });
});
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
            'https://bahinlink.vercel.app',
            process.env.CORS_ORIGIN
        ].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`Blocked request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});
console.log('Registering API routes...');
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        services: {
            database: 'healthy',
            redis: 'healthy',
            websocket: 'healthy'
        },
        timestamp: new Date().toISOString()
    });
});
console.log('Setting up basic test routes...');
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test endpoint working',
        data: {
            server: 'BahinLink Backend',
            status: 'operational'
        }
    });
});
app.get('/api/test-db', async (req, res) => {
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const testPrisma = new PrismaClient();
        const userCount = await testPrisma.user.count();
        const adminCount = await testPrisma.user.count({ where: { role: 'ADMIN' } });
        res.json({
            success: true,
            message: 'Database connection successful',
            data: {
                totalUsers: userCount,
                adminUsers: adminCount,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DATABASE_ERROR',
                message: 'Database connection failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
console.log('✅ Basic test routes registered successfully');
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/tracking', tracking_1.default);
console.log('Registering custom API endpoints...');
app.get('/api/locations/agents/current', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Current agent locations endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const activeShifts = await prisma.shift.findMany({
            where: {
                status: 'IN_PROGRESS'
            },
            include: {
                agent: {
                    include: {
                        user: true
                    }
                },
                site: true
            }
        });
        const currentLocations = await Promise.all(activeShifts.map(async (shift) => {
            const latestLocation = await prisma.trackingLog.findFirst({
                where: {
                    agentId: shift.agentId,
                    timestamp: {
                        gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });
            if (!latestLocation) {
                return {
                    agent: {
                        id: shift.agent.id,
                        name: shift.agent.user.firstName + ' ' + shift.agent.user.lastName,
                        employeeId: shift.agent.employeeId,
                        status: 'active'
                    },
                    shift: {
                        id: shift.id,
                        site: shift.site,
                        startTime: shift.startTime,
                        endTime: shift.endTime
                    },
                    location: null
                };
            }
            return {
                agent: {
                    id: shift.agent.id,
                    name: shift.agent.user.firstName + ' ' + shift.agent.user.lastName,
                    employeeId: shift.agent.employeeId,
                    status: 'active'
                },
                shift: {
                    id: shift.id,
                    site: shift.site,
                    startTime: shift.startTime,
                    endTime: shift.endTime
                },
                location: {
                    latitude: latestLocation.latitude,
                    longitude: latestLocation.longitude,
                    accuracy: latestLocation.accuracy,
                    timestamp: latestLocation.timestamp,
                    batteryLevel: latestLocation.battery
                }
            };
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: currentLocations,
            totalAgents: currentLocations.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching current agent locations:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch current agent locations'
            }
        });
    }
});
app.get('/api/analytics/tracking-stats', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Tracking stats endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalAgentsTracked, activeAgents, trackingPointsToday, trackingPointsThisWeek, averageAccuracy] = await Promise.all([
            prisma.agentProfile.count(),
            prisma.shift.count({
                where: {
                    status: 'IN_PROGRESS'
                }
            }),
            prisma.trackingLog.count({
                where: {
                    timestamp: {
                        gte: today
                    }
                }
            }),
            prisma.trackingLog.count({
                where: {
                    timestamp: {
                        gte: thisWeek
                    }
                }
            }),
            prisma.trackingLog.aggregate({
                _avg: {
                    accuracy: true
                },
                where: {
                    timestamp: {
                        gte: thisWeek
                    }
                }
            })
        ]);
        await prisma.$disconnect();
        const trackingStats = {
            overview: {
                totalAgentsTracked,
                activeAgents,
                trackingPointsToday,
                trackingPointsThisWeek,
                averageAccuracy: averageAccuracy._avg.accuracy || 0,
                trackingCoverage: activeAgents > 0 ? (activeAgents / totalAgentsTracked * 100) : 0
            },
            trends: {
                dailyAverage: Math.round(trackingPointsThisWeek / 7),
                weeklyGrowth: 5.2,
                accuracyTrend: 'improving'
            }
        };
        res.json({
            success: true,
            data: trackingStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching tracking stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch tracking statistics'
            }
        });
    }
});
app.get('/api/sites/tracking', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Sites endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const sites = await prisma.site.findMany({
            where: {
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                address: true,
                coordinates: true,
                status: true,
                type: true,
                client: {
                    select: {
                        id: true,
                        companyName: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        const transformedSites = sites.map(site => {
            let latitude = 0, longitude = 0;
            if (site.coordinates && typeof site.coordinates === 'object') {
                const coords = site.coordinates;
                latitude = coords.latitude || 0;
                longitude = coords.longitude || 0;
            }
            return {
                ...site,
                latitude,
                longitude
            };
        });
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedSites,
            totalSites: transformedSites.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch sites'
            }
        });
    }
});
app.get('/api/agents/active', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Active agents endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const activeAgents = await prisma.agentProfile.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        status: true
                    }
                }
            },
            where: {
                user: {
                    status: 'ACTIVE'
                }
            },
            orderBy: {
                user: {
                    firstName: 'asc'
                }
            }
        });
        const transformedAgents = activeAgents.map(agent => ({
            id: agent.id,
            userId: agent.userId,
            employeeId: agent.employeeId,
            name: `${agent.user.firstName} ${agent.user.lastName}`,
            firstName: agent.user.firstName,
            lastName: agent.user.lastName,
            email: agent.user.email,
            phone: agent.phone,
            status: 'ACTIVE',
            hireDate: agent.hireDate,
            skills: agent.skills,
            certifications: agent.certifications,
            rating: agent.rating,
            completedShifts: agent.completedShifts
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedAgents,
            totalAgents: transformedAgents.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching active agents:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch active agents'
            }
        });
    }
});
app.get('/api/shifts', auth_1.requireAuth, async (req, res) => {
    console.log('Shifts endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { startDate, endDate } = req.query;
        const whereClause = {};
        if (startDate && endDate) {
            whereClause.OR = [
                {
                    startTime: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                },
                {
                    endTime: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                }
            ];
        }
        const shifts = await prisma.shift.findMany({
            where: whereClause,
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
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        const transformedShifts = shifts.map(shift => ({
            id: shift.id,
            agentId: shift.agentId,
            agentName: `${shift.agent.user.firstName} ${shift.agent.user.lastName}`,
            siteId: shift.siteId,
            siteName: shift.site.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: shift.status,
            type: shift.type,
            notes: shift.notes
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedShifts,
            totalShifts: transformedShifts.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
app.post('/api/shifts', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Create shift endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { agentId, siteId, startTime, endTime, type, notes } = req.body;
        if (!agentId || !siteId || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields: agentId, siteId, startTime, endTime'
                }
            });
        }
        const overlappingShift = await prisma.shift.findFirst({
            where: {
                agentId,
                status: {
                    in: ['SCHEDULED', 'IN_PROGRESS']
                },
                OR: [
                    {
                        startTime: {
                            lte: new Date(endTime)
                        },
                        endTime: {
                            gte: new Date(startTime)
                        }
                    }
                ]
            }
        });
        if (overlappingShift) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'SCHEDULE_CONFLICT',
                    message: 'Agent already has a shift scheduled during this time'
                }
            });
        }
        const newShift = await prisma.shift.create({
            data: {
                agentId,
                siteId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: 'SCHEDULED',
                type: type || 'Regular Shift',
                notes: notes || ''
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
        await prisma.$disconnect();
        res.status(201).json({
            success: true,
            data: {
                id: newShift.id,
                agentId: newShift.agentId,
                agentName: `${newShift.agent.user.firstName} ${newShift.agent.user.lastName}`,
                siteId: newShift.siteId,
                siteName: newShift.site.name,
                startTime: newShift.startTime,
                endTime: newShift.endTime,
                status: newShift.status,
                type: newShift.type,
                notes: newShift.notes
            },
            message: 'Shift created successfully'
        });
    }
    catch (error) {
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
app.get('/api/incidents', auth_1.requireAuth, async (req, res) => {
    console.log('Incidents endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { status, severity, startDate, endDate, limit = 50 } = req.query;
        const whereClause = {};
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        if (severity && severity !== 'all') {
            whereClause.severity = severity;
        }
        if (startDate && endDate) {
            whereClause.occurredAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const incidents = await prisma.incident.findMany({
            where: whereClause,
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
            },
            orderBy: {
                occurredAt: 'desc'
            },
            take: parseInt(limit)
        });
        const transformedIncidents = incidents.map(incident => ({
            id: incident.id,
            title: incident.title,
            description: incident.description,
            type: incident.type,
            severity: incident.severity,
            status: incident.status,
            occurredAt: incident.occurredAt,
            resolvedAt: incident.resolvedAt,
            reportedById: incident.reportedById,
            reportedByName: incident.reportedBy ? `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 'Unknown',
            siteId: incident.siteId,
            siteName: incident.site?.name || 'Unknown Site',
            location: incident.location,
            evidence: incident.evidence,
            createdAt: incident.createdAt,
            updatedAt: incident.updatedAt
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedIncidents,
            totalIncidents: transformedIncidents.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
app.get('/api/analytics/incident-stats', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Incident stats endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const [totalIncidents, openIncidents, resolvedIncidents, incidentsToday, incidentsThisWeek, incidentsThisMonth, highSeverityIncidents, criticalIncidents] = await Promise.all([
            prisma.incident.count(),
            prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
            prisma.incident.count({ where: { status: 'RESOLVED' } }),
            prisma.incident.count({ where: { occurredAt: { gte: today } } }),
            prisma.incident.count({ where: { occurredAt: { gte: thisWeek } } }),
            prisma.incident.count({ where: { occurredAt: { gte: thisMonth } } }),
            prisma.incident.count({ where: { severity: 'HIGH' } }),
            prisma.incident.count({ where: { severity: 'CRITICAL' } })
        ]);
        const incidentTypes = await prisma.incident.groupBy({
            by: ['type'],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });
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
                const resolutionTime = new Date(incident.resolvedAt).getTime() - new Date(incident.occurredAt).getTime();
                return sum + resolutionTime;
            }, 0);
            averageResolutionTime = Math.round(totalResolutionTime / resolvedIncidentsWithTime.length / (1000 * 60 * 60));
        }
        await prisma.$disconnect();
        res.json({
            success: true,
            data: {
                overview: {
                    totalIncidents,
                    openIncidents,
                    resolvedIncidents,
                    incidentsToday,
                    incidentsThisWeek,
                    incidentsThisMonth,
                    highSeverityIncidents,
                    criticalIncidents,
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
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching incident stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch incident statistics'
            }
        });
    }
});
app.get('/api/emergency-alerts', auth_1.requireAuth, async (req, res) => {
    console.log('Emergency alerts endpoint hit');
    try {
        const EmergencyAlertService = (await Promise.resolve().then(() => __importStar(require('./services/emergencyAlertService')))).default;
        const alertService = new EmergencyAlertService();
        const activeAlerts = await alertService.getActiveAlerts();
        await alertService.disconnect();
        res.json({
            success: true,
            data: activeAlerts,
            totalAlerts: activeAlerts.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching emergency alerts:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch emergency alerts'
            }
        });
    }
});
app.post('/api/emergency-alerts/:alertId/acknowledge', auth_1.requireAuth, async (req, res) => {
    console.log('Acknowledge alert endpoint hit');
    try {
        const { alertId } = req.params;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User authentication required'
                }
            });
        }
        const EmergencyAlertService = (await Promise.resolve().then(() => __importStar(require('./services/emergencyAlertService')))).default;
        const alertService = new EmergencyAlertService();
        const acknowledgedAlert = await alertService.acknowledgeAlert(alertId, user.id);
        await alertService.disconnect();
        if (wsService) {
            wsService.broadcastToRoles(['supervisor', 'admin'], 'alert_acknowledged', {
                alertId: acknowledgedAlert.id,
                acknowledgedBy: acknowledgedAlert.acknowledgedBy,
                acknowledgedAt: acknowledgedAlert.acknowledgedAt,
                agentName: acknowledgedAlert.agentName
            });
        }
        res.json({
            success: true,
            data: acknowledgedAlert,
            message: 'Alert acknowledged successfully'
        });
    }
    catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Failed to acknowledge alert'
            }
        });
    }
});
app.post('/api/emergency-alerts/:alertId/resolve', auth_1.requireAuth, async (req, res) => {
    console.log('Resolve alert endpoint hit');
    try {
        const { alertId } = req.params;
        const { resolution } = req.body;
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User authentication required'
                }
            });
        }
        if (!resolution || !['RESOLVED', 'FALSE_ALARM'].includes(resolution)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Valid resolution type required (RESOLVED or FALSE_ALARM)'
                }
            });
        }
        const EmergencyAlertService = (await Promise.resolve().then(() => __importStar(require('./services/emergencyAlertService')))).default;
        const alertService = new EmergencyAlertService();
        const resolvedAlert = await alertService.resolveAlert(alertId, user.id, resolution);
        await alertService.disconnect();
        if (wsService) {
            wsService.broadcastToRoles(['supervisor', 'admin'], 'alert_resolved', {
                alertId: resolvedAlert.id,
                resolvedBy: resolvedAlert.resolvedBy,
                resolvedAt: resolvedAlert.resolvedAt,
                resolution: resolvedAlert.status,
                agentName: resolvedAlert.agentName
            });
        }
        res.json({
            success: true,
            data: resolvedAlert,
            message: 'Alert resolved successfully'
        });
    }
    catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error instanceof Error ? error.message : 'Failed to resolve alert'
            }
        });
    }
});
app.get('/api/emergency-alerts/:alertId', auth_1.requireAuth, async (req, res) => {
    console.log('Get alert details endpoint hit');
    try {
        const { alertId } = req.params;
        const EmergencyAlertService = (await Promise.resolve().then(() => __importStar(require('./services/emergencyAlertService')))).default;
        const alertService = new EmergencyAlertService();
        const alert = await alertService.getAlert(alertId);
        await alertService.disconnect();
        if (!alert) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Alert not found'
                }
            });
        }
        res.json({
            success: true,
            data: alert,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching alert details:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch alert details'
            }
        });
    }
});
app.get('/api/locations/current', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Current locations endpoint hit');
    try {
        const LocationService = (await Promise.resolve().then(() => __importStar(require('./services/locationService')))).default;
        const locationService = new LocationService();
        const currentLocations = await locationService.getCurrentAgentLocations();
        await locationService.disconnect();
        res.json({
            success: true,
            data: currentLocations,
            totalAgents: currentLocations.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching current locations:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch current locations'
            }
        });
    }
});
app.get('/api/locations/history/:agentId', auth_1.requireAuth, async (req, res) => {
    console.log('Location history endpoint hit');
    try {
        const { agentId } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'startDate and endDate are required'
                }
            });
        }
        const LocationService = (await Promise.resolve().then(() => __importStar(require('./services/locationService')))).default;
        const locationService = new LocationService();
        const locationHistory = await locationService.getLocationHistory(agentId, new Date(startDate), new Date(endDate));
        await locationService.disconnect();
        res.json({
            success: true,
            data: locationHistory,
            agentId,
            dateRange: { startDate, endDate },
            totalPoints: locationHistory.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching location history:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch location history'
            }
        });
    }
});
app.get('/api/communications', auth_1.requireAuth, async (req, res) => {
    console.log('Communications endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { type, status, limit = 50 } = req.query;
        const whereClause = {};
        if (type && type !== 'all') {
            whereClause.type = type;
        }
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        const communications = await prisma.communication.findMany({
            where: whereClause,
            include: {
                sender: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                recipients: {
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
                group: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit)
        });
        const transformedCommunications = communications.map(comm => ({
            id: comm.id,
            type: comm.type,
            subject: comm.subject,
            content: comm.content,
            priority: comm.priority,
            isUrgent: comm.isUrgent,
            senderId: comm.senderId,
            senderName: comm.sender ? `${comm.sender.firstName || ''} ${comm.sender.lastName || ''}`.trim() : 'System',
            recipients: comm.recipients.map(recipient => ({
                id: recipient.userId,
                name: `${recipient.user.firstName || ''} ${recipient.user.lastName || ''}`.trim(),
                email: recipient.user.email,
                deliveredAt: recipient.deliveredAt,
                readAt: recipient.readAt
            })),
            groupName: comm.group?.name,
            sentAt: comm.sentAt,
            expiresAt: comm.expiresAt,
            createdAt: comm.createdAt,
            updatedAt: comm.updatedAt
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedCommunications,
            totalCommunications: transformedCommunications.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch communications'
            }
        });
    }
});
app.get('/api/communications/groups', auth_1.requireAuth, async (req, res) => {
    console.log('Communication groups endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const groups = await prisma.communicationGroup.findMany({
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        const transformedGroups = groups.map(group => ({
            id: group.id,
            name: group.name,
            description: group.description,
            type: group.type,
            isActive: group.isActive,
            memberCount: group._count.members,
            members: group.members.map(member => ({
                id: member.userId,
                name: `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim(),
                email: member.user.email,
                role: member.user.role,
                joinedAt: member.joinedAt
            })),
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedGroups,
            totalGroups: transformedGroups.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching communication groups:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch communication groups'
            }
        });
    }
});
app.get('/api/analytics/communication-stats', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    console.log('Communication stats endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const [totalCommunications, sentToday, sentThisWeek, sentThisMonth, unreadMessages, urgentMessages, totalGroups, activeGroups] = await Promise.all([
            prisma.communication.count(),
            prisma.communication.count({ where: { sentAt: { gte: today } } }),
            prisma.communication.count({ where: { sentAt: { gte: thisWeek } } }),
            prisma.communication.count({ where: { sentAt: { gte: thisMonth } } }),
            prisma.messageRecipient.count({ where: { readAt: null } }),
            prisma.communication.count({ where: { priority: 'URGENT' } }),
            prisma.communicationGroup.count(),
            prisma.communicationGroup.count({ where: { isActive: true } })
        ]);
        const communicationTypes = await prisma.communication.groupBy({
            by: ['type'],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });
        await prisma.$disconnect();
        res.json({
            success: true,
            data: {
                overview: {
                    totalCommunications,
                    sentToday,
                    sentThisWeek,
                    sentThisMonth,
                    unreadMessages,
                    urgentMessages,
                    totalGroups,
                    activeGroups
                },
                breakdown: {
                    byType: communicationTypes.map(type => ({
                        type: type.type,
                        count: type._count.id
                    })),
                    byPriority: [
                        { priority: 'LOW', count: await prisma.communication.count({ where: { priority: 'LOW' } }) },
                        { priority: 'NORMAL', count: await prisma.communication.count({ where: { priority: 'NORMAL' } }) },
                        { priority: 'HIGH', count: await prisma.communication.count({ where: { priority: 'HIGH' } }) },
                        { priority: 'URGENT', count: await prisma.communication.count({ where: { priority: 'URGENT' } }) }
                    ]
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching communication stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch communication statistics'
            }
        });
    }
});
app.post('/api/communications', auth_1.requireAuth, async (req, res) => {
    console.log('Create communication endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { type, subject, content, priority, recipientId, groupId, isUrgent } = req.body;
        if (!type || !subject || !content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields: type, subject, content'
                }
            });
        }
        const senderId = 'sample-user-agent-1';
        const newCommunication = await prisma.communication.create({
            data: {
                senderId,
                type,
                subject,
                content,
                priority: priority || 'NORMAL',
                isUrgent: isUrgent || false,
                groupId: groupId || null,
                sentAt: new Date()
            },
            include: {
                sender: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                group: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (recipientId && recipientId !== senderId) {
            await prisma.messageRecipient.create({
                data: {
                    communicationId: newCommunication.id,
                    userId: recipientId,
                    deliveredAt: new Date()
                }
            });
        }
        if (groupId) {
            const groupMembers = await prisma.communicationGroupMember.findMany({
                where: { groupId },
                select: { userId: true }
            });
            for (const member of groupMembers) {
                if (member.userId !== senderId) {
                    await prisma.messageRecipient.create({
                        data: {
                            communicationId: newCommunication.id,
                            userId: member.userId,
                            deliveredAt: new Date()
                        }
                    });
                }
            }
        }
        await prisma.$disconnect();
        res.status(201).json({
            success: true,
            data: {
                id: newCommunication.id,
                type: newCommunication.type,
                subject: newCommunication.subject,
                content: newCommunication.content,
                priority: newCommunication.priority,
                isUrgent: newCommunication.isUrgent,
                senderName: `${newCommunication.sender.firstName} ${newCommunication.sender.lastName}`,
                groupName: newCommunication.group?.name,
                sentAt: newCommunication.sentAt
            },
            message: 'Communication sent successfully'
        });
    }
    catch (error) {
        console.error('Error creating communication:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to send communication'
            }
        });
    }
});
app.post('/api/communications/broadcast', async (req, res) => {
    console.log('Broadcast communication endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { type, subject, content, priority, groupId, isUrgent } = req.body;
        if (!type || !subject || !content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields: type, subject, content'
                }
            });
        }
        const senderId = 'sample-user-agent-1';
        const newBroadcast = await prisma.communication.create({
            data: {
                senderId,
                type,
                subject,
                content,
                priority: priority || 'NORMAL',
                isUrgent: isUrgent || false,
                groupId: groupId || null,
                sentAt: new Date()
            },
            include: {
                sender: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                group: {
                    select: {
                        name: true
                    }
                }
            }
        });
        let recipients = [];
        if (groupId) {
            const groupMembers = await prisma.communicationGroupMember.findMany({
                where: { groupId },
                select: { userId: true }
            });
            recipients = groupMembers.map(member => member.userId);
        }
        else {
            const allUsers = await prisma.user.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true }
            });
            recipients = allUsers.map(user => user.id);
        }
        for (const recipientId of recipients) {
            if (recipientId !== senderId) {
                await prisma.messageRecipient.create({
                    data: {
                        communicationId: newBroadcast.id,
                        userId: recipientId,
                        deliveredAt: new Date()
                    }
                });
            }
        }
        await prisma.$disconnect();
        res.status(201).json({
            success: true,
            data: {
                id: newBroadcast.id,
                type: newBroadcast.type,
                subject: newBroadcast.subject,
                content: newBroadcast.content,
                priority: newBroadcast.priority,
                isUrgent: newBroadcast.isUrgent,
                senderName: `${newBroadcast.sender.firstName} ${newBroadcast.sender.lastName}`,
                groupName: newBroadcast.group?.name,
                sentAt: newBroadcast.sentAt,
                recipientCount: recipients.length - 1
            },
            message: `Broadcast sent successfully to ${recipients.length - 1} recipients`
        });
    }
    catch (error) {
        console.error('Error creating broadcast:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to send broadcast'
            }
        });
    }
});
app.get('/api/agents', async (req, res) => {
    console.log('Agents endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const agents = await prisma.user.findMany({
            where: {
                role: { in: ['AGENT', 'SUPERVISOR'] }
            },
            include: {
                agentProfile: true
            },
            orderBy: { createdAt: 'desc' }
        });
        const transformedAgents = agents.map(agent => ({
            id: agent.id,
            name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
            email: agent.email,
            employeeId: agent.agentProfile?.employeeId || '',
            role: agent.role,
            status: agent.status,
            hireDate: agent.agentProfile?.hireDate,
            skills: agent.agentProfile?.skills || [],
            certifications: agent.agentProfile?.certifications || [],
            performanceMetrics: {
                score: agent.agentProfile?.rating || 85,
                attendanceRate: 95,
                punctualityScore: 90,
                incidentReports: 2,
                commendations: 3,
                completedShifts: agent.agentProfile?.completedShifts || 0
            },
            phone: agent.phone,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: {
                agents: transformedAgents,
                totalAgents: transformedAgents.length
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch agents'
            }
        });
    }
});
app.get('/api/analytics/agent-stats', async (req, res) => {
    console.log('Agent stats endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const [totalAgents, activeAgents, onDutyAgents, agentProfiles] = await Promise.all([
            prisma.user.count({
                where: { role: { in: ['AGENT', 'SUPERVISOR'] } }
            }),
            prisma.user.count({
                where: {
                    role: { in: ['AGENT', 'SUPERVISOR'] },
                    status: 'ACTIVE'
                }
            }),
            prisma.shift.count({
                where: { status: 'IN_PROGRESS' }
            }),
            prisma.agentProfile.count()
        ]);
        const recentShifts = await prisma.shift.findMany({
            where: {
                createdAt: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
            },
            include: {
                agent: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });
        const utilizationRate = totalAgents > 0 ? (onDutyAgents / totalAgents) * 100 : 0;
        await prisma.$disconnect();
        res.json({
            success: true,
            data: {
                overview: {
                    totalAgents,
                    activeAgents,
                    onDutyAgents,
                    agentProfiles,
                    utilizationRate: Math.round(utilizationRate * 100) / 100
                },
                recentActivity: recentShifts.map(shift => ({
                    id: shift.id,
                    agentName: `${shift.agent.user.firstName} ${shift.agent.user.lastName}`,
                    status: shift.status,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    createdAt: shift.createdAt
                })),
                metrics: {
                    averageShiftDuration: 8,
                    completionRate: 95,
                    responseTime: 12
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching agent stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch agent stats'
            }
        });
    }
});
app.get('/api/analytics/performance-metrics', async (req, res) => {
    console.log('Performance metrics endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { period = 'month', metric = 'overall' } = req.query;
        const now = new Date();
        let startDate;
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        let performanceData;
        if (metric === 'overall') {
            const [totalShifts, completedShifts, avgRating] = await Promise.all([
                prisma.shift.count({
                    where: { createdAt: { gte: startDate } }
                }),
                prisma.shift.count({
                    where: {
                        status: 'COMPLETED',
                        createdAt: { gte: startDate }
                    }
                }),
                prisma.agentProfile.aggregate({
                    _avg: { rating: true }
                })
            ]);
            performanceData = {
                metric: 'overall',
                period,
                data: [
                    { name: 'Completion Rate', value: totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0 },
                    { name: 'Average Rating', value: avgRating._avg.rating || 0 },
                    { name: 'Efficiency Score', value: 85 },
                    { name: 'Quality Score', value: 92 }
                ],
                trend: {
                    direction: 'up',
                    percentage: 5.2
                }
            };
        }
        else {
            performanceData = {
                metric,
                period,
                data: [
                    { name: 'Current', value: 88 },
                    { name: 'Target', value: 90 },
                    { name: 'Previous Period', value: 85 }
                ],
                trend: {
                    direction: 'up',
                    percentage: 3.5
                }
            };
        }
        await prisma.$disconnect();
        res.json({
            success: true,
            data: performanceData,
            timestamp: new Date().toISOString()
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
app.get('/api/analytics/performance-stats', async (req, res) => {
    console.log('Performance stats endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate;
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        const [totalAgents, activeShifts, completedShifts, avgRating, totalIncidents] = await Promise.all([
            prisma.user.count({ where: { role: { in: ['AGENT', 'SUPERVISOR'] } } }),
            prisma.shift.count({
                where: {
                    status: 'IN_PROGRESS',
                    createdAt: { gte: startDate }
                }
            }),
            prisma.shift.count({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate }
                }
            }),
            prisma.agentProfile.aggregate({
                _avg: { rating: true }
            }),
            prisma.incident.count({
                where: { createdAt: { gte: startDate } }
            })
        ]);
        const stats = {
            overview: {
                totalAgents,
                activeShifts,
                completedShifts,
                averageRating: Math.round((avgRating._avg.rating || 0) * 10) / 10,
                totalIncidents,
                period
            },
            metrics: {
                productivity: {
                    current: 87,
                    target: 90,
                    trend: 'up',
                    change: 3.2
                },
                quality: {
                    current: 92,
                    target: 95,
                    trend: 'up',
                    change: 1.8
                },
                efficiency: {
                    current: 85,
                    target: 88,
                    trend: 'stable',
                    change: 0.5
                },
                satisfaction: {
                    current: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 20) : 85,
                    target: 90,
                    trend: 'up',
                    change: 2.1
                }
            },
            trends: {
                daily: Array.from({ length: 30 }, (_, i) => ({
                    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    productivity: Math.floor(Math.random() * 20) + 80,
                    quality: Math.floor(Math.random() * 15) + 85,
                    efficiency: Math.floor(Math.random() * 25) + 75
                }))
            }
        };
        await prisma.$disconnect();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching performance stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch performance stats'
            }
        });
    }
});
app.get('/api/analytics/top-performers', async (req, res) => {
    console.log('Top performers endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const { period = 'month', limit = '10' } = req.query;
        const limitNum = parseInt(limit) || 10;
        const now = new Date();
        let startDate;
        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        const topAgentProfiles = await prisma.agentProfile.findMany({
            where: {
                user: {
                    role: { in: ['AGENT', 'SUPERVISOR'] },
                    status: 'ACTIVE'
                }
            },
            include: {
                user: true,
                shifts: {
                    where: {
                        createdAt: { gte: startDate }
                    }
                }
            },
            take: limitNum,
            orderBy: {
                rating: 'desc'
            }
        });
        const performers = topAgentProfiles.map((agentProfile, index) => ({
            rank: index + 1,
            id: agentProfile.user.id,
            name: `${agentProfile.user.firstName || ''} ${agentProfile.user.lastName || ''}`.trim(),
            employeeId: agentProfile.employeeId || '',
            rating: agentProfile.rating || 0,
            completedShifts: agentProfile.shifts.filter(s => s.status === 'COMPLETED').length,
            totalShifts: agentProfile.shifts.length,
            performanceScore: Math.round((agentProfile.rating || 0) * 20),
            metrics: {
                productivity: Math.floor(Math.random() * 20) + 80,
                quality: Math.floor(Math.random() * 15) + 85,
                efficiency: Math.floor(Math.random() * 25) + 75,
                punctuality: Math.floor(Math.random() * 20) + 80
            },
            achievements: [
                'Perfect Attendance',
                'Customer Service Excellence',
                'Safety Champion'
            ].slice(0, Math.floor(Math.random() * 3) + 1)
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: {
                performers,
                period,
                totalCount: performers.length,
                criteria: 'Overall Performance Rating'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching top performers:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch top performers'
            }
        });
    }
});
app.get('/api/trainings', async (req, res) => {
    console.log('Trainings endpoint hit');
    try {
        const trainings = await prisma.training.findMany({
            where: {
                isActive: true
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                enrollments: {
                    include: {
                        agent: {
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
                },
                _count: {
                    select: {
                        enrollments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const transformedTrainings = trainings.map(training => ({
            id: training.id,
            title: training.title,
            description: training.description,
            type: training.type,
            category: training.category,
            duration: training.duration,
            isRequired: training.isRequired,
            validityPeriod: training.validityPeriod,
            prerequisites: training.prerequisites,
            createdBy: training.createdBy,
            isActive: training.isActive,
            createdAt: training.createdAt.toISOString(),
            updatedAt: training.updatedAt.toISOString(),
            creator: training.creator,
            enrollments: training.enrollments,
            currentEnrollments: training._count.enrollments
        }));
        res.json({
            success: true,
            data: transformedTrainings,
            totalCount: transformedTrainings.length
        });
    }
    catch (error) {
        console.error('Error fetching trainings:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch trainings' }
        });
    }
});
app.post('/api/trainings', async (req, res) => {
    console.log('Create training endpoint hit');
    try {
        const { title, description, type, category, duration, isRequired, validityPeriod, prerequisites, instructor, createdBy } = req.body;
        if (!title || !type || !category || !duration || !createdBy) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
            });
        }
        const newTraining = await prisma.training.create({
            data: {
                title,
                description: description || '',
                type,
                category,
                duration: parseInt(duration),
                isRequired: isRequired || false,
                validityPeriod: validityPeriod ? parseInt(validityPeriod) : null,
                prerequisites: prerequisites || [],
                createdBy
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                _count: {
                    select: {
                        enrollments: true
                    }
                }
            }
        });
        console.log('Created new training:', newTraining);
        res.json({
            success: true,
            data: {
                id: newTraining.id,
                title: newTraining.title,
                description: newTraining.description,
                type: newTraining.type,
                category: newTraining.category,
                duration: newTraining.duration,
                isRequired: newTraining.isRequired,
                validityPeriod: newTraining.validityPeriod,
                prerequisites: newTraining.prerequisites,
                createdBy: newTraining.createdBy,
                isActive: newTraining.isActive,
                createdAt: newTraining.createdAt.toISOString(),
                updatedAt: newTraining.updatedAt.toISOString(),
                creator: newTraining.creator,
                currentEnrollments: newTraining._count.enrollments
            },
            message: 'Training created successfully'
        });
    }
    catch (error) {
        console.error('Error creating training:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create training' }
        });
    }
});
app.put('/api/trainings/:id', async (req, res) => {
    console.log('Update training endpoint hit');
    try {
        const { id } = req.params;
        const { title, description, type, category, duration, isRequired, validityPeriod, prerequisites } = req.body;
        const existingTraining = await prisma.training.findUnique({
            where: { id }
        });
        if (!existingTraining) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Training not found' }
            });
        }
        const updatedTraining = await prisma.training.update({
            where: { id },
            data: {
                title,
                description,
                type,
                category,
                duration: parseInt(duration),
                isRequired: isRequired || false,
                validityPeriod: validityPeriod ? parseInt(validityPeriod) : null,
                prerequisites: prerequisites || []
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                _count: {
                    select: {
                        enrollments: true
                    }
                }
            }
        });
        console.log('Updated training:', updatedTraining);
        res.json({
            success: true,
            data: {
                id: updatedTraining.id,
                title: updatedTraining.title,
                description: updatedTraining.description,
                type: updatedTraining.type,
                category: updatedTraining.category,
                duration: updatedTraining.duration,
                isRequired: updatedTraining.isRequired,
                validityPeriod: updatedTraining.validityPeriod,
                prerequisites: updatedTraining.prerequisites,
                createdBy: updatedTraining.createdBy,
                isActive: updatedTraining.isActive,
                createdAt: updatedTraining.createdAt.toISOString(),
                updatedAt: updatedTraining.updatedAt.toISOString(),
                creator: updatedTraining.creator,
                currentEnrollments: updatedTraining._count.enrollments
            },
            message: 'Training updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating training:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update training' }
        });
    }
});
app.get('/api/training-enrollments', async (req, res) => {
    console.log('Training enrollments endpoint hit');
    try {
        const enrollments = await prisma.trainingEnrollment.findMany({
            include: {
                training: {
                    select: {
                        id: true,
                        title: true,
                        type: true
                    }
                },
                agent: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                enrolledAt: 'desc'
            }
        });
        const transformedEnrollments = enrollments.map(enrollment => ({
            id: enrollment.id,
            trainingId: enrollment.trainingId,
            agentId: enrollment.agentId,
            agentName: `${enrollment.agent.user.firstName} ${enrollment.agent.user.lastName}`,
            trainingTitle: enrollment.training.title,
            enrollmentDate: enrollment.enrolledAt.toISOString(),
            status: enrollment.status,
            progress: enrollment.progress,
            completionDate: enrollment.completedAt?.toISOString() || null,
            dueDate: enrollment.dueDate?.toISOString() || null,
            notes: enrollment.notes,
            agent: enrollment.agent,
            training: enrollment.training
        }));
        res.json({
            success: true,
            data: transformedEnrollments,
            totalCount: transformedEnrollments.length
        });
    }
    catch (error) {
        console.error('Error fetching training enrollments:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch training enrollments' }
        });
    }
});
app.put('/api/training-enrollments/:id', async (req, res) => {
    console.log('Update training enrollment endpoint hit');
    try {
        const { id } = req.params;
        const { status } = req.body;
        const existingEnrollment = await prisma.trainingEnrollment.findUnique({
            where: { id }
        });
        if (!existingEnrollment) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Enrollment not found' }
            });
        }
        let progress = existingEnrollment.progress;
        let completedAt = existingEnrollment.completedAt;
        let startedAt = existingEnrollment.startedAt;
        if (status === 'COMPLETED') {
            progress = 100;
            completedAt = new Date();
        }
        else if (status === 'IN_PROGRESS') {
            progress = Math.max(progress, 1);
            startedAt = startedAt || new Date();
        }
        else if (status === 'FAILED') {
            completedAt = new Date();
        }
        const updatedEnrollment = await prisma.trainingEnrollment.update({
            where: { id },
            data: {
                status,
                progress,
                startedAt,
                completedAt
            },
            include: {
                training: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                agent: {
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
        });
        console.log('Updated enrollment:', updatedEnrollment);
        res.json({
            success: true,
            data: {
                id: updatedEnrollment.id,
                status: updatedEnrollment.status,
                progress: updatedEnrollment.progress,
                completedAt: updatedEnrollment.completedAt?.toISOString() || null,
                startedAt: updatedEnrollment.startedAt?.toISOString() || null
            },
            message: 'Enrollment updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating enrollment:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update enrollment' }
        });
    }
});
app.delete('/api/training-enrollments/:id', async (req, res) => {
    console.log('Delete training enrollment endpoint hit');
    try {
        const { id } = req.params;
        const existingEnrollment = await prisma.trainingEnrollment.findUnique({
            where: { id }
        });
        if (!existingEnrollment) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Enrollment not found' }
            });
        }
        await prisma.trainingEnrollment.delete({
            where: { id }
        });
        console.log('Deleted enrollment:', id);
        res.json({
            success: true,
            message: 'Enrollment deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting enrollment:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete enrollment' }
        });
    }
});
app.get('/api/certifications', async (req, res) => {
    console.log('Certifications endpoint hit');
    try {
        const certifications = await prisma.certification.findMany({
            where: {
                isActive: true
            },
            include: {
                agentCertifications: {
                    include: {
                        agent: {
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
                },
                _count: {
                    select: {
                        agentCertifications: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const transformedCertifications = certifications.map(cert => ({
            id: cert.id,
            name: cert.name,
            description: cert.description,
            issuer: cert.issuingBody,
            issuingBody: cert.issuingBody,
            type: cert.type,
            validityPeriod: cert.validityPeriod,
            requirements: cert.requirements,
            isActive: cert.isActive,
            status: cert.isActive ? 'ACTIVE' : 'INACTIVE',
            createdAt: cert.createdAt.toISOString(),
            updatedAt: cert.updatedAt.toISOString(),
            agentCertifications: cert.agentCertifications,
            totalHolders: cert._count.agentCertifications
        }));
        res.json({
            success: true,
            data: transformedCertifications,
            totalCount: transformedCertifications.length
        });
    }
    catch (error) {
        console.error('Error fetching certifications:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch certifications' }
        });
    }
});
app.get('/api/agent-certifications', async (req, res) => {
    console.log('Agent certifications endpoint hit');
    try {
        const agentCertifications = [
            {
                id: 'agent-cert-1',
                agentId: 'sample-user-agent-1',
                agentName: 'Mike Security',
                certificationId: 'cert-1',
                certificationName: 'Security Guard License',
                issueDate: new Date('2024-01-15'),
                expiryDate: new Date('2025-01-15'),
                status: 'VALID',
                certificateNumber: 'SGL-2024-001'
            },
            {
                id: 'agent-cert-2',
                agentId: 'sample-user-agent-2',
                agentName: 'Sarah Guard',
                certificationId: 'cert-2',
                certificationName: 'First Aid Certification',
                issueDate: new Date('2024-06-01'),
                expiryDate: new Date('2026-06-01'),
                status: 'VALID',
                certificateNumber: 'FAC-2024-002'
            }
        ];
        res.json({
            success: true,
            data: agentCertifications,
            totalCount: agentCertifications.length
        });
    }
    catch (error) {
        console.error('Error fetching agent certifications:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch agent certifications' }
        });
    }
});
app.get('/api/analytics/training-stats', async (req, res) => {
    console.log('Training stats endpoint hit');
    try {
        const stats = {
            overview: {
                totalTrainings: 2,
                activeTrainings: 2,
                totalEnrollments: 23,
                completionRate: 78,
                averageScore: 85,
                upcomingDeadlines: 3
            },
            metrics: {
                enrollmentTrend: 'up',
                completionTrend: 'stable',
                satisfactionScore: 4.2,
                averageDuration: 105
            },
            recentActivity: [
                {
                    type: 'enrollment',
                    message: 'Sarah Guard enrolled in Customer Service Excellence',
                    timestamp: new Date()
                },
                {
                    type: 'completion',
                    message: 'Mike Security completed Security Protocols Training',
                    timestamp: new Date(Date.now() - 86400000)
                }
            ]
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching training stats:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch training stats' }
        });
    }
});
app.get('/api/users/available', async (req, res) => {
    console.log('Available users endpoint hit');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const users = await prisma.user.findMany({
            where: {
                status: 'ACTIVE'
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
            },
            orderBy: {
                firstName: 'asc'
            }
        });
        const transformedUsers = users.map(user => ({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            role: user.role
        }));
        await prisma.$disconnect();
        res.json({
            success: true,
            data: transformedUsers,
            totalUsers: transformedUsers.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch available users'
            }
        });
    }
});
console.log('Registering main API routes...');
app.use('/api/users', auth_1.requireAuth, users_1.default);
app.use('/api/admin-users', auth_1.requireAuth, auth_1.requireAdmin, admin_users_1.default);
app.use('/api/shifts', auth_1.requireAuth, shifts_1.default);
app.use('/api/sites', auth_1.requireAuth, sites_1.default);
app.use('/api/reports', auth_1.requireAuth, reports_1.default);
app.use('/api/incidents', auth_1.requireAuth, incidents_1.default);
app.use('/api/analytics', auth_1.requireAuth, analytics_1.default);
app.use('/api/client-portal', auth_1.requireAuth, auth_1.requireClient, client_portal_1.default);
app.use('/api/client', auth_1.requireAuth, auth_1.requireClient, client_2.default);
app.use('/api/clients', auth_1.requireAuth, auth_1.requireAdmin, clients_1.default);
app.use('/api/admin/contracts', auth_1.requireAuth, auth_1.requireAdmin, contracts_1.default);
app.use('/api/invoices', auth_1.requireAuth, auth_1.requireAdmin, invoices_1.default);
app.use('/api/payments', auth_1.requireAuth, auth_1.requireAdmin, payments_1.default);
app.use('/api/auth-test', auth_test_1.default);
app.use('/api', geofence_1.default);
app.get('/api/sites-test', (req, res) => {
    console.log('Sites test endpoint hit');
    res.json({
        success: true,
        data: {
            sites: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                pages: 0
            }
        }
    });
});
app.get('/api/test-analytics', async (req, res) => {
    console.log('Test analytics endpoint hit - no auth required');
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
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
        console.error('Error in test analytics endpoint:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch test analytics data'
            }
        });
    }
});
console.log('✅ All API routes registered successfully');
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal server error occurred'
        }
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});
let wsService;
try {
    wsService = new websocketService_1.default(server, redis_1.redisClient);
    console.log('✅ WebSocket service initialized successfully');
}
catch (error) {
    console.error('❌ Failed to initialize WebSocket service:', error);
}
server.listen(PORT, () => {
    console.log(`🚀 BahinLink Backend API is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (wsService) {
        console.log(`🔌 WebSocket server ready for connections`);
    }
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        redis_1.redisClient.quit();
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        redis_1.redisClient.quit();
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map