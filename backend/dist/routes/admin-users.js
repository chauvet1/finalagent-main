"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const backend_1 = require("@clerk/backend");
const clerkClient = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
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
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Admin access required'
            }
        });
    }
    next();
};
router.post('/invite', requireAdmin, [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('role').isIn(['ADMIN', 'SUPERVISOR']),
    (0, express_validator_1.body)('firstName').isString().isLength({ min: 1, max: 50 }).trim(),
    (0, express_validator_1.body)('lastName').isString().isLength({ min: 1, max: 50 }).trim(),
    (0, express_validator_1.body)('accessLevel').optional().isIn(['STANDARD', 'ELEVATED', 'ADMIN', 'SUPER_ADMIN']),
    (0, express_validator_1.body)('department').optional().isString().isLength({ max: 100 }).trim(),
    (0, express_validator_1.body)('position').optional().isString().isLength({ max: 100 }).trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const { email, role, firstName, lastName, accessLevel, department, position } = req.body;
        const invitedBy = req.user.id;
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'USER_EXISTS',
                    message: 'User with this email already exists'
                }
            });
        }
        const clerkUser = await clerkClient.users.createUser({
            emailAddress: [email],
            firstName,
            lastName,
            publicMetadata: {
                role,
                accessLevel: accessLevel || 'STANDARD',
                invitedBy
            },
            skipPasswordRequirement: true,
        });
        const user = await prisma.user.create({
            data: {
                clerkId: clerkUser.id,
                email,
                firstName,
                lastName,
                role,
                status: 'ACTIVE'
            }
        });
        if (role === 'ADMIN' || role === 'SUPERVISOR') {
            await prisma.adminProfile.create({
                data: {
                    userId: user.id,
                    department: department || null,
                    position: position || null,
                    accessLevel: accessLevel || 'STANDARD',
                    permissions: getDefaultPermissions(role, accessLevel)
                }
            });
        }
        await clerkClient.invitations.createInvitation({
            emailAddress: email,
            publicMetadata: {
                role,
                invitedBy: req.user.email
            }
        });
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    clerkId: user.clerkId,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status
                },
                message: 'Admin user invited successfully. They will receive an email to complete their registration.'
            }
        });
    }
    catch (error) {
        console.error('Error inviting admin user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INVITATION_FAILED',
                message: 'Failed to invite admin user'
            }
        });
    }
});
router.get('/', requireAdmin, [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('role').optional().isIn(['ADMIN', 'SUPERVISOR']),
    (0, express_validator_1.query)('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
], handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const role = req.query.role;
        const status = req.query.status;
        const offset = (page - 1) * limit;
        const where = {
            role: {
                in: role ? [role] : ['ADMIN', 'SUPERVISOR']
            }
        };
        if (status) {
            where.status = status;
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    adminProfile: true
                },
                skip: offset,
                take: limit,
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
        console.error('Error fetching admin users:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_FAILED',
                message: 'Failed to fetch admin users'
            }
        });
    }
});
router.put('/:id/role', requireAdmin, [
    (0, express_validator_1.param)('id').isString(),
    (0, express_validator_1.body)('role').isIn(['ADMIN', 'SUPERVISOR', 'AGENT', 'CLIENT']),
    (0, express_validator_1.body)('accessLevel').optional().isIn(['STANDARD', 'ELEVATED', 'ADMIN', 'SUPER_ADMIN']),
], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, accessLevel } = req.body;
        const user = await prisma.user.findUnique({
            where: { id },
            include: { adminProfile: true }
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
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role }
        });
        await clerkClient.users.updateUserMetadata(user.clerkId, {
            publicMetadata: {
                role,
                accessLevel: accessLevel || user.adminProfile?.accessLevel || 'STANDARD'
            }
        });
        if (role === 'ADMIN' || role === 'SUPERVISOR') {
            await prisma.adminProfile.upsert({
                where: { userId: id },
                update: {
                    accessLevel: accessLevel || 'STANDARD',
                    permissions: getDefaultPermissions(role, accessLevel)
                },
                create: {
                    userId: id,
                    accessLevel: accessLevel || 'STANDARD',
                    permissions: getDefaultPermissions(role, accessLevel)
                }
            });
        }
        else if (user.adminProfile) {
            await prisma.adminProfile.delete({
                where: { userId: id }
            });
        }
        res.json({
            success: true,
            data: { user: updatedUser }
        });
    }
    catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_FAILED',
                message: 'Failed to update user role'
            }
        });
    }
});
function getDefaultPermissions(role, accessLevel) {
    const basePermissions = {
        ADMIN: [
            'users.read', 'users.write', 'users.delete',
            'sites.read', 'sites.write', 'sites.delete',
            'shifts.read', 'shifts.write', 'shifts.delete',
            'reports.read', 'reports.write',
            'analytics.read',
            'settings.read', 'settings.write'
        ],
        SUPERVISOR: [
            'users.read',
            'sites.read', 'sites.write',
            'shifts.read', 'shifts.write',
            'reports.read', 'reports.write',
            'analytics.read'
        ]
    };
    const permissions = basePermissions[role] || [];
    if (accessLevel === 'SUPER_ADMIN') {
        permissions.push('system.admin', 'audit.read', 'integrations.manage');
    }
    else if (accessLevel === 'ADMIN') {
        permissions.push('audit.read');
    }
    return permissions;
}
exports.default = router;
//# sourceMappingURL=admin-users.js.map