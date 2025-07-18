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
router.get('/', auth_1.requireAuth, [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    (0, express_validator_1.query)('agentId').optional().isUUID(),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const agentId = req.query.agentId;
        const siteId = req.query.siteId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const offset = (page - 1) * limit;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (agentId) {
            where.agentId = agentId;
        }
        if (siteId) {
            where.siteId = siteId;
        }
        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {
                where.startTime.gte = new Date(startDate);
            }
            if (endDate) {
                where.startTime.lte = new Date(endDate);
            }
        }
        const [shifts, total] = await Promise.all([
            prisma.shift.findMany({
                where,
                skip: offset,
                take: limit,
                include: {
                    agent: {
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
                            coordinates: true
                        }
                    },
                },
                orderBy: { startTime: 'desc' }
            }),
            prisma.shift.count({ where })
        ]);
        res.json({
            success: true,
            data: {
                shifts,
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
router.get('/:id', auth_1.requireAuth, [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid shift ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await prisma.shift.findUnique({
            where: { id },
            include: {
                agent: {
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
                                companyName: true
                            }
                        }
                    }
                },
                reports: {
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        status: true,
                        priority: true,
                        createdAt: true
                    }
                }
            }
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
        res.json({
            success: true,
            data: { shift }
        });
    }
    catch (error) {
        console.error('Error fetching shift:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch shift'
            }
        });
    }
});
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.body)('agentId').isUUID().withMessage('Valid agent ID is required'),
    (0, express_validator_1.body)('siteId').isUUID().withMessage('Valid site ID is required'),
    (0, express_validator_1.body)('startTime').isISO8601().withMessage('Valid start time is required'),
    (0, express_validator_1.body)('endTime').isISO8601().withMessage('Valid end time is required'),
    (0, express_validator_1.body)('type').optional().isIn(['REGULAR', 'OVERTIME', 'EMERGENCY', 'TRAINING']),
    (0, express_validator_1.body)('supervisorId').optional().isUUID(),
    (0, express_validator_1.body)('instructions').optional().isString().isLength({ max: 1000 }),
], handleValidationErrors, async (req, res) => {
    try {
        const { agentId, siteId, startTime, endTime, type = 'REGULAR', supervisorId, instructions } = req.body;
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
        const conflictingShift = await prisma.shift.findFirst({
            where: {
                agentId,
                status: {
                    in: ['SCHEDULED', 'IN_PROGRESS']
                },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: new Date(startTime) } },
                            { endTime: { gt: new Date(startTime) } }
                        ]
                    },
                    {
                        AND: [
                            { startTime: { lt: new Date(endTime) } },
                            { endTime: { gte: new Date(endTime) } }
                        ]
                    },
                    {
                        AND: [
                            { startTime: { gte: new Date(startTime) } },
                            { endTime: { lte: new Date(endTime) } }
                        ]
                    }
                ]
            }
        });
        if (conflictingShift) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'SCHEDULING_CONFLICT',
                    message: 'Agent already has a shift scheduled during this time'
                }
            });
        }
        const shift = await prisma.shift.create({
            data: {
                agentId,
                siteId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                type,
                status: 'SCHEDULED'
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
        res.status(201).json({
            success: true,
            data: { shift }
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
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid shift ID'),
    (0, express_validator_1.body)('startTime').optional().isISO8601(),
    (0, express_validator_1.body)('endTime').optional().isISO8601(),
    (0, express_validator_1.body)('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    (0, express_validator_1.body)('instructions').optional().isString().isLength({ max: 1000 }),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const { startTime, endTime, status, instructions } = req.body;
        const existingShift = await prisma.shift.findUnique({
            where: { id }
        });
        if (!existingShift) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SHIFT_NOT_FOUND',
                    message: 'Shift not found'
                }
            });
        }
        const shift = await prisma.shift.update({
            where: { id },
            data: {
                ...(startTime && { startTime: new Date(startTime) }),
                ...(endTime && { endTime: new Date(endTime) }),
                ...(status && { status }),
                ...(instructions && { instructions }),
                updatedAt: new Date()
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
        res.json({
            success: true,
            data: { shift }
        });
    }
    catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update shift'
            }
        });
    }
});
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid shift ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const existingShift = await prisma.shift.findUnique({
            where: { id },
            include: {
                attendance: true,
                reports: true,
                incidents: true
            }
        });
        if (!existingShift) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SHIFT_NOT_FOUND',
                    message: 'Shift not found'
                }
            });
        }
        if (existingShift.attendance.length > 0 || existingShift.reports.length > 0 || existingShift.incidents.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'SHIFT_HAS_DEPENDENCIES',
                    message: 'Cannot delete shift with existing attendance records, reports, or incidents'
                }
            });
        }
        await prisma.shift.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Shift deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete shift'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=shifts.js.map