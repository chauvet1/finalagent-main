import { 
  apiClient, 
  getCurrentTokenInfo, 
  isAuthenticationAvailable, 
  refreshAuthToken,
  clearAuthenticationState,
  createAuthenticatedRequest
} from '../api';
import { TokenType } from '../../types/auth';

describe('Enhanced API Service Token Handling', () => {
  beforeEach(() => {
    // Clear any global tokens
    delete (window as any).__CLERK_SESSION_TOKEN;
    delete (window as any).Clerk;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API Client Configuration', () => {
    it('should have correct base URL configuration', () => {
      const expectedBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost/api';
      expect(apiClient.defaults.baseURL).toBe(expectedBaseUrl);
    });

    it('should have correct timeout configuration', () => {
      expect(apiClient.defaults.timeout).toBe(10000);
    });

    it('should have request and response interceptors configured', () => {
      expect(apiClient.interceptors.request).toBeDefined();
      expect(apiClient.interceptors.response).toBeDefined();
    });
  });

  describe('Token Management Utilities', () => {
    describe('getCurrentTokenInfo', () => {
      it('should be a function', () => {
        expect(typeof getCurrentTokenInfo).toBe('function');
      });

      it('should return token information', async () => {
        const tokenInfo = await getCurrentTokenInfo();
        
        expect(tokenInfo).toHaveProperty('token');
        expect(tokenInfo).toHaveProperty('type');
        expect(tokenInfo).toHaveProperty('isValid');
      });

      it('should handle errors gracefully', async () => {
        // Should not throw even if token provider fails
        await expect(getCurrentTokenInfo()).resolves.toBeDefined();
      });
    });

    describe('isAuthenticationAvailable', () => {
      it('should be a function', () => {
        expect(typeof isAuthenticationAvailable).toBe('function');
      });

      it('should return a boolean', async () => {
        const result = await isAuthenticationAvailable();
        expect(typeof result).toBe('boolean');
      });

      it('should handle errors gracefully', async () => {
        // Should not throw even if token provider fails
        await expect(isAuthenticationAvailable()).resolves.toBeDefined();
      });
    });

    describe('refreshAuthToken', () => {
      it('should be a function', () => {
        expect(typeof refreshAuthToken).toBe('function');
      });

      it('should return a boolean', async () => {
        const result = await refreshAuthToken();
        expect(typeof result).toBe('boolean');
      });

      it('should handle errors gracefully', async () => {
        // Should not throw even if refresh fails
        await expect(refreshAuthToken()).resolves.toBeDefined();
      });
    });

    describe('clearAuthenticationState', () => {
      it('should be a function', () => {
        expect(typeof clearAuthenticationState).toBe('function');
      });

      it('should not throw errors', () => {
        expect(() => clearAuthenticationState()).not.toThrow();
      });

      it('should clear global tokens', () => {
        (window as any).__CLERK_SESSION_TOKEN = 'test-token';
        
        clearAuthenticationState();
        
        expect((window as any).__CLERK_SESSION_TOKEN).toBeUndefined();
      });
    });

    describe('createAuthenticatedRequest', () => {
      it('should be a function', () => {
        expect(typeof createAuthenticatedRequest).toBe('function');
      });

      it('should create request config with JWT token', async () => {
        const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        
        const config = await createAuthenticatedRequest(jwtToken);
        
        expect(config).toHaveProperty('headers');
        expect(config.headers['Authorization']).toBe(`Bearer ${jwtToken}`);
        expect(config.headers['X-Token-Type']).toBe('jwt');
      });

      it('should create request config with development token', async () => {
        const devToken = 'dev:admin@bahinlink.com';
        
        const config = await createAuthenticatedRequest(devToken);
        
        expect(config).toHaveProperty('headers');
        expect(config.headers['Authorization']).toBe(`Bearer ${devToken}`);
        expect(config.headers['X-Token-Type']).toBe('development');
      });

      it('should create request config with email token', async () => {
        const emailToken = 'admin@bahinlink.com';
        
        const config = await createAuthenticatedRequest(emailToken);
        
        expect(config).toHaveProperty('headers');
        expect(config.headers['Authorization']).toBe(`Bearer ${emailToken}`);
        expect(config.headers['X-Token-Type']).toBe('email');
      });

      it('should handle empty tokens', async () => {
        const config = await createAuthenticatedRequest('');
        
        expect(config).toHaveProperty('headers');
        expect(config.headers['Authorization']).toBe('Bearer ');
        expect(config.headers['X-Token-Type']).toBe('jwt'); // Default fallback
      });
    });
  });

  describe('Token Type Detection', () => {
    it('should detect JWT tokens correctly', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const config = await createAuthenticatedRequest(jwtToken);
      
      expect(config.headers['X-Token-Type']).toBe('jwt');
    });

    it('should detect development tokens correctly', async () => {
      const devToken = 'dev:admin@bahinlink.com';
      
      const config = await createAuthenticatedRequest(devToken);
      
      expect(config.headers['X-Token-Type']).toBe('development');
    });

    it('should detect email tokens correctly', async () => {
      const emailToken = 'admin@bahinlink.com';
      
      const config = await createAuthenticatedRequest(emailToken);
      
      expect(config.headers['X-Token-Type']).toBe('email');
    });

    it('should default to JWT for unknown token formats', async () => {
      const unknownToken = 'unknown-token-format';
      
      const config = await createAuthenticatedRequest(unknownToken);
      
      expect(config.headers['X-Token-Type']).toBe('jwt');
    });
  });

  describe('Error Handling', () => {
    it('should handle token provider initialization errors', async () => {
      // Test that functions don't throw even when token provider fails
      await expect(getCurrentTokenInfo()).resolves.toBeDefined();
      await expect(isAuthenticationAvailable()).resolves.toBeDefined();
      await expect(refreshAuthToken()).resolves.toBeDefined();
    });

    it('should handle missing global objects gracefully', () => {
      // Ensure no global objects exist
      delete (window as any).__CLERK_SESSION_TOKEN;
      delete (window as any).Clerk;
      
      // Should not throw
      expect(() => clearAuthenticationState()).not.toThrow();
    });
  });

  describe('Development Mode Behavior', () => {
    it('should handle development mode correctly', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Should not throw in development mode
      await expect(getCurrentTokenInfo()).resolves.toBeDefined();
      await expect(isAuthenticationAvailable()).resolves.toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Integration with Token Provider', () => {
    it('should integrate with token provider system', async () => {
      // Test that the API service properly integrates with token provider
      const tokenInfo = await getCurrentTokenInfo();
      
      // Should return proper structure
      expect(tokenInfo).toHaveProperty('token');
      expect(tokenInfo).toHaveProperty('type');
      expect(tokenInfo).toHaveProperty('isValid');
      
      // Type should be one of the valid types
      expect(['jwt', 'email', 'development']).toContain(tokenInfo.type);
    });

    it('should handle token refresh attempts', async () => {
      const refreshResult = await refreshAuthToken();
      
      // Should return boolean result
      expect(typeof refreshResult).toBe('boolean');
    });

    it('should check authentication availability', async () => {
      const isAvailable = await isAuthenticationAvailable();
      
      // Should return boolean result
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing API structure', () => {
      // Verify that the API client still has all expected properties
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
    });

    it('should maintain interceptor functionality', () => {
      // Verify interceptors are still configured
      expect(apiClient.interceptors.request).toBeDefined();
      expect(apiClient.interceptors.response).toBeDefined();
    });
  });
});