import { TokenType, TokenTypeDetector } from '../types/auth';

/**
 * Implementation of token type detection logic
 */
export class TokenTypeDetectorImpl implements TokenTypeDetector {
  /**
   * Detect the type of authentication token based on its format
   * @param token - The token string to analyze
   * @returns The detected token type
   */
  detectTokenType(token: string): TokenType {
    if (!token || typeof token !== 'string') {
      // Default to JWT for invalid input
      return TokenType.JWT;
    }

    // Trim whitespace
    const trimmedToken = token.trim();

    // Check for development token prefix
    if (trimmedToken.startsWith('dev:')) {
      return TokenType.DEVELOPMENT;
    }

    // Check for JWT token pattern (starts with 'eyJ' which is base64 encoded '{"')
    if (trimmedToken.startsWith('eyJ')) {
      return TokenType.JWT;
    }

    // Check for email pattern (contains '@' and basic email validation)
    if (this.isEmailToken(trimmedToken)) {
      return TokenType.EMAIL;
    }

    // Default to JWT for unknown patterns
    return TokenType.JWT;
  }

  /**
   * Check if token appears to be an email address
   * @param token - The token to check
   * @returns True if token looks like an email
   */
  private isEmailToken(token: string): boolean {
    // Basic email pattern check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(token) && token.includes('@');
  }
}

/**
 * Utility functions for token pattern matching
 */
export class TokenPatternUtils {
  /**
   * Check if token is a JWT token
   * @param token - Token to check
   * @returns True if token appears to be JWT
   */
  static isJWTToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    const trimmed = token.trim();
    
    // JWT tokens start with 'eyJ' (base64 encoded '{"')
    if (!trimmed.startsWith('eyJ')) {
      return false;
    }
    
    // JWT tokens have 3 parts separated by dots
    const parts = trimmed.split('.');
    return parts.length === 3;
  }

  /**
   * Check if token is an email address
   * @param token - Token to check
   * @returns True if token appears to be an email
   */
  static isEmailToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    const trimmed = token.trim();
    
    // Must contain @ symbol
    if (!trimmed.includes('@')) {
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }

  /**
   * Check if token is a development token
   * @param token - Token to check
   * @returns True if token appears to be a development token
   */
  static isDevelopmentToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    return token.trim().startsWith('dev:');
  }

  /**
   * Extract email from development token
   * @param token - Development token (format: "dev:email@domain.com")
   * @returns Email address or null if invalid format
   */
  static extractEmailFromDevToken(token: string): string | null {
    if (!this.isDevelopmentToken(token)) {
      return null;
    }
    
    const email = token.substring(4); // Remove 'dev:' prefix
    return this.isEmailToken(email) ? email : null;
  }

  /**
   * Validate token format based on detected type
   * @param token - Token to validate
   * @param expectedType - Expected token type
   * @returns True if token matches expected format
   */
  static validateTokenFormat(token: string, expectedType: TokenType): boolean {
    switch (expectedType) {
      case TokenType.JWT:
        return this.isJWTToken(token);
      case TokenType.EMAIL:
        return this.isEmailToken(token);
      case TokenType.DEVELOPMENT:
        return this.isDevelopmentToken(token);
      default:
        return false;
    }
  }

  /**
   * Get token description for logging purposes
   * @param token - Token to describe
   * @returns Safe description of token (without exposing sensitive data)
   */
  static getTokenDescription(token: string): string {
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
      // Mask email for security
      const parts = trimmed.split('@');
      const maskedLocal = parts[0].length > 2 
        ? parts[0].substring(0, 2) + '***' 
        : '***';
      return `email_token(${maskedLocal}@${parts[1]})`;
    }
    
    return `unknown_token(${trimmed.length}_chars)`;
  }
}

/**
 * Factory function to create token type detector instance
 */
export function createTokenTypeDetector(): TokenTypeDetector {
  return new TokenTypeDetectorImpl();
}

/**
 * Singleton instance for global use
 */
export const tokenTypeDetector = new TokenTypeDetectorImpl();