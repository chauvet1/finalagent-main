import { TokenProvider, TokenType, TokenProviderConfig, TokenInfo } from '../types/auth';

/**
 * Clerk-based token provider for admin portal
 * Handles JWT tokens from Clerk with fallback to development tokens
 */
export class ClerkTokenProvider implements TokenProvider {
  private config: TokenProviderConfig;
  private clerkAuth: any;

  constructor(clerkAuth: any, config: TokenProviderConfig = {}) {
    this.clerkAuth = clerkAuth;
    this.config = {
      developmentMode: process.env.NODE_ENV === 'development',
      fallbackEmail: 'admin@bahinlink.com',
      tokenPrefix: 'dev:',
      ...config
    };
  }

  /**
   * Get authentication token with proper fallback logic
   */
  async getAuthToken(): Promise<string> {
    try {
      // First try to get Clerk JWT token
      const clerkToken = await this.getClerkToken();
      if (clerkToken) {
        return clerkToken;
      }

      // Fallback to development token if in development mode
      if (this.config.developmentMode) {
        return this.generateDevelopmentToken();
      }

      // If no token available and not in development, throw error
      throw new Error('No authentication token available');
    } catch (error) {
      console.debug('Token retrieval failed:', error);
      
      // In development mode, always provide a fallback
      if (this.config.developmentMode) {
        return this.generateDevelopmentToken();
      }
      
      throw error;
    }
  }

  /**
   * Get the type of the current token
   */
  async getTokenType(): Promise<TokenType> {
    try {
      const token = await this.getAuthToken();
      return this.detectTokenType(token);
    } catch (error) {
      return TokenType.DEVELOPMENT;
    }
  }

  /**
   * Check if a valid token is available
   */
  async hasValidToken(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      return token.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token information including type and validity
   */
  async getTokenInfo(): Promise<TokenInfo> {
    try {
      const token = await this.getAuthToken();
      const type = this.detectTokenType(token);
      
      return {
        token,
        type,
        isValid: true,
        expiresAt: type === TokenType.JWT ? this.getJWTExpiration(token) : undefined
      };
    } catch (error) {
      return {
        token: '',
        type: TokenType.DEVELOPMENT,
        isValid: false
      };
    }
  }

  /**
   * Attempt to get Clerk JWT token
   */
  private async getClerkToken(): Promise<string | null> {
    try {
      // Try multiple methods to get Clerk token
      if (this.clerkAuth?.getToken && typeof this.clerkAuth.getToken === 'function') {
        const token = await this.clerkAuth.getToken();
        if (token && typeof token === 'string') {
          return token;
        }
      }

      // Try to get from session if available
      if (this.clerkAuth?.session?.getToken && typeof this.clerkAuth.session.getToken === 'function') {
        const token = await this.clerkAuth.session.getToken();
        if (token && typeof token === 'string') {
          return token;
        }
      }

      // Check for global Clerk session token
      const globalToken = (window as any).__CLERK_SESSION_TOKEN;
      if (globalToken && typeof globalToken === 'string') {
        return globalToken;
      }

      return null;
    } catch (error) {
      console.debug('Failed to get Clerk token:', error);
      return null;
    }
  }

  /**
   * Generate development token with proper prefix
   */
  private generateDevelopmentToken(): string {
    const userEmail = this.getUserEmail();
    return `${this.config.tokenPrefix}${userEmail}`;
  }

  /**
   * Get user email for development token
   */
  private getUserEmail(): string {
    try {
      // Try to get email from Clerk user
      if (this.clerkAuth?.user?.primaryEmailAddress?.emailAddress) {
        return this.clerkAuth.user.primaryEmailAddress.emailAddress;
      }

      // Try to get from session
      if (this.clerkAuth?.session?.user?.primaryEmailAddress?.emailAddress) {
        return this.clerkAuth.session.user.primaryEmailAddress.emailAddress;
      }

      // Fallback to configured email
      return this.config.fallbackEmail || 'admin@bahinlink.com';
    } catch (error) {
      console.debug('Failed to get user email:', error);
      return this.config.fallbackEmail || 'admin@bahinlink.com';
    }
  }

  /**
   * Detect token type based on token content
   */
  private detectTokenType(token: string): TokenType {
    if (token.startsWith('eyJ')) {
      return TokenType.JWT;
    }
    if (token.startsWith(this.config.tokenPrefix || 'dev:')) {
      return TokenType.DEVELOPMENT;
    }
    if (token.includes('@')) {
      return TokenType.EMAIL;
    }
    return TokenType.JWT; // Default assumption
  }

  /**
   * Extract expiration from JWT token
   */
  private getJWTExpiration(token: string): Date | undefined {
    try {
      if (!token.startsWith('eyJ')) {
        return undefined;
      }

      const payload = token.split('.')[1];
      if (!payload) {
        return undefined;
      }

      const decoded = JSON.parse(atob(payload));
      if (decoded.exp) {
        return new Date(decoded.exp * 1000);
      }

      return undefined;
    } catch (error) {
      console.debug('Failed to extract JWT expiration:', error);
      return undefined;
    }
  }
}

/**
 * Factory function to create token provider
 */
export function createTokenProvider(clerkAuth: any, config?: TokenProviderConfig): TokenProvider {
  return new ClerkTokenProvider(clerkAuth, config);
}

/**
 * Utility function to detect token type without provider instance
 */
export function detectTokenType(token: string): TokenType {
  if (token.startsWith('eyJ')) {
    return TokenType.JWT;
  }
  if (token.startsWith('dev:')) {
    return TokenType.DEVELOPMENT;
  }
  if (token.includes('@')) {
    return TokenType.EMAIL;
  }
  return TokenType.JWT;
}