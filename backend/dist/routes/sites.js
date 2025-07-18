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
    auth_1.requireAdmin,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED']),
    (0, express_validator_1.query)('clientId').optional().isUUID(),
    (0, express_validator_1.query)('search').optional().isString().trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const clientId = req.query.clientId;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        console.log('Sites endpoint hit - attempting database query');
        console.log('Query parameters:', { page, limit, status, clientId, search });
        console.log('Where clause:', where);
        const [sites, total] = await Promise.all([
            prisma.site.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.site.count({ where })
        ]);
        console.log('Database query successful. Found sites:', sites.length);
        res.json({
            success: true,
            data: {
                sites,
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
        console.error('Error fetching sites:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch sites',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});
router.get('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid site ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const site = await prisma.site.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        contactPerson: true,
                        billingAddress: true
                    }
                },
                shifts: {
                    where: {
                        startTime: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 7))
                        }
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
                    },
                    orderBy: { startTime: 'desc' }
                },
                geofences: true,
                reports: {
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 30))
                        }
                    },
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        priority: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
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
        res.json({
            success: true,
            data: { site }
        });
    }
    catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch site'
            }
        });
    }
});
router.post('/', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.body)('name').isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('address').isString().isLength({ min: 1, max: 500 }).trim(),
    (0, express_validator_1.body)('clientId').isUUID().withMessage('Valid client ID is required'),
    (0, express_validator_1.body)('coordinates.latitude').isFloat({ min: -90, max: 90 }),
    (0, express_validator_1.body)('coordinates.longitude').isFloat({ min: -180, max: 180 }),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 1000 }).trim(),
    (0, express_validator_1.body)('contactInfo').optional().isObject(),
    (0, express_validator_1.body)('accessInstructions').optional().isString().isLength({ max: 2000 }).trim(),
    (0, express_validator_1.body)('emergencyProcedures').optional().isString().isLength({ max: 2000 }).trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const { name, address, clientId, coordinates, description, contactInfo, accessInstructions, emergencyProcedures } = req.body;
        const client = await prisma.clientProfile.findUnique({
            where: { id: clientId }
        });
        if (!client) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'CLIENT_NOT_FOUND',
                    message: 'Client not found'
                }
            });
        }
        const site = await prisma.site.create({
            data: {
                name,
                address,
                city: address || 'Unknown',
                country: 'US',
                type: 'OFFICE',
                clientId,
                coordinates,
                description,
                status: 'ACTIVE'
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        contactPerson: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: { site }
        });
    }
    catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create site'
            }
        });
    }
});
router.put('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid site ID'),
    (0, express_validator_1.body)('name').optional().isString().isLength({ min: 1, max: 200 }).trim(),
    (0, express_validator_1.body)('address').optional().isString().isLength({ min: 1, max: 500 }).trim(),
    (0, express_validator_1.body)('coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
    (0, express_validator_1.body)('coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 1000 }).trim(),
    (0, express_validator_1.body)('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED']),
    (0, express_validator_1.body)('contactInfo').optional().isObject(),
    (0, express_validator_1.body)('accessInstructions').optional().isString().isLength({ max: 2000 }).trim(),
    (0, express_validator_1.body)('emergencyProcedures').optional().isString().isLength({ max: 2000 }).trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const existingSite = await prisma.site.findUnique({
            where: { id }
        });
        if (!existingSite) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SITE_NOT_FOUND',
                    message: 'Site not found'
                }
            });
        }
        const site = await prisma.site.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date()
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        contactPerson: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: { site }
        });
    }
    catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update site'
            }
        });
    }
});
router.delete('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid site ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const existingSite = await prisma.site.findUnique({
            where: { id }
        });
        if (!existingSite) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'SITE_NOT_FOUND',
                    message: 'Site not found'
                }
            });
        }
        const activeShifts = await prisma.shift.count({
            where: {
                siteId: id,
                status: {
                    in: ['SCHEDULED', 'IN_PROGRESS']
                },
            }
        });
        if (activeShifts > 0) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'SITE_HAS_ACTIVE_SHIFTS',
                    message: 'Cannot delete site with active shifts'
                }
            });
        }
        await prisma.site.update({
            where: { id },
            data: {
                status: 'INACTIVE'
            }
        });
        res.json({
            success: true,
            message: 'Site deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete site'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=sites.js.map