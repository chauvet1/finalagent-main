import { TokenType } from '../types/auth';
import { UserRole, UserStatus } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    status: UserStatus;
    permissions?: string[];
    accessLevel?: string;
    authenticationMethod: string;
    profileData?: {
        adminProfile?: any;
        clientProfile?: any;
        agentProfile?: any;
    };
}
export interface AuthenticationStrategy {
    authenticate(token: string): Promise<AuthenticatedUser>;
    canHandle(tokenType: TokenType): boolean;
    getAuthenticationMethod(): string;
}
export declare class JWTAuthenticationStrategy implements AuthenticationStrategy {
    private clerkClient;
    private prisma;
    constructor();
    canHandle(tokenType: TokenType): boolean;
    getAuthenticationMethod(): string;
    authenticate(token: string): Promise<AuthenticatedUser>;
    private getUserFromDatabase;
}
export declare class EmailAuthenticationStrategy implements AuthenticationStrategy {
    private prisma;
    constructor();
    canHandle(tokenType: TokenType): boolean;
    getAuthenticationMethod(): string;
    authenticate(token: string): Promise<AuthenticatedUser>;
}
export declare class DevelopmentAuthenticationStrategy implements AuthenticationStrategy {
    private prisma;
    constructor();
    private isDevelopmentMode;
    private getDevelopmentUserRole;
    canHandle(tokenType: TokenType): boolean;
    getAuthenticationMethod(): string;
    authenticate(token: string): Promise<AuthenticatedUser>;
}
export declare class AuthenticationStrategyFactory {
    private strategies;
    constructor();
    getStrategy(tokenType: TokenType): AuthenticationStrategy | null;
    getAllStrategies(): AuthenticationStrategy[];
    addStrategy(strategy: AuthenticationStrategy): void;
    removeStrategy(authenticationMethod: string): void;
}
export declare const authenticationStrategyFactory: AuthenticationStrategyFactory;
//# sourceMappingURL=authenticationStrategies.d.ts.map