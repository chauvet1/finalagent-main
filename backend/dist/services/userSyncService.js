"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSyncService = void 0;
const client_1 = require("@prisma/client");
const backend_1 = require("@clerk/backend");
const logger_1 = require("../utils/logger");
class UserSyncService {
    static async getUserWithSync(clerkUserId) {
        try {
            let user = await this.prisma.user.findUnique({
                where: { clerkId: clerkUserId },
                include: {
                    adminProfile: true,
                    clientProfile: true,
                    agentProfile: true
                }
            });
            if (!user) {
                user = await this.syncUserFromClerk(clerkUserId);
            }
            if (!user) {
                return null;
            }
            if (user.status !== 'ACTIVE') {
                logger_1.logger.warn('User account is not active', { clerkUserId, status: user.status });
                return null;
            }
            return {
                id: user.id,
                clerkId: user.clerkId,
                email: user.email,
                firstName: user.firstName || undefined,
                lastName: user.lastName || undefined,
                role: user.role,
                status: user.status,
                permissions: user.adminProfile?.permissions || [],
                accessLevel: user.adminProfile?.accessLevel || undefined,
                profileData: {
                    adminProfile: user.adminProfile,
                    clientProfile: user.clientProfile,
                    agentProfile: user.agentProfile
                }
            };
        }
        catch (error) {
            logger_1.logger.error('User sync failed', { error, clerkUserId });
            return null;
        }
    }
    static async syncUserFromClerk(clerkUserId) {
        try {
            const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
            if (!clerkUser) {
                logger_1.logger.warn('User not found in Clerk', { clerkUserId });
                return null;
            }
            const email = clerkUser.emailAddresses?.[0]?.emailAddress;
            const firstName = clerkUser.firstName;
            const lastName = clerkUser.lastName;
            if (!email) {
                logger_1.logger.warn('User has no email address in Clerk', { clerkUserId });
                return null;
            }
            const role = this.determineUserRole(email);
            const user = await this.prisma.user.create({
                data: {
                    clerkId: clerkUserId,
                    email,
                    firstName,
                    lastName,
                    role,
                    status: 'ACTIVE'
                },
                include: {
                    adminProfile: true,
                    clientProfile: true,
                    agentProfile: true
                }
            });
            await this.createUserProfile(user.id, role);
            logger_1.logger.info('User synced from Clerk', {
                clerkUserId,
                email,
                role,
                userId: user.id
            });
            return user;
        }
        catch (error) {
            logger_1.logger.error('Failed to sync user from Clerk', { error, clerkUserId });
            return null;
        }
    }
    static determineUserRole(email) {
        if (email.includes('admin@') || email.includes('@bahinlink.com')) {
            return 'ADMIN';
        }
        if (email.includes('supervisor@') || email.includes('manager@')) {
            return 'SUPERVISOR';
        }
        if (email.includes('agent@') || email.includes('guard@')) {
            return 'AGENT';
        }
        return 'CLIENT';
    }
    static async createUserProfile(userId, role) {
        try {
            switch (role) {
                case 'ADMIN':
                case 'SUPERVISOR':
                    await this.prisma.adminProfile.create({
                        data: {
                            userId,
                            department: 'Security Operations',
                            position: role === 'ADMIN' ? 'Administrator' : 'Supervisor',
                            permissions: role === 'ADMIN' ?
                                ['USER_MANAGEMENT', 'SYSTEM_CONFIG', 'REPORTS', 'ANALYTICS'] :
                                ['AGENT_MANAGEMENT', 'REPORTS', 'MONITORING'],
                            accessLevel: role === 'ADMIN' ? 'ADMIN' : 'ELEVATED'
                        }
                    });
                    break;
                case 'AGENT':
                    await this.prisma.agentProfile.create({
                        data: {
                            userId,
                            employeeId: `EMP_${Date.now()}`,
                            hireDate: new Date(),
                            skills: [],
                            certifications: []
                        }
                    });
                    break;
                case 'CLIENT':
                    await this.prisma.clientProfile.create({
                        data: {
                            userId,
                            serviceLevel: 'STANDARD'
                        }
                    });
                    break;
            }
            logger_1.logger.info('User profile created', { userId, role });
        }
        catch (error) {
            logger_1.logger.error('Failed to create user profile', { error, userId, role });
        }
    }
    static async updateUserFromClerk(clerkUserId) {
        try {
            const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
            if (!clerkUser) {
                return null;
            }
            const email = clerkUser.emailAddresses?.[0]?.emailAddress;
            const firstName = clerkUser.firstName;
            const lastName = clerkUser.lastName;
            if (!email) {
                return null;
            }
            const user = await this.prisma.user.update({
                where: { clerkId: clerkUserId },
                data: {
                    email,
                    firstName,
                    lastName,
                    updatedAt: new Date()
                },
                include: {
                    adminProfile: true,
                    clientProfile: true,
                    agentProfile: true
                }
            });
            logger_1.logger.info('User updated from Clerk', { clerkUserId, email });
            return {
                id: user.id,
                clerkId: user.clerkId,
                email: user.email,
                firstName: user.firstName || undefined,
                lastName: user.lastName || undefined,
                role: user.role,
                status: user.status,
                permissions: user.adminProfile?.permissions || [],
                accessLevel: user.adminProfile?.accessLevel || undefined,
                profileData: {
                    adminProfile: user.adminProfile,
                    clientProfile: user.clientProfile,
                    agentProfile: user.agentProfile
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to update user from Clerk', { error, clerkUserId });
            return null;
        }
    }
    static async cleanupInactiveUsers(daysInactive = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
            const result = await this.prisma.user.updateMany({
                where: {
                    status: 'ACTIVE',
                    updatedAt: {
                        lt: cutoffDate
                    }
                },
                data: {
                    status: 'INACTIVE'
                }
            });
            logger_1.logger.info('Inactive users cleaned up', {
                count: result.count,
                daysInactive
            });
            return result.count;
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup inactive users', { error });
            return 0;
        }
    }
}
exports.UserSyncService = UserSyncService;
UserSyncService.prisma = new client_1.PrismaClient();
UserSyncService.clerkClient = (0, backend_1.createClerkClient)({
    secretKey: process.env.CLERK_SECRET_KEY
});
//# sourceMappingURL=userSyncService.js.map