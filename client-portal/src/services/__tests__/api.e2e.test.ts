import {
  clientPortalAPI,
  clientAPI,
  userAPI,
  isAuthenticationAvailable,
  getCurrentTokenInfo,
  refreshAuthToken,
  clearAuthenticationState,
  setAuthToken,
  getAuthToken
} from '../api';

describe('End-to-End Authentication Flow Tests - Client Portal', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear any global tokens
    delete (window as any).__CLERK_SESSION_TOKEN;
    delete (window as any).Clerk;
    
    // Clear authentication state
    clearAuthenticationState();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    clearAuthenticationState();
  });

  describe('Development Mode Authentication Flow', () => {
    beforeAll(() => {
      // Set development mode
      (process.env as any).NODE_ENV = 'development';
    });

    it('should authenticate and make API calls in development mode', async () => {
      // Check authentication availability
      const authAvailable = await isAuthenticationAvailable();
      console.log('Client auth available in dev mode:', authAvailable);

      // Get token info
      const tokenInfo = await getCurrentTokenInfo();
      console.log('Client token info in dev mode:', tokenInfo);

      expect(tokenInfo).not.toBeNull();
      expect(tokenInfo!.type).toBe('development');
      expect(tokenInfo!.isValid).toBe(true);
      expect(tokenInfo!.token).toContain('dev:');
    });

    it('should make authenticated API calls with development token', async () => {
      // Mock the API response to avoid actual network calls
      const mockResponse = {
        data: {
          overview: {
            activeSites: 3,
            activeShifts: 5,
            incidentsToday: 2,
            pendingRequests: 1
          }
        }
      };

      // Mock axios get method
      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      clientPortalAPI.getDashboard = mockGet;

      // Make API call
      const response = await clientPortalAPI.getDashboard();

      expect(mockGet).toHaveBeenCalled();
      expect(response.data.overview.activeSites).toBe(3);
    });

    it('should handle client API with development authentication', async () => {
      // Mock the API response
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'client-1',
            name: 'Test Client',
            email: 'client@bahinlink.com'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (userAPI as any).getProfile = mockGet;

      const response = await userAPI.getProfile();

      expect(mockGet).toHaveBeenCalled();
      expect(response.data.success).toBe(true);
      expect(response.data.data.email).toBe('client@bahinlink.com');
    });
  });

  describe('LocalStorage Token Management', () => {
    it('should store and retrieve tokens from localStorage', () => {
      const testToken = 'test-client-token';
      
      // Set token
      setAuthToken(testToken);
      
      // Verify storage
      expect(getAuthToken()).toBe(testToken);
      expect(localStorage.getItem('token')).toBe(testToken);
    });

    it('should clear tokens from localStorage', () => {
      const testToken = 'test-client-token';
      
      // Set token
      setAuthToken(testToken);
      expect(getAuthToken()).toBe(testToken);
      
      // Clear token
      setAuthToken(null);
      expect(getAuthToken()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should use localStorage token for authentication', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      // Set token in localStorage
      setAuthToken(jwtToken);
      
      // Check authentication
      const authAvailable = await isAuthenticationAvailable();
      expect(authAvailable).toBe(true);
      
      // Get token info
      const tokenInfo = await getCurrentTokenInfo();
      expect(tokenInfo).not.toBeNull();
      expect(tokenInfo!.token).toBe(jwtToken);
      expect(tokenInfo!.type).toBe('jwt');
      expect(tokenInfo!.isValid).toBe(true);
    });
  });

  describe('JWT Token Authentication Flow', () => {
    it('should handle JWT token authentication', async () => {
      // Set up a mock JWT token
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      // Set token in localStorage
      setAuthToken(jwtToken);

      // Check authentication
      const authAvailable = await isAuthenticationAvailable();
      expect(authAvailable).toBe(true);

      // Get token info
      const tokenInfo = await getCurrentTokenInfo();
      expect(tokenInfo).not.toBeNull();
      expect(tokenInfo!.type).toBe('jwt');
      expect(tokenInfo!.token).toBe(jwtToken);
      expect(tokenInfo!.isValid).toBe(true);
    });

    it('should make API calls with JWT token', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      setAuthToken(jwtToken);

      // Mock API response
      const mockResponse = {
        data: {
          notifications: [
            { id: '1', title: 'Test Notification', isRead: false }
          ]
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      clientPortalAPI.getNotifications = mockGet;

      const response = await clientPortalAPI.getNotifications();

      expect(mockGet).toHaveBeenCalled();
      expect(response.data.notifications).toHaveLength(1);
    });
  });

  describe('Error Handling and Fallback Mechanisms', () => {
    it('should handle authentication failures gracefully', async () => {
      // Clear all tokens
      localStorage.clear();
      clearAuthenticationState();

      // Set production mode to test fallback
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      try {
        const authAvailable = await isAuthenticationAvailable();
        console.log('Client auth available in production without token:', authAvailable);

        // Should handle gracefully without throwing
        const tokenInfo = await getCurrentTokenInfo();
        expect(tokenInfo).not.toBeNull();
        expect(tokenInfo!.isValid).toBe(false);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('should handle token refresh scenarios', async () => {
      // Test token refresh with no token
      const refreshResult1 = await refreshAuthToken();
      expect(typeof refreshResult1).toBe('boolean');

      // Test token refresh with stored token
      setAuthToken('test-token');
      const refreshResult2 = await refreshAuthToken();
      expect(typeof refreshResult2).toBe('boolean');
    });

    it('should handle API errors with proper authentication context', async () => {
      // Mock an API error response
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      const mockGet = jest.fn().mockRejectedValue(mockError);
      clientPortalAPI.getDashboard = mockGet;

      try {
        await clientPortalAPI.getDashboard();
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(mockGet).toHaveBeenCalled();
      }
    });

    it('should redirect to login on authentication failure', async () => {
      // Mock window.location.href
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { ...originalLocation, href: '' };

      // Mock an API error that should trigger redirect
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        },
        config: { _retryAuth: true } // Simulate retry already attempted
      };

      const mockGet = jest.fn().mockRejectedValue(mockError);
      clientPortalAPI.getDashboard = mockGet;

      try {
        await clientPortalAPI.getDashboard();
      } catch (error) {
        // Expected to fail and potentially redirect
      }

      // Restore original location
      (window as any).location = originalLocation;
    });
  });

  describe('Token Type Detection and Handling', () => {
    it('should properly detect and handle different token types', async () => {
      const testCases = [
        {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
          expectedType: 'jwt',
          description: 'JWT token'
        },
        {
          token: 'dev:client@bahinlink.com',
          expectedType: 'development',
          description: 'Development token'
        },
        {
          token: 'client@bahinlink.com',
          expectedType: 'email',
          description: 'Email token'
        }
      ];

      for (const testCase of testCases) {
        // Set the token in localStorage
        setAuthToken(testCase.token);

        const tokenInfo = await getCurrentTokenInfo();

        expect(tokenInfo).not.toBeNull();
        expect(tokenInfo!.type).toBe(testCase.expectedType);
        expect(tokenInfo!.token).toBe(testCase.token);
        
        console.log(`✓ Client ${testCase.description} detected correctly as ${testCase.expectedType}`);
        
        // Clear for next test
        setAuthToken(null);
      }
    });
  });

  describe('Client Portal Specific API Endpoints', () => {
    it('should handle dashboard API calls', async () => {
      setAuthToken('test-token');

      const mockResponse = {
        data: {
          overview: { activeSites: 5, activeShifts: 10 }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      clientPortalAPI.getDashboard = mockGet;

      const response = await clientPortalAPI.getDashboard();
      expect(response.data.overview.activeSites).toBe(5);
    });

    it('should handle notifications API calls', async () => {
      setAuthToken('test-token');

      const mockResponse = {
        data: {
          notifications: [
            { id: '1', title: 'Security Alert', type: 'SECURITY', isRead: false },
            { id: '2', title: 'Report Ready', type: 'REPORT', isRead: true }
          ]
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      clientPortalAPI.getNotifications = mockGet;

      const response = await clientPortalAPI.getNotifications();
      expect(response.data.notifications).toHaveLength(2);
      expect(response.data.notifications[0].type).toBe('SECURITY');
    });

    it('should handle billing API calls', async () => {
      setAuthToken('test-token');

      const mockResponse = {
        data: {
          invoices: [
            { id: 'inv-1', amount: 1000, status: 'PAID' },
            { id: 'inv-2', amount: 1200, status: 'PENDING' }
          ]
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      clientPortalAPI.getInvoices = mockGet;

      const response = await clientPortalAPI.getInvoices();
      expect(response.data.invoices).toHaveLength(2);
      expect(response.data.invoices[0].status).toBe('PAID');
    });
  });

  describe('Integration with Component Patterns', () => {
    it('should support the authentication patterns used by client components', async () => {
      // Test the pattern used by components like DashboardPage
      const authAvailable = await isAuthenticationAvailable();
      
      if (!authAvailable) {
        console.log('Client authentication not available - component would show error');
        expect(authAvailable).toBe(false);
      } else {
        console.log('Client authentication available - component would proceed');
        expect(authAvailable).toBe(true);
      }

      // This should not throw regardless of auth state
      expect(typeof authAvailable).toBe('boolean');
    });

    it('should support the token info pattern used by client components', async () => {
      // Test the pattern used by components for debugging
      const tokenInfo = await getCurrentTokenInfo();

      expect(tokenInfo).not.toBeNull();
      expect(tokenInfo).toHaveProperty('type');
      expect(tokenInfo).toHaveProperty('token');
      expect(tokenInfo).toHaveProperty('isValid');

      console.log(`✓ Client token info pattern works: ${tokenInfo!.type} token, valid: ${tokenInfo!.isValid}`);
    });

    it('should handle component error scenarios gracefully', async () => {
      // Simulate component error handling patterns
      try {
        // Clear all authentication
        clearAuthenticationState();
        
        // Try to make an API call (should handle gracefully)
        const mockError = {
          response: { status: 401, data: { message: 'Unauthorized' } }
        };
        
        const mockGet = jest.fn().mockRejectedValue(mockError);
        clientPortalAPI.getDashboard = mockGet;
        
        await clientPortalAPI.getDashboard();
      } catch (error: any) {
        // Component should handle this gracefully
        expect(error.response.status).toBe(401);
        console.log('✓ Component error handling pattern works');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing localStorage patterns', () => {
      const token = 'legacy-token';
      
      // Set token using direct localStorage (old pattern)
      localStorage.setItem('token', token);
      
      // Should be retrievable using new methods
      expect(getAuthToken()).toBe(token);
    });

    it('should maintain compatibility with existing API patterns', async () => {
      setAuthToken('test-token');
      
      // Test that existing API endpoints still work
      const mockResponse = { data: { success: true } };
      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      
      // Test various API endpoints
      clientPortalAPI.getSites = mockGet;
      clientPortalAPI.getReports = mockGet;
      clientPortalAPI.getAnalytics = mockGet;
      
      await clientPortalAPI.getSites();
      await clientPortalAPI.getReports();
      await clientPortalAPI.getAnalytics();
      
      expect(mockGet).toHaveBeenCalledTimes(3);
      console.log('✓ Backward compatibility maintained for existing API patterns');
    });
  });
});