"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTypeDetector = exports.TokenPatternUtils = exports.TokenTypeDetectorImpl = void 0;
exports.createTokenTypeDetector = createTokenTypeDetector;
const auth_1 = require("../types/auth");
class TokenTypeDetectorImpl {
    detectTokenType(token) {
        if (!token || typeof token !== 'string') {
            return auth_1.TokenType.JWT;
        }
        const trimmedToken = token.trim();
        if (trimmedToken.startsWith('dev:')) {
            return auth_1.TokenType.DEVELOPMENT;
        }
        if (trimmedToken.startsWith('eyJ')) {
            return auth_1.TokenType.JWT;
        }
        if (this.isEmailToken(trimmedToken)) {
            return auth_1.TokenType.EMAIL;
        }
        return auth_1.TokenType.JWT;
    }
    isEmailToken(token) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(token) && token.includes('@');
    }
}
exports.TokenTypeDetectorImpl = TokenTypeDetectorImpl;
class TokenPatternUtils {
    static isJWTToken(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        const trimmed = token.trim();
        if (!trimmed.startsWith('eyJ')) {
            return false;
        }
        const parts = trimmed.split('.');
        return parts.length === 3;
    }
    static isEmailToken(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        const trimmed = token.trim();
        if (!trimmed.includes('@')) {
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed);
    }
    static isDevelopmentToken(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        return token.trim().startsWith('dev:');
    }
    static extractEmailFromDevToken(token) {
        if (!this.isDevelopmentToken(token)) {
            return null;
        }
        const email = token.substring(4);
        return this.isEmailToken(email) ? email : null;
    }
    static validateTokenFormat(token, expectedType) {
        switch (expectedType) {
            case auth_1.TokenType.JWT:
                return this.isJWTToken(token);
            case auth_1.TokenType.EMAIL:
                return this.isEmailToken(token);
            case auth_1.TokenType.DEVELOPMENT:
                return this.isDevelopmentToken(token);
            default:
                return false;
        }
    }
    static getTokenDescription(token) {
        if (!token || typeof token !== 'string') {
            return 'invalid_token';
        }
        const trimmed = token.trim();
        if (this.isJWTToken(trimmed)) {
            return `jwt_token(${trimmed.length}_chars)`;
        }
        if (this.isDevelopmentToken(trimmed)) {
            const email = this.extractEmailFromDevToken(trimmed);
            return email ? `dev_token(${email})` : 'dev_token(invalid_format)';
        }
        if (this.isEmailToken(trimmed)) {
            const parts = trimmed.split('@');
            const maskedLocal = parts[0].length > 2
                ? parts[0].substring(0, 2) + '***'
                : '***';
            return `email_token(${maskedLocal}@${parts[1]})`;
        }
        return `unknown_token(${trimmed.length}_chars)`;
    }
}
exports.TokenPatternUtils = TokenPatternUtils;
function createTokenTypeDetector() {
    return new TokenTypeDetectorImpl();
}
exports.tokenTypeDetector = new TokenTypeDetectorImpl();
//# sourceMappingURL=tokenTypeDetector.js.map