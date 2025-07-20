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
router.get('/geofence-zones', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('active').optional().isBoolean(),
], handleValidationErrors, async (req, res) => {
    try {
        const siteId = req.query.siteId;
        const active = req.query.active === 'true';
        const where = {};
        if (siteId) {
            where.siteId = siteId;
        }
        if (active !== undefined) {
            where.status = active ? 'ACTIVE' : 'INACTIVE';
        }
        const zones = await prisma.geofence.findMany({
            where,
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        res.json({
            success: true,
            data: zones,
            total: zones.length
        });
    }
    catch (error) {
        console.error('Error fetching geofence zones:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch geofence zones'
            }
        });
    }
});
router.get('/geofence-violations', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
    (0, express_validator_1.query)('agentId').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const siteId = req.query.siteId;
        const agentId = req.query.agentId;
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
        if (siteId) {
            where.siteId = siteId;
        }
        if (agentId) {
            where.agentId = agentId;
        }
        const violations = await prisma.geofenceViolation.findMany({
            where,
            include: {
                agent: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                geofence: {
                    include: {
                        site: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { occurredAt: 'desc' }
        }).catch(() => []);
        res.json({
            success: true,
            data: violations,
            total: violations.length
        });
    }
    catch (error) {
        console.error('Error fetching geofence violations:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch geofence violations'
            }
        });
    }
});
router.get('/geofence-validations', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
    (0, express_validator_1.query)('siteId').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const siteId = req.query.siteId;
        const where = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
        if (siteId) {
            where.siteId = siteId;
        }
        const validations = await prisma.geofenceValidation.findMany({
            where,
            include: {
                agent: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                geofence: {
                    include: {
                        site: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { validatedAt: 'desc' }
        }).catch(() => []);
        res.json({
            success: true,
            data: validations,
            total: validations.length
        });
    }
    catch (error) {
        console.error('Error fetching geofence validations:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch geofence validations'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=geofence.js.map