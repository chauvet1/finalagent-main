import { TokenType, TokenTypeDetector } from '../types/auth';
export declare class TokenTypeDetectorImpl implements TokenTypeDetector {
    detectTokenType(token: string): TokenType;
    private isEmailToken;
}
export declare class TokenPatternUtils {
    static isJWTToken(token: string): boolean;
    static isEmailToken(token: string): boolean;
    static isDevelopmentToken(token: string): boolean;
    static extractEmailFromDevToken(token: string): string | null;
    static validateTokenFormat(token: string, expectedType: TokenType): boolean;
    static getTokenDescription(token: string): string;
}
export declare function createTokenTypeDetector(): TokenTypeDetector;
export declare const tokenTypeDetector: TokenTypeDetectorImpl;
//# sourceMappingURL=tokenTypeDetector.d.ts.map