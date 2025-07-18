import apiClient, { 
  getCurrentTokenInfo, 
  isAuthenticationAvailable, 
  refreshAuthToken,
  clearAuthenticationState,
  createAuthenticatedRequest,
  setAuthToken,
  getAuthToken,
  resetTokenProvider
} from '../api';

describe('Enhanced Client Portal API Service Token Handling', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Clear any global tokens
    delete (window as any).__CLERK_SESSION_TOKEN;
    delete (window as any).Clerk;
    
    // Reset axios defaults safely
    if (apiClient?.defaults?.headers?.common) {
      delete apiClient.defaults.headers.common['Authorization'];
      delete apiClient.defaults.headers.common['X-Token-Type'];
    }
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Token Storage and Retrieval', () => {
    it('should store and retrieve JWT tokens correctly', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      setAuthToken(jwtToken);
      
      expect(getAuthToken()).toBe(jwtToken);
      expect(localStorage.getItem('token')).toBe(jwtToken);
      
      // Check axios defaults if apiClient is available
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBe(`Bearer ${jwtToken}`);
        expect(apiClient.defaults.headers.common['X-Token-Type']).toBe('jwt');
      }
    });

    it('should store and retrieve development tokens correctly', () => {
      const devToken = 'dev:client@bahinlink.com';
      
      setAuthToken(devToken);
      
      expect(getAuthToken()).toBe(devToken);
      expect(localStorage.getItem('token')).toBe(devToken);
      
      // Check axios defaults if apiClient is available
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBe(`Bearer ${devToken}`);
        expect(apiClient.defaults.headers.common['X-Token-Type']).toBe('development');
      }
    });

    it('should store and retrieve email tokens correctly', () => {
      const emailToken = 'client@bahinlink.com';
      
      setAuthToken(emailToken);
      
      expect(getAuthToken()).toBe(emailToken);
      expect(localStorage.getItem('token')).toBe(emailToken);
      
      // Check axios defaults if apiClient is available
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBe(`Bearer ${emailToken}`);
        expect(apiClient.defaults.headers.common['X-Token-Type']).toBe('email');
      }
    });

    it('should clear tokens correctly', () => {
      const token = 'test-token';
      setAuthToken(token);
      
      // Verify token is set
      expect(getAuthToken()).toBe(token);
      
      // Clear token
      setAuthToken(null);
      
      expect(getAuthToken()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      
      // Check axios defaults if apiClient is available
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
        expect(apiClient.defaults.headers.common['X-Token-Type']).toBeUndefined();
      }
    });
  });

  describe('Token Type Detection', () => {
    it('should detect JWT tokens correctly', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const config = await createAuthenticatedRequest(jwtToken);
      
      expect(config.headers['X-Token-Type']).toBe('jwt');
    });

    it('should detect development tokens correctly', async () => {
      const devToken = 'dev:client@bahinlink.com';
      
      const config = await createAuthenticatedRequest(devToken);
      
      expect(config.headers['X-Token-Type']).toBe('development');
    });

    it('should detect email tokens correctly', async () => {
      const emailToken = 'client@bahinlink.com';
      
      const config = await createAuthenticatedRequest(emailToken);
      
      expect(config.headers['X-Token-Type']).toBe('email');
    });

    it('should default to JWT for unknown token formats', async () => {
      const unknownToken = 'unknown-token-format';
      
      const config = await createAuthenticatedRequest(unknownToken);
      
      expect(config.headers['X-Token-Type']).toBe('jwt');
    });
  });

  describe('Authentication State Management', () => {
    it('should clear authentication state completely', () => {
      // Set up authentication state
      const token = 'test-token';
      setAuthToken(token);
      
      // Verify state is set
      expect(getAuthToken()).toBe(token);
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
      }
      
      // Clear authentication state
      clearAuthenticationState();
      
      // Verify state is cleared
      expect(getAuthToken()).toBeNull();
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
        expect(apiClient.defaults.headers.common['X-Token-Type']).toBeUndefined();
      }
    });

    it('should handle clearing state when no token exists', () => {
      // Ensure no token exists
      expect(getAuthToken()).toBeNull();
      
      // Should not throw error
      expect(() => clearAuthenticationState()).not.toThrow();
    });
  });

  describe('Token Provider Integration', () => {
    it('should get current token info when token is available', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      setAuthToken(jwtToken);
      
      const tokenInfo = await getCurrentTokenInfo();
      
      expect(tokenInfo.token).toBe(jwtToken);
      expect(tokenInfo.type).toBe('jwt');
      expect(tokenInfo.isValid).toBe(true);
    });

    it('should return default info when no token is available', async () => {
      // Ensure no token is set
      expect(getAuthToken()).toBeNull();
      
      const tokenInfo = await getCurrentTokenInfo();
      
      expect(tokenInfo.token).toBe('');
      expect(tokenInfo.type).toBe('development');
      expect(tokenInfo.isValid).toBe(false);
    });

    it('should check authentication availability correctly', async () => {
      // No token available
      expect(await isAuthenticationAvailable()).toBe(false);
      
      // Set token
      setAuthToken('test-token');
      expect(await isAuthenticationAvailable()).toBe(true);
      
      // Clear token
      setAuthToken(null);
      expect(await isAuthenticationAvailable()).toBe(false);
    });

    it('should handle token refresh attempts', async () => {
      const token = 'test-token';
      setAuthToken(token);
      
      const refreshResult = await refreshAuthToken();
      
      // Should return true if token is valid
      expect(refreshResult).toBe(true);
    });

    it('should handle refresh when no token is available', async () => {
      // Ensure no token is set
      expect(getAuthToken()).toBeNull();
      
      const refreshResult = await refreshAuthToken();
      
      // Should return false when no valid token
      expect(refreshResult).toBe(false);
    });
  });

  describe('Development Mode Behavior', () => {
    it('should handle development mode token generation', async () => {
      // Import the token provider directly to test development mode
      const { createTokenProvider } = await import('../tokenProvider');
      
      // Create a token provider with development mode explicitly enabled
      const devTokenProvider = createTokenProvider(null, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });
      
      const tokenInfo = await devTokenProvider.getTokenInfo();
      
      // In development mode, should provide a development token
      expect(tokenInfo.type).toBe('development');
      expect(tokenInfo.token).toContain('dev:');
      expect(tokenInfo.isValid).toBe(true);
    });

    it('should use fallback email in development mode', async () => {
      // Import the token provider directly to test development mode
      const { createTokenProvider } = await import('../tokenProvider');
      
      // Create a token provider with development mode explicitly enabled
      const devTokenProvider = createTokenProvider(null, {
        developmentMode: true,
        fallbackEmail: 'client@bahinlink.com'
      });
      
      const tokenInfo = await devTokenProvider.getTokenInfo();
      
      expect(tokenInfo.token).toBe('dev:client@bahinlink.com');
      expect(tokenInfo.type).toBe('development');
      expect(tokenInfo.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle token provider errors gracefully', async () => {
      // This test verifies that the token provider handles errors without crashing
      const tokenInfo = await getCurrentTokenInfo();
      
      // Should return default values instead of throwing
      expect(tokenInfo).toHaveProperty('token');
      expect(tokenInfo).toHaveProperty('type');
      expect(tokenInfo).toHaveProperty('isValid');
    });

    it('should handle authentication availability check errors', async () => {
      // Should not throw even if there are internal errors
      const isAvailable = await isAuthenticationAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle token refresh errors gracefully', async () => {
      // Should not throw even if refresh fails
      const refreshResult = await refreshAuthToken();
      expect(typeof refreshResult).toBe('boolean');
    });
  });

  describe('Request Configuration', () => {
    it('should create proper request configuration for different token types', async () => {
      const testCases = [
        {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          expectedType: 'jwt'
        },
        {
          token: 'dev:client@bahinlink.com',
          expectedType: 'development'
        },
        {
          token: 'client@bahinlink.com',
          expectedType: 'email'
        }
      ];

      for (const testCase of testCases) {
        const config = await createAuthenticatedRequest(testCase.token);
        
        expect(config.headers['Authorization']).toBe(`Bearer ${testCase.token}`);
        expect(config.headers['X-Token-Type']).toBe(testCase.expectedType);
      }
    });

    it('should handle empty or invalid tokens', async () => {
      const config = await createAuthenticatedRequest('');
      
      expect(config.headers['Authorization']).toBe('Bearer ');
      expect(config.headers['X-Token-Type']).toBe('jwt'); // Default fallback
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing localStorage token system', () => {
      const token = 'legacy-token';
      
      // Set token using old method
      localStorage.setItem('token', token);
      
      // Should be retrievable using new method
      expect(getAuthToken()).toBe(token);
    });

    it('should maintain compatibility with existing axios defaults', () => {
      const token = 'test-token';
      
      setAuthToken(token);
      
      // Should set axios defaults for backward compatibility if apiClient is available
      if (apiClient?.defaults?.headers?.common) {
        expect(apiClient.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
      }
    });
  });

  describe('Token Expiration Handling', () => {
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
      
      setAuthToken(jwtToken);
      
      const tokenInfo = await getCurrentTokenInfo();
      
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
      
      setAuthToken(jwtToken);
      
      const tokenInfo = await getCurrentTokenInfo();
      
      expect(tokenInfo.expiresAt).toBeUndefined();
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      const malformedToken = 'eyJ.malformed.token';
      
      setAuthToken(malformedToken);
      
      const tokenInfo = await getCurrentTokenInfo();
      
      // Should not throw error and should still return token info
      expect(tokenInfo.token).toBe(malformedToken);
      expect(tokenInfo.type).toBe('jwt');
      expect(tokenInfo.expiresAt).toBeUndefined();
    });
  });
});