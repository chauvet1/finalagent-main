export declare enum TokenType {
    JWT = "jwt",
    EMAIL = "email",
    DEVELOPMENT = "development"
}
export interface TokenTypeDetector {
    detectTokenType(token: string): TokenType;
}
export interface TokenValidationResult {
    isValid: boolean;
    tokenType: TokenType;
    userId?: string;
    claims?: any;
    error?: string;
    authenticationMethod: string;
}
export interface EnhancedAuthContext {
    userId: string;
    sessionId: string;
    claims: any;
    token: string;
    tokenType: TokenType;
    authenticationMethod: 'jwt' | 'email' | 'development';
    authenticatedAt: Date;
}
//# sourceMappingURL=auth.d.ts.map