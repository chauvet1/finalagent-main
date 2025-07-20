import { Request, Response, NextFunction } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import { EnhancedAuthContext } from '../types/auth';
interface AuthenticatedUser {
    id: string;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    status: UserStatus;
    permissions?: string[];
    accessLevel?: string;
    profileData?: {
        adminProfile?: any;
        clientProfile?: any;
        agentProfile?: any;
    };
}
declare global {
    namespace Express {
        interface Request {
            auth?: EnhancedAuthContext;
            user?: AuthenticatedUser;
        }
    }
}
export declare class AuthenticationError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class AuthorizationError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class AuthenticationService {
    private static instance;
    static getInstance(): AuthenticationService;
    private extractToken;
    authenticateRequest(req: Request): Promise<{
        auth: EnhancedAuthContext;
        user: AuthenticatedUser;
    }>;
    private generateSessionId;
}
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireRole: (allowedRoles: UserRole[], options?: {
    checkPermissions?: string[];
    requireAccessLevel?: string;
}) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireClient: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireAgent: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireSupervisor: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requirePermissions: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare class SessionManager {
    private static instance;
    static getInstance(): SessionManager;
    createSession(userId: string, deviceInfo?: any): Promise<string>;
    validateSession(sessionToken: string): Promise<boolean>;
    revokeSession(sessionToken: string): Promise<void>;
    revokeAllUserSessions(userId: string): Promise<void>;
}
export declare const addRequestContext: (req: Request, res: Response, next: NextFunction) => void;
export declare const auditLog: (action: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const handleAuthError: (error: any, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authHealthCheck: (req: Request, res: Response) => Promise<void>;
declare const _default: {
    AuthenticationService: typeof AuthenticationService;
    SessionManager: typeof SessionManager;
    requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireRole: (allowedRoles: UserRole[], options?: {
        checkPermissions?: string[];
        requireAccessLevel?: string;
    }) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireClient: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireAgent: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireSupervisor: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requirePermissions: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    addRequestContext: (req: Request, res: Response, next: NextFunction) => void;
    auditLog: (action: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    handleAuthError: (error: any, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    authHealthCheck: (req: Request, res: Response) => Promise<void>;
    AuthenticationError: typeof AuthenticationError;
    AuthorizationError: typeof AuthorizationError;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map