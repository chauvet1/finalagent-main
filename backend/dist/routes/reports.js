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
router.get('/', [
    auth_1.requireAuth,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('type').optional().isIn(['PATROL', 'INCIDENT', 'INSPECTION', 'MAINTENANCE', 'EMERGENCY']),
    (0, express_validator_1.query)('status').optional().isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']),
    (0, express_validator_1.query)('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.query)('agentId').optional().isUUID(),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('shiftId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type;
        const status = req.query.status;
        const priority = req.query.priority;
        const agentId = req.query.agentId;
        const siteId = req.query.siteId;
        const shiftId = req.query.shiftId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const offset = (page - 1) * limit;
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        if (agentId)
            where.agentId = agentId;
        if (siteId)
            where.siteId = siteId;
        if (shiftId)
            where.shiftId = shiftId;
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
router.get('/:id', [
    auth_1.requireAuth,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid report ID')
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
    }
    catch (error) {
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
router.post('/', [
    auth_1.requireAuth,
    auth_1.requireAgent,
    (0, express_validator_1.body)('type').isIn(['PATROL', 'INCIDENT', 'INSPECTION', 'MAINTENANCE', 'EMERGENCY']),
    (0, express_validator_1.body)('title').isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('content').isString().isLength({ min: 1, max: 10000 }).trim(),
    (0, express_validator_1.body)('agentId').isUUID().withMessage('Valid agent ID is required'),
    (0, express_validator_1.body)('siteId').isUUID().withMessage('Valid site ID is required'),
    (0, express_validator_1.body)('shiftId').optional().isUUID(),
    (0, express_validator_1.body)('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.body)('location').optional().isObject(),
    (0, express_validator_1.body)('templateId').optional().isUUID(),
    (0, express_validator_1.body)('formData').optional().isObject(),
], handleValidationErrors, async (req, res) => {
    try {
        const { type, title, content, agentId, siteId, shiftId, priority = 'NORMAL', location, templateId, formData } = req.body;
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
        const report = await prisma.report.create({
            data: {
                type,
                title,
                content,
                authorId: agentId,
                siteId,
                shiftId,
                priority,
                status: 'DRAFT',
                reportDate: new Date()
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
    }
    catch (error) {
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
router.put('/:id', [
    auth_1.requireAuth,
    auth_1.requireAgent,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid report ID'),
    (0, express_validator_1.body)('title').optional().isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('content').optional().isString().isLength({ min: 1, max: 10000 }).trim(),
    (0, express_validator_1.body)('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
    (0, express_validator_1.body)('status').optional().isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']),
    (0, express_validator_1.body)('reviewNotes').optional().isString().isLength({ max: 2000 }).trim(),
    (0, express_validator_1.body)('formData').optional().isObject(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
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
    }
    catch (error) {
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
router.post('/:id/submit', [
    auth_1.requireAuth,
    auth_1.requireAgent,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid report ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
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
    }
    catch (error) {
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
exports.default = router;
//# sourceMappingURL=reports.js.map