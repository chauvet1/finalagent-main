"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const reportGenerationService_1 = __importDefault(require("../services/reportGenerationService"));
const incidentNotificationService_1 = __importDefault(require("../services/incidentNotificationService"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'incidents');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `incident-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'));
        }
    }
});
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
router.get('/', [
    auth_1.requireAuth,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('type').optional().isIn(['SECURITY_BREACH', 'THEFT', 'VANDALISM', 'MEDICAL_EMERGENCY', 'FIRE', 'TECHNICAL_ISSUE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_VIOLATION', 'OTHER']),
    (0, express_validator_1.query)('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.query)('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    (0, express_validator_1.query)('reportedById').optional().isUUID(),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('clientId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type;
        const severity = req.query.severity;
        const status = req.query.status;
        const reportedById = req.query.reportedById;
        const siteId = req.query.siteId;
        const clientId = req.query.clientId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const offset = (page - 1) * limit;
        const where = {};
        if (type)
            where.type = type;
        if (severity)
            where.severity = severity;
        if (status)
            where.status = status;
        if (reportedById)
            where.reportedById = reportedById;
        if (siteId)
            where.siteId = siteId;
        if (clientId)
            where.clientId = clientId;
        if (startDate || endDate) {
            where.occurredAt = {};
            if (startDate)
                where.occurredAt.gte = new Date(startDate);
            if (endDate)
                where.occurredAt.lte = new Date(endDate);
        }
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
router.get('/:id', [
    auth_1.requireAuth,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid incident ID')
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
    }
    catch (error) {
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
router.post('/', [
    auth_1.requireAuth,
    auth_1.requireAgent,
], upload.array('evidence', 5), [
    (0, express_validator_1.body)('title').isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('description').isString().isLength({ min: 1, max: 5000 }).trim(),
    (0, express_validator_1.body)('type').isIn(['SECURITY_BREACH', 'THEFT', 'VANDALISM', 'MEDICAL_EMERGENCY', 'FIRE', 'TECHNICAL_ISSUE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_VIOLATION', 'OTHER']),
    (0, express_validator_1.body)('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.body)('siteId').isUUID().withMessage('Valid site ID is required'),
    (0, express_validator_1.body)('reportedById').optional().isUUID(),
    (0, express_validator_1.body)('clientId').optional().isUUID(),
    (0, express_validator_1.body)('shiftId').optional().isUUID(),
    (0, express_validator_1.body)('location').optional().isString().isLength({ max: 500 }),
    (0, express_validator_1.body)('occurredAt').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const { title, description, type, severity = 'MEDIUM', siteId, reportedById, clientId, shiftId, location, occurredAt } = req.body;
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
        const evidenceFiles = req.files;
        const evidence = evidenceFiles ? evidenceFiles.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path
        })) : [];
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
        const notificationService = incidentNotificationService_1.default.getInstance();
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
    }
    catch (error) {
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
router.put('/:id', [
    auth_1.requireAuth,
    auth_1.requireAgent,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid incident ID'),
    (0, express_validator_1.body)('title').optional().isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('description').optional().isString().isLength({ min: 1, max: 5000 }).trim(),
    (0, express_validator_1.body)('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.body)('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    (0, express_validator_1.body)('location').optional().isString().isLength({ max: 500 }),
    (0, express_validator_1.body)('resolvedAt').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
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
        const oldStatus = existingIncident.status;
        if (updateData.status === 'RESOLVED' && !updateData.resolvedAt) {
            updateData.resolvedAt = new Date();
        }
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
        const notificationService = incidentNotificationService_1.default.getInstance();
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
    }
    catch (error) {
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
router.post('/:id/escalate', [
    auth_1.requireAuth,
    auth_1.requireAgent,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid incident ID'),
    (0, express_validator_1.body)('escalationReason').isString().isLength({ min: 1, max: 1000 }).trim(),
    (0, express_validator_1.body)('escalatedTo').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const { escalationReason, escalatedTo } = req.body;
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
        const incident = await prisma.incident.update({
            where: { id },
            data: {
                severity: existingIncident.severity === 'CRITICAL' ? 'CRITICAL' :
                    existingIncident.severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
                status: 'IN_PROGRESS',
                updatedAt: new Date()
            }
        });
        const notificationService = incidentNotificationService_1.default.getInstance();
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
    }
    catch (error) {
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
router.get('/:id/reports', [
    auth_1.requireAuth,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid incident ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
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
    }
    catch (error) {
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
router.post('/reports/generate', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.body)('format').isIn(['PDF', 'EXCEL']).withMessage('Format must be PDF or EXCEL'),
    (0, express_validator_1.body)('type').optional().isIn(['INCIDENT_SUMMARY', 'INCIDENT_DETAILED', 'INCIDENT_ANALYTICS']),
    (0, express_validator_1.body)('filters').optional().isObject(),
    (0, express_validator_1.body)('includeEvidence').optional().isBoolean(),
], handleValidationErrors, async (req, res) => {
    try {
        const { format, type = 'INCIDENT_DETAILED', filters, includeEvidence = false } = req.body;
        const reportService = reportGenerationService_1.default.getInstance();
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
        const filename = path_1.default.basename(reportPath);
        res.json({
            success: true,
            data: {
                filename,
                downloadUrl: `/api/incidents/reports/download/${filename}`,
                generatedAt: new Date().toISOString()
            },
            message: 'Report generated successfully'
        });
    }
    catch (error) {
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
router.get('/reports/download/:filename', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_FILENAME',
                    message: 'Invalid filename'
                }
            });
        }
        const reportService = reportGenerationService_1.default.getInstance();
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
        const ext = path_1.default.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        let disposition = 'attachment';
        if (ext === '.pdf') {
            contentType = 'application/pdf';
        }
        else if (ext === '.xlsx') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        const fileStream = fs_1.default.createReadStream(filePath);
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
    }
    catch (error) {
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
router.get('/stats', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const [totalIncidents, openIncidents, inProgressIncidents, resolvedIncidents, incidentsToday, incidentsThisWeek, incidentsThisMonth, criticalIncidents, highSeverityIncidents] = await Promise.all([
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
        const incidentTypes = await prisma.incident.groupBy({
            by: ['type'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
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
    }
    catch (error) {
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
exports.default = router;
//# sourceMappingURL=incidents.js.map