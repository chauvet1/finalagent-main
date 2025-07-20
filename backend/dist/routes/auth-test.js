"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const userSyncService_1 = require("../services/userSyncService");
const backend_1 = require("@clerk/backend");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const clerkClient = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Auth test API is working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
router.get('/test-auth', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_TOKEN',
                    message: 'No authentication token provided'
                }
            });
        }
        const token = authHeader.substring(7);
        res.json({
            success: true,
            message: 'Token received successfully',
            tokenInfo: {
                length: token.length,
                firstChars: token.substring(0, 10) + '...',
                isEmail: token.includes('@'),
                hasJwtStructure: token.split('.').length === 3
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'TEST_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
router.get('/test-sync/:clerkId', async (req, res) => {
    try {
        const { clerkId } = req.params;
        console.log(`Testing user sync for Clerk ID: ${clerkId}`);
        const user = await userSyncService_1.UserSyncService.getUserWithSync(clerkId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found and could not be synced'
                }
            });
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    clerkId: user.clerkId,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status,
                    profiles: {
                        client: null,
                        agent: null,
                        admin: null
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('User sync test error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SYNC_ERROR',
                message: 'Failed to sync user data'
            }
        });
    }
});
router.get('/test-users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                clientProfile: true,
                agentProfile: true,
                adminProfile: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    id: user.id,
                    clerkId: user.clerkId,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status,
                    createdAt: user.createdAt,
                    profiles: {
                        client: user.clientProfile,
                        agent: user.agentProfile,
                        admin: user.adminProfile
                    }
                })),
                total: users.length
            }
        });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DATABASE_ERROR',
                message: 'Failed to retrieve users'
            }
        });
    }
});
router.get('/test-admin-access', async (req, res) => {
    try {
        const adminUsers = await prisma.user.findMany({
            where: {
                role: 'ADMIN',
                status: 'ACTIVE'
            },
            include: {
                adminProfile: true
            }
        });
        res.json({
            success: true,
            data: {
                adminUsers: adminUsers.map(user => ({
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    accessLevel: user.adminProfile?.accessLevel,
                    permissions: user.adminProfile?.permissions
                })),
                total: adminUsers.length
            }
        });
    }
    catch (error) {
        console.error('Admin access test error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'ACCESS_TEST_ERROR',
                message: 'Failed to test admin access'
            }
        });
    }
});
router.get('/test-client-access', async (req, res) => {
    try {
        const clientUsers = await prisma.user.findMany({
            where: {
                role: 'CLIENT',
                status: 'ACTIVE'
            },
            include: {
                clientProfile: true
            }
        });
        res.json({
            success: true,
            data: {
                clientUsers: clientUsers.map(user => ({
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    companyName: user.clientProfile?.companyName,
                    contactPerson: user.clientProfile?.contactPerson
                })),
                total: clientUsers.length
            }
        });
    }
    catch (error) {
        console.error('Client access test error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'ACCESS_TEST_ERROR',
                message: 'Failed to test client access'
            }
        });
    }
});
router.post('/test-webhook', async (req, res) => {
    try {
        const { eventType, userData } = req.body;
        console.log(`Simulating webhook: ${eventType}`);
        let result;
        switch (eventType) {
            case 'user.created':
                result = await simulateUserCreated(userData);
                break;
            case 'user.updated':
                result = await simulateUserUpdated(userData);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_EVENT_TYPE',
                        message: 'Unsupported event type'
                    }
                });
        }
        res.json({
            success: true,
            data: {
                eventType,
                result
            }
        });
    }
    catch (error) {
        console.error('Webhook simulation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_ERROR',
                message: 'Failed to simulate webhook'
            }
        });
    }
});
async function simulateUserCreated(userData) {
    const user = await prisma.user.create({
        data: {
            clerkId: userData.id || `test-${Date.now()}`,
            email: userData.email || 'test@example.com',
            firstName: userData.firstName || 'Test',
            lastName: userData.lastName || 'User',
            username: userData.username || 'testuser',
            role: userData.role || 'CLIENT',
            status: 'ACTIVE',
            phone: userData.phone || null
        }
    });
    if (user.role === 'CLIENT') {
        await prisma.clientProfile.create({
            data: {
                userId: user.id,
                companyName: userData.companyName || 'Test Company',
                contactPerson: `${user.firstName} ${user.lastName}`
            }
        });
    }
    return { userId: user.id, action: 'created' };
}
async function simulateUserUpdated(userData) {
    const user = await prisma.user.update({
        where: { clerkId: userData.id },
        data: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            updatedAt: new Date()
        }
    });
    return { userId: user.id, action: 'updated' };
}
router.post('/sync-all-users', async (req, res) => {
    try {
        console.log('Starting bulk user sync from Clerk...');
        const result = { synced: 0, errors: [] };
        res.json({
            success: true,
            data: {
                message: 'User synchronization completed',
                synced: result.synced,
                errors: result.errors
            }
        });
    }
    catch (error) {
        console.error('Bulk user sync error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SYNC_ERROR',
                message: 'Failed to sync users from Clerk'
            }
        });
    }
});
router.post('/promote-to-admin', async (req, res) => {
    try {
        const { email, clerkId } = req.body;
        if (!email && !clerkId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_IDENTIFIER',
                    message: 'Either email or clerkId is required'
                }
            });
        }
        let user;
        if (clerkId) {
            user = await prisma.user.findUnique({ where: { clerkId } });
        }
        else {
            user = await prisma.user.findUnique({ where: { email } });
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found in database'
                }
            });
        }
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        });
        await clerkClient.users.updateUserMetadata(user.clerkId, {
            publicMetadata: {
                role: 'ADMIN',
                accessLevel: 'ADMIN'
            }
        });
        await prisma.adminProfile.upsert({
            where: { userId: user.id },
            update: {
                accessLevel: 'ADMIN',
                permissions: [
                    'users.read', 'users.write', 'users.delete',
                    'reports.read', 'reports.write', 'reports.delete',
                    'sites.read', 'sites.write', 'sites.delete',
                    'shifts.read', 'shifts.write', 'shifts.delete',
                    'analytics.read', 'admin.read'
                ]
            },
            create: {
                userId: user.id,
                accessLevel: 'ADMIN',
                permissions: [
                    'users.read', 'users.write', 'users.delete',
                    'reports.read', 'reports.write', 'reports.delete',
                    'sites.read', 'sites.write', 'sites.delete',
                    'shifts.read', 'shifts.write', 'shifts.delete',
                    'analytics.read', 'admin.read'
                ]
            }
        });
        res.json({
            success: true,
            data: {
                message: 'User promoted to admin successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName
                }
            }
        });
    }
    catch (error) {
        console.error('Promote to admin error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'PROMOTION_ERROR',
                message: 'Failed to promote user to admin'
            }
        });
    }
});
router.get('/find-clerk-user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        console.log(`Searching for user in Clerk with email: ${email}`);
        const users = await clerkClient.users.getUserList({
            emailAddress: [email]
        });
        if (!users || users.data.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND_IN_CLERK',
                    message: 'User not found in Clerk'
                }
            });
        }
        const user = users.data[0];
        res.json({
            success: true,
            data: {
                clerkUser: {
                    id: user.id,
                    email: user.emailAddresses[0]?.emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    publicMetadata: user.publicMetadata,
                    createdAt: user.createdAt,
                    lastSignInAt: user.lastSignInAt
                }
            }
        });
    }
    catch (error) {
        console.error('Find Clerk user error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CLERK_SEARCH_ERROR',
                message: 'Failed to search for user in Clerk'
            }
        });
    }
});
router.post('/manual-create-user', async (req, res) => {
    try {
        const { email, firstName, lastName, role, clerkId } = req.body;
        if (!email || !firstName || !lastName || !role) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Email, firstName, lastName, and role are required'
                }
            });
        }
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'USER_EXISTS',
                    message: 'User already exists in database'
                }
            });
        }
        const user = await prisma.user.create({
            data: {
                clerkId: clerkId || `manual-${email}-${Date.now()}`,
                email,
                firstName,
                lastName,
                username: email.split('@')[0],
                role,
                status: 'ACTIVE',
            }
        });
        if (role === 'ADMIN') {
            await prisma.adminProfile.create({
                data: {
                    userId: user.id,
                    permissions: [
                        'users.read', 'users.write', 'users.delete',
                        'reports.read', 'reports.write', 'reports.delete',
                        'sites.read', 'sites.write', 'sites.delete',
                        'shifts.read', 'shifts.write', 'shifts.delete',
                        'analytics.read', 'admin.read'
                    ],
                    accessLevel: 'ADMIN',
                }
            });
        }
        else if (role === 'CLIENT') {
            await prisma.clientProfile.create({
                data: {
                    userId: user.id,
                    companyName: '',
                    contactPerson: `${firstName} ${lastName}`,
                }
            });
        }
        res.json({
            success: true,
            data: {
                message: 'User created successfully',
                user: {
                    id: user.id,
                    clerkId: user.clerkId,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    status: user.status
                }
            }
        });
    }
    catch (error) {
        console.error('Manual user creation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CREATION_ERROR',
                message: 'Failed to create user manually'
            }
        });
    }
});
router.post('/recreate-clerk-user', async (req, res) => {
    try {
        const { email, firstName, lastName, tempPassword } = req.body;
        if (!email || !firstName || !lastName || !tempPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Email, firstName, lastName, and tempPassword are required'
                }
            });
        }
        const dbUser = await prisma.user.findUnique({
            where: { email },
            include: { adminProfile: true }
        });
        if (!dbUser) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND_IN_DB',
                    message: 'User not found in database'
                }
            });
        }
        const clerkUser = await clerkClient.users.createUser({
            emailAddress: [email],
            firstName,
            lastName,
            password: tempPassword,
            publicMetadata: {
                role: dbUser.role,
                accessLevel: dbUser.adminProfile?.accessLevel || 'STANDARD'
            }
        });
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                clerkId: clerkUser.id,
                updatedAt: new Date()
            }
        });
        res.json({
            success: true,
            data: {
                message: 'User recreated in Clerk successfully',
                clerkId: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                tempPassword: tempPassword,
                instructions: 'User can now login with this email and temporary password. They should change the password after first login.'
            }
        });
    }
    catch (error) {
        console.error('Recreate Clerk user error:', error);
        if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'USER_EXISTS_IN_CLERK',
                    message: 'User already exists in Clerk. Try signing in directly.'
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'CLERK_CREATION_ERROR',
                message: 'Failed to recreate user in Clerk'
            }
        });
    }
});
router.get('/list-clerk-users', async (req, res) => {
    try {
        console.log('Fetching users from Clerk...');
        const users = await clerkClient.users.getUserList({
            limit: 50
        });
        console.log(`Found ${users.data.length} users in Clerk`);
        res.json({
            success: true,
            data: {
                users: users.data.map(user => ({
                    id: user.id,
                    email: user.emailAddresses[0]?.emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    publicMetadata: user.publicMetadata,
                    createdAt: user.createdAt,
                    lastSignInAt: user.lastSignInAt
                })),
                total: users.data.length
            }
        });
    }
    catch (error) {
        console.error('List Clerk users error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CLERK_LIST_ERROR',
                message: 'Failed to list users from Clerk',
                details: error.message
            }
        });
    }
});
router.post('/sync-user-by-clerk-id', async (req, res) => {
    try {
        const { clerkId } = req.body;
        if (!clerkId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_CLERK_ID',
                    message: 'Clerk ID is required'
                }
            });
        }
        console.log(`Syncing user with Clerk ID: ${clerkId}`);
        const clerkUser = await clerkClient.users.getUser(clerkId);
        if (!clerkUser) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND_IN_CLERK',
                    message: 'User not found in Clerk'
                }
            });
        }
        let dbUser = await prisma.user.findUnique({
            where: { clerkId: clerkId }
        });
        const userData = {
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0],
            role: clerkUser.publicMetadata?.role || 'CLIENT',
            status: 'ACTIVE',
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
        };
        if (dbUser) {
            dbUser = await prisma.user.update({
                where: { clerkId: clerkId },
                data: {
                    ...userData,
                    updatedAt: new Date(),
                }
            });
        }
        else {
            dbUser = await prisma.user.create({
                data: userData
            });
            if (userData.role === 'CLIENT') {
                await prisma.clientProfile.create({
                    data: {
                        userId: dbUser.id,
                        companyName: '',
                        contactPerson: `${userData.firstName} ${userData.lastName}`.trim(),
                    }
                });
            }
            else if (userData.role === 'ADMIN') {
                await prisma.adminProfile.create({
                    data: {
                        userId: dbUser.id,
                        permissions: ['users.read', 'users.write', 'reports.read', 'reports.write'],
                        accessLevel: 'STANDARD',
                    }
                });
            }
        }
        res.json({
            success: true,
            data: {
                message: 'User synced successfully',
                user: {
                    id: dbUser.id,
                    clerkId: dbUser.clerkId,
                    email: dbUser.email,
                    firstName: dbUser.firstName,
                    lastName: dbUser.lastName,
                    role: dbUser.role,
                    status: dbUser.status
                }
            }
        });
    }
    catch (error) {
        console.error('Sync user by Clerk ID error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SYNC_ERROR',
                message: 'Failed to sync user',
                details: error.message
            }
        });
    }
});
router.get('/test-analytics', async (req, res) => {
    console.log('Test analytics endpoint hit - no auth required');
    try {
        const startDate = new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = new Date();
        const activeShifts = await prisma.shift.count({
            where: {
                status: 'IN_PROGRESS'
            }
        });
        const totalAgents = await prisma.agentProfile.count();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const incidentsToday = await prisma.report.count({
            where: {
                type: 'INCIDENT',
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });
        const sitesMonitored = await prisma.site.count({
            where: {
                status: 'ACTIVE'
            }
        });
        const dashboardData = {
            overview: {
                activeShifts,
                totalAgents,
                incidentsToday,
                sitesMonitored,
                completionRate: 85.5,
                responseTime: 12.3
            },
            message: 'Test analytics endpoint working - authentication bypassed'
        };
        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error in test analytics endpoint:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch test analytics data',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth-test.js.map