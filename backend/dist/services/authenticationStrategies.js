"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticationStrategyFactory = exports.AuthenticationStrategyFactory = exports.DevelopmentAuthenticationStrategy = exports.EmailAuthenticationStrategy = exports.JWTAuthenticationStrategy = void 0;
const auth_1 = require("../types/auth");
const client_1 = require("@prisma/client");
const backend_1 = require("@clerk/backend");
const logger_1 = require("../utils/logger");
const userSyncService_1 = require("./userSyncService");
class JWTAuthenticationStrategy {
    constructor() {
        this.clerkClient = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
        this.prisma = new client_1.PrismaClient();
    }
    canHandle(tokenType) {
        return tokenType === auth_1.TokenType.JWT;
    }
    getAuthenticationMethod() {
        return 'jwt';
    }
    async authenticate(token) {
        try {
            const hasValidClerkConfig = process.env.CLERK_SECRET_KEY &&
                process.env.CLERK_SECRET_KEY.startsWith('sk_') &&
                process.env.CLERK_SECRET_KEY.length > 20;
            if (!hasValidClerkConfig) {
                throw new Error('Clerk configuration invalid');
            }
            let userId;
            let claims;
            try {
                const { verifyToken } = await Promise.resolve().then(() => __importStar(require('@clerk/backend')));
                const sessionClaims = await verifyToken(token, {
                    secretKey: process.env.CLERK_SECRET_KEY
                });
                userId = sessionClaims.sub;
                claims = sessionClaims;
                logger_1.logger.debug('JWT token verified successfully', {
                    userId: userId.substring(0, 8) + '...',
                    tokenLength: token.length
                });
            }
            catch (jwtError) {
                logger_1.logger.debug('JWT verification failed, trying direct user lookup', {
                    error: jwtError instanceof Error ? jwtError.message : 'Unknown error'
                });
                const user = await this.clerkClient.users.getUser(token);
                if (!user || !user.id) {
                    throw new Error('User not found in Clerk');
                }
                userId = user.id;
                claims = { sub: user.id };
            }
            const user = await this.getUserFromDatabase(userId);
            if (!user) {
                const syncedUser = await userSyncService_1.UserSyncService.getUserWithSync(userId);
                if (!syncedUser) {
                    throw new Error('User not found in database and sync failed');
                }
                return {
                    ...syncedUser,
                    authenticationMethod: this.getAuthenticationMethod()
                };
            }
            logger_1.logger.info('JWT authentication successful', {
                userId: user.id,
                email: user.email,
                role: user.role
            });
            return {
                ...user,
                authenticationMethod: this.getAuthenticationMethod()
            };
        }
        catch (error) {
            logger_1.logger.error('JWT authentication failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                tokenLength: token.length
            });
            throw new Error(`JWT authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getUserFromDatabase(clerkUserId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { clerkId: clerkUserId },
                include: {
                    adminProfile: true,
                    clientProfile: true,
                    agentProfile: true
                }
            });
            if (!user) {
                return null;
            }
            if (user.status !== 'ACTIVE') {
                throw new Error('User account is not active');
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
            logger_1.logger.error('Database user lookup failed', { error, clerkUserId });
            throw error;
        }
    }
}
exports.JWTAuthenticationStrategy = JWTAuthenticationStrategy;
class EmailAuthenticationStrategy {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    canHandle(tokenType) {
        return tokenType === auth_1.TokenType.EMAIL;
    }
    getAuthenticationMethod() {
        return 'email';
    }
    async authenticate(token) {
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(token)) {
                throw new Error('Invalid email format');
            }
            let user = await this.prisma.user.findUnique({
                where: { email: token },
                include: {
                    adminProfile: true,
                    clientProfile: true,
                    agentProfile: true
                }
            });
            if (!user) {
                logger_1.logger.info('Creating new user for email authentication', { email: token });
                user = await this.prisma.user.create({
                    data: {
                        clerkId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        email: token,
                        firstName: 'Email',
                        lastName: 'User',
                        role: 'ADMIN',
                        status: 'ACTIVE'
                    },
                    include: {
                        adminProfile: true,
                        clientProfile: true,
                        agentProfile: true
                    }
                });
            }
            if (user.status !== 'ACTIVE') {
                throw new Error('User account is not active');
            }
            logger_1.logger.info('Email authentication successful', {
                userId: user.id,
                email: user.email,
                role: user.role
            });
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
                authenticationMethod: this.getAuthenticationMethod(),
                profileData: {
                    adminProfile: user.adminProfile,
                    clientProfile: user.clientProfile,
                    agentProfile: user.agentProfile
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Email authentication failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                email: token
            });
            throw new Error(`Email authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.EmailAuthenticationStrategy = EmailAuthenticationStrategy;
class DevelopmentAuthenticationStrategy {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    isDevelopmentMode() {
        return process.env.NODE_ENV === 'development' ||
            process.env.NODE_ENV === 'test' ||
            process.env.ENABLE_DEV_AUTH === 'true';
    }
    getDevelopmentUserRole(email) {
        if (email.includes('admin') || email.includes('dev')) {
            return 'ADMIN';
        }
        if (email.includes('client')) {
            return 'CLIENT';
        }
        if (email.includes('agent')) {
            return 'AGENT';
        }
        if (email.includes('supervisor')) {
            return 'SUPERVISOR';
        }
        return 'ADMIN';
    }
    canHandle(tokenType) {
        return tokenType === auth_1.TokenType.DEVELOPMENT;
    }
    getAuthenticationMethod() {
        return 'development';
    }
    async authenticate(token) {
        try {
            if (!this.isDevelopmentMode()) {
                logger_1.logger.warn('Development authentication attempted in non-development environment', {
                    nodeEnv: process.env.NODE_ENV,
                    enableDevAuth: process.env.ENABLE_DEV_AUTH
                });
                throw new Error('Development authentication is not enabled in this environment');
            }
            if (!token.startsWith('dev:')) {
                throw new Error('Invalid development token format');
            }
            const email = token.substring(4);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format in development token');
            }
            const developmentRole = this.getDevelopmentUserRole(email);
            let user = await this.prisma.user.findUnique({
                where: { email },
                include: {
                    adminProfile: true,
                    clientProfile: true,
                    agentProfile: true
                }
            });
            if (!user) {
                logger_1.logger.info('Creating new user for development authentication', {
                    email,
                    role: developmentRole,
                    developmentMode: true
                });
                user = await this.prisma.user.create({
                    data: {
                        clerkId: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        email,
                        firstName: 'Development',
                        lastName: 'User',
                        role: developmentRole,
                        status: 'ACTIVE'
                    },
                    include: {
                        adminProfile: true,
                        clientProfile: true,
                        agentProfile: true
                    }
                });
                if (developmentRole === 'ADMIN' || developmentRole === 'SUPERVISOR') {
                    await this.prisma.adminProfile.create({
                        data: {
                            userId: user.id,
                            permissions: ['read', 'write', 'delete', 'admin'],
                            accessLevel: developmentRole === 'ADMIN' ? 'ADMIN' : 'ELEVATED',
                            department: 'Development',
                            position: developmentRole === 'ADMIN' ? 'Development Admin' : 'Development Supervisor'
                        }
                    });
                }
                else if (developmentRole === 'CLIENT') {
                    await this.prisma.clientProfile.create({
                        data: {
                            userId: user.id,
                            companyName: 'Development Company',
                            contactPerson: 'Development Contact'
                        }
                    });
                }
                else if (developmentRole === 'AGENT') {
                    await this.prisma.agentProfile.create({
                        data: {
                            userId: user.id,
                            employeeId: `DEV-${Date.now()}`,
                            hireDate: new Date(),
                            skills: ['development', 'testing'],
                            certifications: ['Development Certification']
                        }
                    });
                }
                user = await this.prisma.user.findUnique({
                    where: { id: user.id },
                    include: {
                        adminProfile: true,
                        clientProfile: true,
                        agentProfile: true
                    }
                });
            }
            if (user && user.status !== 'ACTIVE') {
                throw new Error('User account is not active');
            }
            if (!user) {
                throw new Error('Failed to create or retrieve development user');
            }
            logger_1.logger.info('Development authentication successful', {
                userId: user.id,
                email: user.email,
                role: user.role,
                developmentMode: true,
                environment: process.env.NODE_ENV
            });
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
                authenticationMethod: this.getAuthenticationMethod(),
                profileData: {
                    adminProfile: user.adminProfile,
                    clientProfile: user.clientProfile,
                    agentProfile: user.agentProfile
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Development authentication failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                token: token.substring(0, 20) + '...',
                developmentMode: this.isDevelopmentMode(),
                environment: process.env.NODE_ENV
            });
            throw new Error(`Development authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.DevelopmentAuthenticationStrategy = DevelopmentAuthenticationStrategy;
class AuthenticationStrategyFactory {
    constructor() {
        this.strategies = [
            new JWTAuthenticationStrategy(),
            new EmailAuthenticationStrategy(),
            new DevelopmentAuthenticationStrategy()
        ];
    }
    getStrategy(tokenType) {
        return this.strategies.find(strategy => strategy.canHandle(tokenType)) || null;
    }
    getAllStrategies() {
        return [...this.strategies];
    }
    addStrategy(strategy) {
        this.strategies.push(strategy);
    }
    removeStrategy(authenticationMethod) {
        this.strategies = this.strategies.filter(strategy => strategy.getAuthenticationMethod() !== authenticationMethod);
    }
}
exports.AuthenticationStrategyFactory = AuthenticationStrategyFactory;
exports.authenticationStrategyFactory = new AuthenticationStrategyFactory();
//# sourceMappingURL=authenticationStrategies.js.map