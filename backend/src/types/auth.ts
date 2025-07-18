/**
 * Authentication token types supported by the system
 */
export enum TokenType {
  JWT = 'jwt',
  EMAIL = 'email',
  DEVELOPMENT = 'development'
}

/**
 * Interface for token type detection
 */
export interface TokenTypeDetector {
  /**
   * Detect the type of authentication token
   * @param token - The token string to analyze
   * @returns The detected token type
   */
  detectTokenType(token: string): TokenType;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  isValid: boolean;
  tokenType: TokenType;
  userId?: string;
  claims?: any;
  error?: string;
  authenticationMethod: string;
}

/**
 * Enhanced authentication context
 */
export interface EnhancedAuthContext {
  userId: string;
  sessionId: string;
  claims: any;
  token: string;
  tokenType: TokenType;
  authenticationMethod: 'jwt' | 'email' | 'development';
  authenticatedAt: Date;
}