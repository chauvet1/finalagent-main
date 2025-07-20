"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
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
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('serviceLevel').optional().isString(),
    (0, express_validator_1.query)('industry').optional().isString(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const serviceLevel = req.query.serviceLevel;
        const industry = req.query.industry;
        const offset = (page - 1) * limit;
        console.log('Clients endpoint hit - fetching real client data');
        console.log('Query parameters:', { page, limit, search, serviceLevel, industry });
        const where = {};
        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (serviceLevel && serviceLevel !== 'all') {
            where.serviceLevel = serviceLevel;
        }
        if (industry && industry !== 'all') {
            where.industry = industry;
        }
        const [clients, total] = await Promise.all([
            prisma.clientProfile.findMany({
                where,
                skip: offset,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.clientProfile.count({ where })
        ]);
        console.log('Database query successful. Found clients:', clients.length);
        res.json({
            success: true,
            data: {
                clients,
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
        console.error('Error fetching clients:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch clients',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});
router.get('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await prisma.clientProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        createdAt: true
                    }
                }
            }
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
        res.json({
            success: true,
            data: client
        });
    }
    catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch client'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=clients.js.map