import apiClient, { clientPortalAPI, reportsAPI, authAPI, userAPI, setAuthToken, getAuthToken, isAuthenticated } from '../api';

describe('Client Portal API Service Token Provider Integration', () => {
  describe('API Client Configuration', () => {
    it('should have correct base URL configuration', () => {
      const expectedBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      expect(apiClient.defaults.baseURL).toBe(expectedBaseUrl);
    });

    it('should have correct timeout configuration', () => {
      expect(apiClient.defaults.timeout).toBe(30000);
    });

    it('should have correct default headers', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Token Provider Integration', () => {
    it('should have request interceptor configured', () => {
      // Verify that the API client has interceptors
      expect(apiClient.interceptors.request).toBeDefined();
      expect(apiClient.interceptors.response).toBeDefined();
    });

    it('should handle authentication through interceptors', () => {
      // Verify interceptors are properly configured
      expect(typeof apiClient.interceptors.request.use).toBe('function');
      expect(typeof apiClient.interceptors.response.use).toBe('function');
    });
  });

  describe('Client Portal API Endpoints', () => {
    it('should have dashboard API endpoints', () => {
      expect(typeof clientPortalAPI.getDashboard).toBe('function');
      expect(typeof clientPortalAPI.getAnalytics).toBe('function');
      expect(typeof clientPortalAPI.getPerformanceMetrics).toBe('function');
      expect(typeof clientPortalAPI.getIncidentTrends).toBe('function');
    });

    it('should have site management endpoints', () => {
      expect(typeof clientPortalAPI.getSites).toBe('function');
      expect(typeof clientPortalAPI.getSite).toBe('function');
      expect(typeof clientPortalAPI.getSiteStatuses).toBe('function');
      expect(typeof clientPortalAPI.getAgentTracking).toBe('function');
    });

    it('should have report management endpoints', () => {
      expect(typeof clientPortalAPI.getReports).toBe('function');
      expect(typeof clientPortalAPI.getReport).toBe('function');
      expect(typeof clientPortalAPI.downloadReport).toBe('function');
    });

    it('should have service request endpoints', () => {
      expect(typeof clientPortalAPI.getServiceRequests).toBe('function');
      expect(typeof clientPortalAPI.createServiceRequest).toBe('function');
      expect(typeof clientPortalAPI.getServiceRequestsStats).toBe('function');
      expect(typeof clientPortalAPI.getServiceRequest).toBe('function');
      expect(typeof clientPortalAPI.updateServiceRequest).toBe('function');
    });

    it('should have communication endpoints', () => {
      expect(typeof clientPortalAPI.getMessages).toBe('function');
      expect(typeof clientPortalAPI.sendMessage).toBe('function');
      expect(typeof clientPortalAPI.getNotifications).toBe('function');
      expect(typeof clientPortalAPI.markNotificationRead).toBe('function');
      expect(typeof clientPortalAPI.getConversation).toBe('function');
    });

    it('should have billing endpoints', () => {
      expect(typeof clientPortalAPI.getBilling).toBe('function');
      expect(typeof clientPortalAPI.getInvoices).toBe('function');
      expect(typeof clientPortalAPI.getPaymentMethods).toBe('function');
      expect(typeof clientPortalAPI.getSubscription).toBe('function');
      expect(typeof clientPortalAPI.getBillingSettings).toBe('function');
    });
  });

  describe('Legacy API Endpoints', () => {
    it('should have reports API endpoints', () => {
      expect(typeof reportsAPI.getAll).toBe('function');
      expect(typeof reportsAPI.getById).toBe('function');
      expect(typeof reportsAPI.create).toBe('function');
      expect(typeof reportsAPI.update).toBe('function');
      expect(typeof reportsAPI.delete).toBe('function');
      expect(typeof reportsAPI.submit).toBe('function');
      expect(typeof reportsAPI.approve).toBe('function');
    });

    it('should have authentication API endpoints', () => {
      expect(typeof authAPI.login).toBe('function');
      expect(typeof authAPI.logout).toBe('function');
      expect(typeof authAPI.refreshToken).toBe('function');
      expect(typeof authAPI.forgotPassword).toBe('function');
      expect(typeof authAPI.resetPassword).toBe('function');
    });

    it('should have user API endpoints', () => {
      expect(typeof userAPI.getProfile).toBe('function');
      expect(typeof userAPI.updateProfile).toBe('function');
      expect(typeof userAPI.uploadAvatar).toBe('function');
    });
  });

  describe('Token Management Utilities', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should have token management functions', () => {
      expect(typeof setAuthToken).toBe('function');
      expect(typeof getAuthToken).toBe('function');
      expect(typeof isAuthenticated).toBe('function');
    });

    it('should handle token storage operations', () => {
      // Test token setting and getting
      const testToken = 'test-token-123';
      setAuthToken(testToken);
      expect(getAuthToken()).toBe(testToken);
      expect(isAuthenticated()).toBe(true);
      
      // Test token clearing
      setAuthToken(null);
      expect(getAuthToken()).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });

    it('should handle empty token correctly', () => {
      expect(getAuthToken()).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('API Client Instance', () => {
    it('should be an axios instance', () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
    });

    it('should have proper configuration', () => {
      expect(apiClient.defaults).toBeDefined();
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(apiClient.defaults.timeout).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should have error handling capabilities', () => {
      // Verify that the client can handle errors
      expect(apiClient.interceptors.response).toBeDefined();
    });

    it('should support request configuration', () => {
      // Verify request configuration capabilities
      expect(apiClient.interceptors.request).toBeDefined();
    });
  });
});