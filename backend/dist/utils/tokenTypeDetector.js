"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTypeDetector = exports.TokenPatternUtils = exports.TokenTypeDetectorImpl = void 0;
exports.createTokenTypeDetector = createTokenTypeDetector;
var auth_1 = require("../types/auth");
/**
 * Implementation of token type detection logic
 */
var TokenTypeDetectorImpl = /** @class */ (function () {
    function TokenTypeDetectorImpl() {
    }
    /**
     * Detect the type of authentication token based on its format
     * @param token - The token string to analyze
     * @returns The detected token type
     */
    TokenTypeDetectorImpl.prototype.detectTokenType = function (token) {
        if (!token || typeof token !== 'string') {
            // Default to JWT for invalid input
            return auth_1.TokenType.JWT;
        }
        // Trim whitespace
        var trimmedToken = token.trim();
        // Check for development token prefix
        if (trimmedToken.startsWith('dev:')) {
            return auth_1.TokenType.DEVELOPMENT;
        }
        // Check for JWT token pattern (starts with 'eyJ' which is base64 encoded '{"')
        if (trimmedToken.startsWith('eyJ')) {
            return auth_1.TokenType.JWT;
        }
        // Check for email pattern (contains '@' and basic email validation)
        if (this.isEmailToken(trimmedToken)) {
            return auth_1.TokenType.EMAIL;
        }
        // Default to JWT for unknown patterns
        return auth_1.TokenType.JWT;
    };
    /**
     * Check if token appears to be an email address
     * @param token - The token to check
     * @returns True if token looks like an email
     */
    TokenTypeDetectorImpl.prototype.isEmailToken = function (token) {
        // Basic email pattern check
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(token) && token.includes('@');
    };
    return TokenTypeDetectorImpl;
}());
exports.TokenTypeDetectorImpl = TokenTypeDetectorImpl;
/**
 * Utility functions for token pattern matching
 */
var TokenPatternUtils = /** @class */ (function () {
    function TokenPatternUtils() {
    }
    /**
     * Check if token is a JWT token
     * @param token - Token to check
     * @returns True if token appears to be JWT
     */
    TokenPatternUtils.isJWTToken = function (token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        var trimmed = token.trim();
        // JWT tokens start with 'eyJ' (base64 encoded '{"')
        if (!trimmed.startsWith('eyJ')) {
            return false;
        }
        // JWT tokens have 3 parts separated by dots
        var parts = trimmed.split('.');
        return parts.length === 3;
    };
    /**
     * Check if token is an email address
     * @param token - Token to check
     * @returns True if token appears to be an email
     */
    TokenPatternUtils.isEmailToken = function (token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        var trimmed = token.trim();
        // Must contain @ symbol
        if (!trimmed.includes('@')) {
            return false;
        }
        // Basic email validation
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed);
    };
    /**
     * Check if token is a development token
     * @param token - Token to check
     * @returns True if token appears to be a development token
     */
    TokenPatternUtils.isDevelopmentToken = function (token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        return token.trim().startsWith('dev:');
    };
    /**
     * Extract email from development token
     * @param token - Development token (format: "dev:email@domain.com")
     * @returns Email address or null if invalid format
     */
    TokenPatternUtils.extractEmailFromDevToken = function (token) {
        if (!this.isDevelopmentToken(token)) {
            return null;
        }
        var email = token.substring(4); // Remove 'dev:' prefix
        return this.isEmailToken(email) ? email : null;
    };
    /**
     * Validate token format based on detected type
     * @param token - Token to validate
     * @param expectedType - Expected token type
     * @returns True if token matches expected format
     */
    TokenPatternUtils.validateTokenFormat = function (token, expectedType) {
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
    };
    /**
     * Get token description for logging purposes
     * @param token - Token to describe
     * @returns Safe description of token (without exposing sensitive data)
     */
    TokenPatternUtils.getTokenDescription = function (token) {
        if (!token || typeof token !== 'string') {
            return 'invalid_token';
        }
        var trimmed = token.trim();
        if (this.isJWTToken(trimmed)) {
            return "jwt_token(".concat(trimmed.length, "_chars)");
        }
        if (this.isDevelopmentToken(trimmed)) {
            var email = this.extractEmailFromDevToken(trimmed);
            return email ? "dev_token(".concat(email, ")") : 'dev_token(invalid_format)';
        }
        if (this.isEmailToken(trimmed)) {
            // Mask email for security
            var parts = trimmed.split('@');
            var maskedLocal = parts[0].length > 2
                ? parts[0].substring(0, 2) + '***'
                : '***';
            return "email_token(".concat(maskedLocal, "@").concat(parts[1], ")");
        }
        return "unknown_token(".concat(trimmed.length, "_chars)");
    };
    return TokenPatternUtils;
}());
exports.TokenPatternUtils = TokenPatternUtils;
/**
 * Factory function to create token type detector instance
 */
function createTokenTypeDetector() {
    return new TokenTypeDetectorImpl();
}
/**
 * Singleton instance for global use
 */
exports.tokenTypeDetector = new TokenTypeDetectorImpl();
