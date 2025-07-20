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
router.get('/', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.query)('status').optional().isIn(['draft', 'active', 'expired', 'terminated', 'pending_renewal']),
    (0, express_validator_1.query)('clientId').optional().isUUID(),
    (0, express_validator_1.query)('type').optional().isIn(['security_services', 'patrol', 'monitoring', 'consulting']),
], handleValidationErrors, async (req, res) => {
    try {
        const { status, clientId, type, page = 1, limit = 50 } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (clientId)
            where.clientId = clientId;
        if (type)
            where.type = type;
        const contracts = await prisma.contract.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        contactEmail: true,
                    }
                },
                slaMetrics: true,
                documents: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        const total = await prisma.contract.count({ where });
        const transformedContracts = contracts.map(contract => ({
            id: contract.id,
            clientId: contract.clientId,
            clientName: contract.client?.name || 'Unknown Client',
            title: contract.title,
            type: contract.type,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            value: contract.value,
            currency: contract.currency || 'USD',
            renewalTerms: contract.renewalTerms || '',
            slaMetrics: contract.slaMetrics || [],
            documents: contract.documents || [],
            lastReviewed: contract.lastReviewed,
            nextReview: contract.nextReview,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
        }));
        res.json({
            success: true,
            data: transformedContracts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch contracts'
            }
        });
    }
});
router.get('/:id', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await prisma.contract.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        contactEmail: true,
                    }
                },
                slaMetrics: true,
                documents: true,
            },
        });
        if (!contract) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Contract not found'
                }
            });
        }
        const transformedContract = {
            id: contract.id,
            clientId: contract.clientId,
            clientName: contract.client?.name || 'Unknown Client',
            title: contract.title,
            type: contract.type,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            value: contract.value,
            currency: contract.currency || 'USD',
            renewalTerms: contract.renewalTerms || '',
            slaMetrics: contract.slaMetrics || [],
            documents: contract.documents || [],
            lastReviewed: contract.lastReviewed,
            nextReview: contract.nextReview,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
        };
        res.json({
            success: true,
            data: transformedContract
        });
    }
    catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch contract'
            }
        });
    }
});
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.body)('clientName').notEmpty().withMessage('Client name is required'),
    (0, express_validator_1.body)('title').notEmpty().withMessage('Contract title is required'),
    (0, express_validator_1.body)('type').isIn(['security_services', 'patrol', 'monitoring', 'consulting']),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Valid start date is required'),
    (0, express_validator_1.body)('endDate').isISO8601().withMessage('Valid end date is required'),
    (0, express_validator_1.body)('value').isNumeric().withMessage('Contract value must be a number'),
    (0, express_validator_1.body)('currency').optional().isLength({ min: 3, max: 3 }),
    (0, express_validator_1.body)('renewalTerms').optional().isString(),
], handleValidationErrors, async (req, res) => {
    try {
        const { clientName, title, type, startDate, endDate, value, currency = 'USD', renewalTerms = '', status = 'draft' } = req.body;
        let client = await prisma.client.findFirst({
            where: { name: clientName }
        });
        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    contactEmail: `${clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                    phone: '',
                    address: '',
                    status: 'active',
                }
            });
        }
        const contract = await prisma.contract.create({
            data: {
                clientId: client.id,
                title,
                type,
                status,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                value: Number(value),
                currency,
                renewalTerms,
                lastReviewed: new Date(),
                nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        contactEmail: true,
                    }
                },
                slaMetrics: true,
                documents: true,
            },
        });
        const transformedContract = {
            id: contract.id,
            clientId: contract.clientId,
            clientName: contract.client?.name || 'Unknown Client',
            title: contract.title,
            type: contract.type,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            value: contract.value,
            currency: contract.currency || 'USD',
            renewalTerms: contract.renewalTerms || '',
            slaMetrics: contract.slaMetrics || [],
            documents: contract.documents || [],
            lastReviewed: contract.lastReviewed,
            nextReview: contract.nextReview,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
        };
        res.status(201).json({
            success: true,
            data: transformedContract
        });
    }
    catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create contract'
            }
        });
    }
});
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('clientName').optional().notEmpty(),
    (0, express_validator_1.body)('title').optional().notEmpty(),
    (0, express_validator_1.body)('type').optional().isIn(['security_services', 'patrol', 'monitoring', 'consulting']),
    (0, express_validator_1.body)('startDate').optional().isISO8601(),
    (0, express_validator_1.body)('endDate').optional().isISO8601(),
    (0, express_validator_1.body)('value').optional().isNumeric(),
    (0, express_validator_1.body)('currency').optional().isLength({ min: 3, max: 3 }),
    (0, express_validator_1.body)('renewalTerms').optional().isString(),
    (0, express_validator_1.body)('status').optional().isIn(['draft', 'active', 'expired', 'terminated', 'pending_renewal']),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};
        const allowedFields = ['title', 'type', 'startDate', 'endDate', 'value', 'currency', 'renewalTerms', 'status'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'startDate' || field === 'endDate') {
                    updateData[field] = new Date(req.body[field]);
                }
                else if (field === 'value') {
                    updateData[field] = Number(req.body[field]);
                }
                else {
                    updateData[field] = req.body[field];
                }
            }
        });
        if (req.body.clientName) {
            let client = await prisma.client.findFirst({
                where: { name: req.body.clientName }
            });
            if (!client) {
                client = await prisma.client.create({
                    data: {
                        name: req.body.clientName,
                        contactEmail: `${req.body.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                        phone: '',
                        address: '',
                        status: 'active',
                    }
                });
            }
            updateData.clientId = client.id;
        }
        const contract = await prisma.contract.update({
            where: { id },
            data: updateData,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        contactEmail: true,
                    }
                },
                slaMetrics: true,
                documents: true,
            },
        });
        const transformedContract = {
            id: contract.id,
            clientId: contract.clientId,
            clientName: contract.client?.name || 'Unknown Client',
            title: contract.title,
            type: contract.type,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            value: contract.value,
            currency: contract.currency || 'USD',
            renewalTerms: contract.renewalTerms || '',
            slaMetrics: contract.slaMetrics || [],
            documents: contract.documents || [],
            lastReviewed: contract.lastReviewed,
            nextReview: contract.nextReview,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
        };
        res.json({
            success: true,
            data: transformedContract
        });
    }
    catch (error) {
        console.error('Error updating contract:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Contract not found'
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update contract'
            }
        });
    }
});
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.param)('id').isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contract.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Contract deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting contract:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Contract not found'
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete contract'
            }
        });
    }
});
router.get('/client/:clientId', auth_1.requireAuth, auth_1.requireAdmin, [
    (0, express_validator_1.param)('clientId').isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const { clientId } = req.params;
        const contracts = await prisma.contract.findMany({
            where: { clientId },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        contactEmail: true,
                    }
                },
                slaMetrics: true,
                documents: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const transformedContracts = contracts.map(contract => ({
            id: contract.id,
            clientId: contract.clientId,
            clientName: contract.client?.name || 'Unknown Client',
            title: contract.title,
            type: contract.type,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            value: contract.value,
            currency: contract.currency || 'USD',
            renewalTerms: contract.renewalTerms || '',
            slaMetrics: contract.slaMetrics || [],
            documents: contract.documents || [],
            lastReviewed: contract.lastReviewed,
            nextReview: contract.nextReview,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
        }));
        res.json({
            success: true,
            data: transformedContracts
        });
    }
    catch (error) {
        console.error('Error fetching client contracts:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch client contracts'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=contracts.js.map