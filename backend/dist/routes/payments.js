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
    (0, express_validator_1.query)('status').optional().isString(),
    (0, express_validator_1.query)('clientId').optional().isUUID(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const clientId = req.query.clientId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const offset = (page - 1) * limit;
        console.log('Payments endpoint hit - fetching real payment data');
        console.log('Query parameters:', { page, limit, status, clientId, startDate, endDate });
        const whereClause = {};
        if (status)
            whereClause.status = status;
        if (clientId)
            whereClause.clientId = clientId;
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate)
                whereClause.createdAt.gte = startDate;
            if (endDate)
                whereClause.createdAt.lte = endDate;
        }
        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where: whereClause,
                skip: offset,
                take: limit,
                include: {
                    client: {
                        select: {
                            name: true,
                            contactEmail: true
                        }
                    },
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            amount: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.payment.count({ where: whereClause })
        ]);
        res.json({
            success: true,
            data: {
                payments,
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
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch payments',
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
        res.status(404).json({
            success: false,
            error: {
                code: 'PAYMENT_NOT_FOUND',
                message: 'Payment not found'
            }
        });
    }
    catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch payment'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map