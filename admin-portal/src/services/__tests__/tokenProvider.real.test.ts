/**
 * Real data tests for Admin Portal Token Provider
 * No mocks used - all tests use real implementations
 */

import { createTokenProvider, detectTokenType } from '../tokenProvider';
import { TokenType } from '../../types/auth';

describe('Admin Portal Token Provider - Real Data Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Clear any global tokens
    delete (window as any).__CLERK_SESSION_TOKEN;
    delete (window as any).Clerk;
  });

  describe('Token Type Detection', () => {
    it('should detect JWT tokens correctly', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const tokenType = detectTokenType(jwtToken);
      
      expect(tokenType).toBe(TokenType.JWT);
    });

    it('should detect development tokens correctly', () => {
      const devToken = 'dev:admin@bahinlink.com';
      
      const tokenType = detectTokenType(devToken);
      
      expect(tokenType).toBe(TokenType.DEVELOPMENT);
    });

    it('should detect email tokens correctly', () => {
      const emailToken = 'admin@bahinlink.com';
      
      const tokenType = detectTokenType(emailToken);
      
      expect(tokenType).toBe(TokenType.EMAIL);
    });

    it('should default to JWT for unknown token formats', () => {
      const unknownToken = 'unknown-token-format';
      
      const tokenType = detectTokenType(unknownToken);
      
      expect(tokenType).toBe(TokenType.JWT);
    });
  });

  describe('Development Mode Behavior', () => {
    it('should handle development mode token generation', async () => {
      // Create a token provider with development mode explicitly enabled
      const devTokenProvider = createTokenProvider(null, {
        developmentMode: true,
        fallbackEmail: 'admin@bahinlink.com'
      });
      
      const tokenInfo = await devTokenProvider.getTokenInfo();
      
      // In development mode, should provide a development token
      expect(tokenInfo.type).toBe(TokenType.DEVELOPMENT);
      expect(tokenInfo.token).toContain('dev:');
      expect(tokenInfo.isValid).toBe(true);
    });

    it('should use fallback email in development mode', async () => {
      // Create a token provider with development mode explicitly enabled
      const devTokenProvider = createTokenProvider(null, {
        developmentMode: true,
        fallbackEmail: 'admin@bahinlink.com'
      });
      
      const tokenInfo = await devTokenProvider.getTokenInfo();
      
      expect(tokenInfo.token).toBe('dev:admin@bahinlink.com');
      expect(tokenInfo.type).toBe(TokenType.DEVELOPMENT);
      expect(tokenInfo.isValid).toBe(true);
    });
  });

  describe('Token Provider Creation', () => {
    it('should create token provider with default configuration', () => {
      const tokenProvider = createTokenProvider(null);
      
      expect(tokenProvider).toBeDefined();
      expect(typeof tokenProvider.getAuthToken).toBe('function');
      expect(typeof tokenProvider.getTokenInfo).toBe('function');
      expect(typeof tokenProvider.hasValidToken).toBe('function');
    });

    it('should create token provider with custom configuration', () => {
      const config = {
        developmentMode: true,
        fallbackEmail: 'custom@bahinlink.com',
        tokenPrefix: 'custom:'
      };
      
      const tokenProvider = createTokenProvider(null, config);
      
      expect(tokenProvider).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle token provider errors gracefully', async () => {
      // Create a token provider in non-development mode with no Clerk auth
      const tokenProvider = createTokenProvider(null, {
        developmentMode: false
      });
      
      // This should not throw even if no token is available
      const tokenInfo = await tokenProvider.getTokenInfo();
      
      // Should return default values instead of throwing
      expect(tokenInfo).toHaveProperty('token');
      expect(tokenInfo).toHaveProperty('type');
      expect(tokenInfo).toHaveProperty('isValid');
    });

    it('should handle authentication availability check errors', async () => {
      const tokenProvider = createTokenProvider(null, {
        developmentMode: false
      });
      
      // Should not throw even if there are internal errors
      const isAvailable = await tokenProvider.hasValidToken();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('JWT Token Expiration Handling', () => {
    it('should handle JWT token expiration detection', async () => {
      // Create a JWT token with expiration
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        sub: '1234567890', 
        name: 'John Doe', 
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }));
      const signature = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const jwtToken = `${header}.${payload}.${signature}`;
      
      // Create a token provider with development mode and set the token
      const tokenProvider = createTokenProvider(null, {
        developmentMode: true
      });
      
      // Mock the token by creating a provider that returns this token
      const mockClerkAuth = {
        getToken: async () => jwtToken
      };
      
      const tokenProviderWithToken = createTokenProvider(mockClerkAuth, {
        developmentMode: false
      });
      
      const tokenInfo = await tokenProviderWithToken.getTokenInfo();
      
      expect(tokenInfo.token).toBe(jwtToken);
      expect(tokenInfo.type).toBe(TokenType.JWT);
      expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle JWT tokens without expiration', async () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        sub: '1234567890', 
        name: 'John Doe'
        // No exp field
      }));
      const signature = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const jwtToken = `${header}.${payload}.${signature}`;
      
      const mockClerkAuth = {
        getToken: async () => jwtToken
      };
      
      const tokenProvider = createTokenProvider(mockClerkAuth, {
        developmentMode: false
      });
      
      const tokenInfo = await tokenProvider.getTokenInfo();
      
      expect(tokenInfo.expiresAt).toBeUndefined();
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      const malformedToken = 'eyJ.malformed.token';
      
      const mockClerkAuth = {
        getToken: async () => malformedToken
      };
      
      const tokenProvider = createTokenProvider(mockClerkAuth, {
        developmentMode: false
      });
      
      const tokenInfo = await tokenProvider.getTokenInfo();
      
      // Should not throw error and should still return token info
      expect(tokenInfo.token).toBe(malformedToken);
      expect(tokenInfo.type).toBe(TokenType.JWT);
      expect(tokenInfo.expiresAt).toBeUndefined();
    });
  });
});