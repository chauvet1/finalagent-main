// Token types
export type TokenType = 'JWT' | 'EMAIL' | 'DEVELOPMENT';

export class TokenProvider {
  private cachedToken: string | null = null;
  private cachedTokenType: TokenType = 'JWT';
  private tokenExpiryTime: number = 0;
  private tokenRefreshPromise: Promise<string> | null = null;

  // Get the authentication token
  async getToken(): Promise<string> {
    // If we have a cached token that's not expired, return it
    if (this.cachedToken && Date.now() < this.tokenExpiryTime) {
      return this.cachedToken;
    }

    // If we're already fetching a token, wait for that promise
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    // Otherwise, fetch a new token
    this.tokenRefreshPromise = this.fetchFreshToken();
    
    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  // Get the token type
  async getTokenType(): Promise<TokenType> {
    // Ensure we have a token first, which will set the token type
    await this.getToken();
    return this.cachedTokenType;
  }

  // Fetch a fresh token from the authentication provider
  private async fetchFreshToken(): Promise<string> {
    try {
      // Try to get token from mobile auth system
      const token = await this.getMobileAuthToken();
      
      if (token) {
        // Determine if this is a JWT or an email token
        this.cachedTokenType = this.detectTokenType(token);
        this.cachedToken = token;
        
        // Set expiry to 10 minutes from now (conservative)
        this.tokenExpiryTime = Date.now() + 10 * 60 * 1000;
        return token;
      }
    } catch (error) {
      console.error('Error getting token from mobile auth:', error);
    }

    // Fallback to development token if in development mode
    if (__DEV__) {
      console.warn('Using development token as fallback');
      const devToken = 'dev-mobile-token-for-testing';
      this.cachedToken = devToken;
      this.cachedTokenType = 'DEVELOPMENT';
      this.tokenExpiryTime = Date.now() + 60 * 60 * 1000; // 1 hour
      return devToken;
    }

    throw new Error('Failed to get authentication token');
  }

  // Get token from mobile authentication system
  private async getMobileAuthToken(): Promise<string | null> {
    try {
      // This would integrate with your mobile authentication system
      // For example, AsyncStorage, Keychain, or other secure storage
      // For now, we'll return null to fall back to development mode
      return null;
    } catch (error) {
      console.error('Error accessing mobile auth token:', error);
      return null;
    }
  }

  // Detect if token is JWT or email
  private detectTokenType(token: string): TokenType {
    // Check if token is in JWT format (has two dots separating three base64 segments)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
      return 'JWT';
    }
    
    // Check if token looks like an email address
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) {
      return 'EMAIL';
    }
    
    // Default to JWT if we can't determine
    return 'JWT';
  }
}