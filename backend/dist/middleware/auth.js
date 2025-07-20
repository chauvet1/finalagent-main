"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHealthCheck = exports.handleAuthError = exports.auditLog = exports.addRequestContext = exports.SessionManager = exports.optionalAuth = exports.requirePermissions = exports.requireSupervisor = exports.requireAgent = exports.requireClient = exports.requireSuperAdmin = exports.requireAdmin = exports.requireRole = exports.requireAuth = exports.AuthenticationService = exports.AuthorizationError = exports.AuthenticationError = void 0;
const backend_1 = require("@clerk/backend");
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const tokenTypeDetector_1 = require("../utils/tokenTypeDetector");
const authenticationStrategies_1 = require("../services/authenticationStrategies");
class AuthenticationError extends Error {
    constructor(message, code, statusCode = 401) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message, code, statusCode = 403) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
const clerkClient = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
const prisma = new client_1.PrismaClient();
class AuthenticationService {
    static getInstance() {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }
    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
    async authenticateRequest(req) {
        const token = this.extractToken(req);
        if (!token) {
            throw new AuthenticationError('Authentication token required', 'TOKEN_REQUIRED');
        }
        try {
            const tokenType = tokenTypeDetector_1.tokenTypeDetector.detectTokenType(token);
            logger_1.logger.debug('Token type detected', {
                tokenType,
                tokenLength: token.length,
                tokenPrefix: token.substring(0, 10) + '...'
            });
            const strategy = authenticationStrategies_1.authenticationStrategyFactory.getStrategy(tokenType);
            if (!strategy) {
                throw new AuthenticationError(`Unsupported token type: ${tokenType}`, 'UNSUPPORTED_TOKEN_TYPE');
            }
            const authenticatedUser = await strategy.authenticate(token);
            const user = {
                id: authenticatedUser.id,
                clerkId: authenticatedUser.clerkId,
                email: authenticatedUser.email,
                firstName: authenticatedUser.firstName,
                lastName: authenticatedUser.lastName,
                role: authenticatedUser.role,
                status: authenticatedUser.status,
                permissions: authenticatedUser.permissions,
                accessLevel: authenticatedUser.accessLevel,
                profileData: authenticatedUser.profileData
            };
            const auth = {
                userId: authenticatedUser.clerkId,
                sessionId: this.generateSessionId(tokenType, authenticatedUser.id),
                claims: { sub: authenticatedUser.clerkId, email: authenticatedUser.email },
                token,
                tokenType,
                authenticationMethod: authenticatedUser.authenticationMethod,
                authenticatedAt: new Date()
            };
            logger_1.logger.info('Authentication successful', {
                userId: user.id,
                email: user.email,
                role: user.role,
                tokenType,
                authenticationMethod: authenticatedUser.authenticationMethod
            });
            return { auth, user };
        }
        catch (error) {
            logger_1.logger.error('Authentication failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                tokenLength: token.length,
                tokenPrefix: token.substring(0, 10) + '...'
            });
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'AUTHENTICATION_FAILED');
        }
    }
    generateSessionId(tokenType, userId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${tokenType}_${userId.substring(0, 8)}_${timestamp}_${random}`;
    }
}
exports.AuthenticationService = AuthenticationService;
const requireAuth = async (req, res, next) => {
    try {
        const authService = AuthenticationService.getInstance();
        const { auth, user } = await authService.authenticateRequest(req);
        req.auth = auth;
        req.user = user;
        logger_1.logger.info('User authenticated successfully', {
            userId: user.id,
            email: user.email,
            role: user.role,
            tokenType: auth.tokenType,
            authenticationMethod: auth.authenticationMethod,
            sessionId: auth.sessionId,
            endpoint: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: auth.authenticatedAt.toISOString()
        });
        next();
    }
    catch (error) {
        logger_1.logger.warn('Authentication failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            path: req.path,
            ip: req.ip
        });
        if (error instanceof AuthenticationError) {
            return res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.code,
                    message: error.message
                }
            });
        }
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: 'Authentication failed'
            }
        });
    }
};
exports.requireAuth = requireAuth;
const requireRole = (allowedRoles, options) => {
    return async (req, res, next) => {
        try {
            if (!req.auth || !req.user) {
                throw new AuthenticationError('Authentication required', 'AUTHENTICATION_REQUIRED');
            }
            const user = req.user;
            if (!allowedRoles.includes(user.role)) {
                logger_1.logger.warn('Role authorization failed', {
                    userId: user.id,
                    userRole: user.role,
                    allowedRoles,
                    endpoint: req.path
                });
                throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${user.role}`, 'INSUFFICIENT_ROLE');
            }
            if (options?.checkPermissions && user.permissions) {
                const hasRequiredPermissions = options.checkPermissions.every(permission => user.permissions.includes(permission));
                if (!hasRequiredPermissions) {
                    throw new AuthorizationError('Insufficient permissions for this action', 'INSUFFICIENT_PERMISSIONS');
                }
            }
            if (options?.requireAccessLevel && user.accessLevel) {
                const accessLevels = ['STANDARD', 'ELEVATED', 'ADMIN', 'SUPER_ADMIN'];
                const userLevelIndex = accessLevels.indexOf(user.accessLevel);
                const requiredLevelIndex = accessLevels.indexOf(options.requireAccessLevel);
                if (userLevelIndex < requiredLevelIndex) {
                    throw new AuthorizationError('Insufficient access level for this action', 'INSUFFICIENT_ACCESS_LEVEL');
                }
            }
            logger_1.logger.debug('User authorized successfully', {
                userId: user.id,
                role: user.role,
                endpoint: req.path
            });
            next();
        }
        catch (error) {
            if (error instanceof AuthorizationError) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }
            if (error instanceof AuthenticationError) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }
            return res.status(500).json({
                success: false,
                error: {
                    code: 'AUTHORIZATION_ERROR',
                    message: 'Authorization check failed'
                }
            });
        }
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['ADMIN', 'SUPERVISOR']);
exports.requireSuperAdmin = (0, exports.requireRole)(['ADMIN'], { requireAccessLevel: 'ADMIN' });
exports.requireClient = (0, exports.requireRole)(['CLIENT']);
exports.requireAgent = (0, exports.requireRole)(['AGENT', 'SUPERVISOR', 'ADMIN']);
exports.requireSupervisor = (0, exports.requireRole)(['SUPERVISOR', 'ADMIN']);
const requirePermissions = (permissions) => {
    return (0, exports.requireRole)(['ADMIN', 'SUPERVISOR'], { checkPermissions: permissions });
};
exports.requirePermissions = requirePermissions;
const optionalAuth = async (req, res, next) => {
    try {
        const authService = AuthenticationService.getInstance();
        const { auth, user } = await authService.authenticateRequest(req);
        req.auth = auth;
        req.user = user;
    }
    catch (error) {
        logger_1.logger.debug('Optional auth failed, continuing without authentication', {
            path: req.path,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
    next();
};
exports.optionalAuth = optionalAuth;
class SessionManager {
    static getInstance() {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }
    async createSession(userId, deviceInfo) {
        try {
            const sessionToken = crypto_1.default.randomBytes(32).toString('hex');
            await prisma.session.create({
                data: {
                    userId,
                    sessionToken,
                    deviceInfo,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });
            return sessionToken;
        }
        catch (error) {
            logger_1.logger.error('Session creation failed', { error, userId });
            throw new Error('Failed to create session');
        }
    }
    async validateSession(sessionToken) {
        try {
            const session = await prisma.session.findUnique({
                where: { sessionToken },
                include: { user: true }
            });
            if (!session || session.expiresAt < new Date()) {
                return false;
            }
            return session.user.status === 'ACTIVE';
        }
        catch (error) {
            logger_1.logger.error('Session validation failed', { error, sessionToken });
            return false;
        }
    }
    async revokeSession(sessionToken) {
        try {
            await prisma.session.delete({
                where: { sessionToken }
            });
        }
        catch (error) {
            logger_1.logger.error('Session revocation failed', { error, sessionToken });
        }
    }
    async revokeAllUserSessions(userId) {
        try {
            await prisma.session.deleteMany({
                where: { userId }
            });
        }
        catch (error) {
            logger_1.logger.error('User sessions revocation failed', { error, userId });
        }
    }
}
exports.SessionManager = SessionManager;
const addRequestContext = (req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestStartTime = Date.now();
    logger_1.logger.info('Request received', {
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
    });
    next();
};
exports.addRequestContext = addRequestContext;
const auditLog = (action) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function (data) {
            setImmediate(async () => {
                try {
                    await prisma.auditLog.create({
                        data: {
                            userId: req.user?.id,
                            action,
                            entity: req.path.split('/')[2] || 'unknown',
                            entityId: req.params.id || null,
                            ipAddress: req.ip,
                            userAgent: req.get('User-Agent'),
                            metadata: {
                                method: req.method,
                                path: req.path,
                                statusCode: res.statusCode,
                                requestId: req.headers['x-request-id']
                            }
                        }
                    });
                }
                catch (error) {
                    logger_1.logger.error('Audit log creation failed', { error, action, userId: req.user?.id });
                }
            });
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.auditLog = auditLog;
const handleAuthError = (error, req, res, next) => {
    logger_1.logger.error('Authentication error occurred', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    if (error instanceof AuthenticationError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message
            }
        });
    }
    if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message
            }
        });
    }
    if (error.name === 'UnauthorizedError' || error.status === 401) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: 'Invalid or expired authentication token'
            }
        });
    }
    if (error.name === 'ForbiddenError' || error.status === 403) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'ACCESS_DENIED',
                message: 'Access denied'
            }
        });
    }
    next(error);
};
exports.handleAuthError = handleAuthError;
const authHealthCheck = async (req, res) => {
    try {
        await prisma.user.count();
        let clerkStatus = 'not_configured';
        if (process.env.CLERK_SECRET_KEY) {
            try {
                clerkStatus = 'healthy';
            }
            catch (error) {
                clerkStatus = 'error';
            }
        }
        res.json({
            success: true,
            data: {
                database: 'healthy',
                clerk: clerkStatus,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Auth health check failed', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'HEALTH_CHECK_FAILED',
                message: 'Authentication service health check failed'
            }
        });
    }
};
exports.authHealthCheck = authHealthCheck;
exports.default = {
    AuthenticationService,
    SessionManager,
    requireAuth: exports.requireAuth,
    requireRole: exports.requireRole,
    requireAdmin: exports.requireAdmin,
    requireSuperAdmin: exports.requireSuperAdmin,
    requireClient: exports.requireClient,
    requireAgent: exports.requireAgent,
    requireSupervisor: exports.requireSupervisor,
    requirePermissions: exports.requirePermissions,
    optionalAuth: exports.optionalAuth,
    addRequestContext: exports.addRequestContext,
    auditLog: exports.auditLog,
    handleAuthError: exports.handleAuthError,
    authHealthCheck: exports.authHealthCheck,
    AuthenticationError,
    AuthorizationError
};
//# sourceMappingURL=auth.js.map