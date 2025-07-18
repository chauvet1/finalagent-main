/**
 * Authentication token types supported by the system
 */
export enum TokenType {
  JWT = 'jwt',
  EMAIL = 'email',
  DEVELOPMENT = 'development'
}

/**
 * Interface for providing authentication tokens
 */
export interface TokenProvider {
  /**
   * Get the current authentication token
   * @returns Promise resolving to the token string
   */
  getAuthToken(): Promise<string>;
  
  /**
   * Get the type of the current token
   * @returns The token type
   */
  getTokenType(): Promise<TokenType>;
  
  /**
   * Check if a valid token is available
   * @returns Promise resolving to boolean indicating token availability
   */
  hasValidToken(): Promise<boolean>;
  
  /**
   * Get token information including type and validity
   * @returns Promise resolving to token information
   */
  getTokenInfo(): Promise<TokenInfo>;
}

/**
 * Token provider configuration
 */
export interface TokenProviderConfig {
  developmentMode?: boolean;
  fallbackEmail?: string;
  tokenPrefix?: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  token: string;
  type: TokenType;
  isValid: boolean;
  expiresAt?: Date;
}