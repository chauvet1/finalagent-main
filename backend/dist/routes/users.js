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
    (0, express_validator_1.query)('role').optional().isIn(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT']),
    (0, express_validator_1.query)('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
    (0, express_validator_1.query)('search').optional().isString().trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const role = req.query.role;
        const status = req.query.status;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        const where = {};
        if (role) {
            where.role = role;
        }
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    updatedAt: true,
                    agentProfile: {
                        select: {
                            id: true,
                            employeeId: true,
                        }
                    },
                    clientProfile: {
                        select: {
                            id: true,
                            companyName: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);
        res.json({
            success: true,
            data: {
                users,
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
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch users'
            }
        });
    }
});
router.get('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                updatedAt: true,
                agentProfile: {
                    select: {
                        id: true,
                        employeeId: true,
                        hireDate: true,
                        skills: true,
                        certifications: true,
                        emergencyContact: true,
                    }
                },
                clientProfile: {
                    select: {
                        id: true,
                        companyName: true,
                        contactPerson: true,
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }
        res.json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch user'
            }
        });
    }
});
router.post('/', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('role').isIn(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT']),
    (0, express_validator_1.body)('firstName').optional().isString().isLength({ max: 50 }).trim(),
    (0, express_validator_1.body)('lastName').optional().isString().isLength({ max: 50 }).trim(),
    (0, express_validator_1.body)('clerkId').optional().isString().trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const { email, role, firstName, lastName, clerkId } = req.body;
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    ...(clerkId ? [{ clerkId }] : [])
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'USER_EXISTS',
                    message: 'User with this email or Clerk ID already exists'
                }
            });
        }
        const user = await prisma.user.create({
            data: {
                clerkId: clerkId || `pending_${Date.now()}`,
                email,
                role,
                firstName,
                lastName,
                status: clerkId ? 'ACTIVE' : 'INACTIVE'
            },
            select: {
                id: true,
                clerkId: true,
                email: true,
                role: true,
                status: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });
        res.status(201).json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create user'
            }
        });
    }
});
router.put('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('firstName').optional().isString().isLength({ max: 50 }).trim(),
    (0, express_validator_1.body)('lastName').optional().isString().isLength({ max: 50 }).trim(),
    (0, express_validator_1.body)('phone').optional().isString().isLength({ max: 20 }).trim(),
    (0, express_validator_1.body)('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, status } = req.body;
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }
        const user = await prisma.user.update({
            where: { id },
            data: {
                firstName,
                lastName,
                status,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                firstName: true,
                lastName: true,
                updatedAt: true
            }
        });
        res.json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update user'
            }
        });
    }
});
router.delete('/:id', [
    auth_1.requireAuth,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID')
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }
        await prisma.user.update({
            where: { id },
            data: {
                status: 'INACTIVE'
            }
        });
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete user'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map