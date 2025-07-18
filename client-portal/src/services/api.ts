import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createTokenProvider } from './tokenProvider';
import { getEnvironmentConfig } from '../config/environment';

// API Configuration - Use centralized environment config
const getApiBaseUrl = () => {
  const config = getEnvironmentConfig();
  return config.portals.api;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize token provider
let tokenProvider: any = null;

const initializeTokenProvider = () => {
  if (!tokenProvider) {
    // Try to get Clerk auth if available
    const clerkAuth = (window as any).Clerk?.session;
    tokenProvider = createTokenProvider(clerkAuth, {
      developmentMode: process.env.NODE_ENV === 'development',
      fallbackEmail: 'client@bahinlink.com'
    });
  }
  return tokenProvider;
};

// Request interceptor to add auth token using token provider
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const provider = initializeTokenProvider();
      const token = await provider.getAuthToken();
      const tokenType = await provider.getTokenType();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Token-Type'] = tokenType;
        console.debug(`API request with ${tokenType} token`);
      }
    } catch (error) {
      console.debug('Failed to get authentication token:', error);

      // Fallback to localStorage token
      const fallbackToken = localStorage.getItem('token');
      if (fallbackToken) {
        config.headers.Authorization = `Bearer ${fallbackToken}`;
        config.headers['X-Token-Type'] = 'stored';
        console.debug('Using fallback localStorage token');
      } else if (process.env.NODE_ENV === 'development') {
        // Development fallback
        const devToken = 'dev:client@bahinlink.com';
        config.headers.Authorization = `Bearer ${devToken}`;
        config.headers['X-Token-Type'] = 'development';
        console.debug('Using development fallback token');
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Client Portal specific API endpoints
export const clientPortalAPI = {
  // Dashboard
  getDashboard: () => apiClient.get('/client-portal/dashboard'),
  
  // Agent tracking and monitoring
  getAgentTracking: (siteId?: string) => 
    apiClient.get('/client-portal/tracking', { params: { siteId } }),
  
  getSiteStatuses: () => apiClient.get('/client-portal/sites/status'),
  
  // Reports
  getReports: (params?: any) => 
    apiClient.get('/client-portal/reports', { params }),
  
  getReport: (reportId: string) => 
    apiClient.get(`/client-portal/reports/${reportId}`),

  // Added missing downloadReport method
  downloadReport: (reportId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf') =>
    apiClient.get(`/client-portal/reports/${reportId}/download`, {
      params: { format },
      responseType: 'blob',
    }),
  
  // Service requests
  getServiceRequests: (params?: any) =>
    apiClient.get('/client-portal/requests', { params }),

  getServiceRequestsStats: () =>
    apiClient.get('/client-portal/requests/stats'),

  createServiceRequest: (data: any) =>
    apiClient.post('/client-portal/requests', data),

  getServiceRequest: (requestId: string) =>
    apiClient.get(`/client-portal/requests/${requestId}`),

  updateServiceRequest: (requestId: string, data: any) =>
    apiClient.put(`/client-portal/requests/${requestId}`, data),
  
  // Sites
  getSites: () => apiClient.get('/client-portal/sites'),
  
  getSite: (siteId: string) => 
    apiClient.get(`/client-portal/sites/${siteId}`),
  
  // Analytics
  getAnalytics: (params?: any) => 
    apiClient.get('/client-portal/analytics', { params }),
  
  getPerformanceMetrics: (params?: any) => 
    apiClient.get('/client-portal/analytics/performance', { params }),
  
  getIncidentTrends: (params?: any) => 
    apiClient.get('/client-portal/analytics/incidents', { params }),
  
  // Communication
  getMessages: (params?: any) => 
    apiClient.get('/client-portal/messages', { params }),
  
  sendMessage: (data: any) => 
    apiClient.post('/client-portal/messages', data),
  
  getConversation: (conversationId: string) => 
    apiClient.get(`/client-portal/messages/conversations/${conversationId}`),
  
  // Notifications
  getNotifications: (params?: any) => 
    apiClient.get('/client-portal/notifications', { params }),
  
  markNotificationRead: (notificationId: string) => 
    apiClient.put(`/client-portal/notifications/${notificationId}/read`),
  
  markAllNotificationsRead: () => 
    apiClient.put('/client-portal/notifications/mark-all-read'),
  
  // Billing
  getBilling: (params?: any) =>
    apiClient.get('/client-portal/billing', { params }),

  getBillingStats: () =>
    apiClient.get('/client-portal/billing/stats'),

  getInvoices: (params?: any) =>
    apiClient.get('/client-portal/billing/invoices', { params }),

  getInvoice: (invoiceId: string) =>
    apiClient.get(`/client-portal/billing/invoices/${invoiceId}`),

  downloadInvoice: (invoiceId: string) =>
    apiClient.get(`/client-portal/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    }),

  getPayments: (params?: any) =>
    apiClient.get('/client-portal/billing/payments', { params }),

  // Payment Methods
  getPaymentMethods: () => 
    apiClient.get('/client-portal/billing/payment-methods'),

  createPaymentMethod: (data: any) => 
    apiClient.post('/client-portal/billing/payment-methods', data),

  updatePaymentMethod: (methodId: string, data: any) => 
    apiClient.put(`/client-portal/billing/payment-methods/${methodId}`, data),

  deletePaymentMethod: (methodId: string) => 
    apiClient.delete(`/client-portal/billing/payment-methods/${methodId}`),

  setDefaultPaymentMethod: (methodId: string) => 
    apiClient.put(`/client-portal/billing/payment-methods/${methodId}/default`),

  // Subscription
  getSubscription: () => 
    apiClient.get('/client-portal/billing/subscription'),

  updateSubscription: (data: any) => 
    apiClient.put('/client-portal/billing/subscription', data),

  // Billing Settings
  getBillingSettings: () => 
    apiClient.get('/client-portal/billing/settings'),

  updateBillingSettings: (data: any) => 
    apiClient.put('/client-portal/billing/settings', data),
  
  // Settings
  getSettings: () => apiClient.get('/client-portal/settings'),
  
  updateSettings: (data: any) => 
    apiClient.put('/client-portal/settings', data),
  
  // Emergency contacts
  getEmergencyContacts: () => 
    apiClient.get('/client-portal/emergency-contacts'),
  
  updateEmergencyContacts: (data: any) => 
    apiClient.put('/client-portal/emergency-contacts', data),
  
  // Incident reporting
  reportIncident: (data: any) => 
    apiClient.post('/client-portal/incidents', data),
  
  getIncidents: (params?: any) => 
    apiClient.get('/client-portal/incidents', { params }),
  
  getIncident: (incidentId: string) => 
    apiClient.get(`/client-portal/incidents/${incidentId}`),
  
  // Schedule requests
  requestScheduleChange: (data: any) => 
    apiClient.post('/client-portal/schedule-requests', data),
  
  getScheduleRequests: (params?: any) => 
    apiClient.get('/client-portal/schedule-requests', { params }),
  
  // Feedback
  submitFeedback: (data: any) =>
    apiClient.post('/client-portal/feedback', data),

  getFeedback: (params?: any) =>
    apiClient.get('/client-portal/feedback', { params }),

  // Summary and analytics
  getSummaryData: (params?: any) =>
    apiClient.get('/client-portal/analytics/summary', { params }),

  exportSummaryReport: (params?: any) =>
    apiClient.get('/client-portal/analytics/summary/export', {
      params,
      responseType: 'blob'
    }),
};

// Reports API
export const reportsAPI = {
  getAll: (params?: any) => apiClient.get('/reports', { params }),
  getById: (id: string) => apiClient.get(`/reports/${id}`),
  create: (data: any) => apiClient.post('/reports', data),
  update: (id: string, data: any) => apiClient.put(`/reports/${id}`, data),
  delete: (id: string) => apiClient.delete(`/reports/${id}`),
  submit: (id: string) => apiClient.post(`/reports/${id}/submit`),
  approve: (id: string, data?: any) => apiClient.post(`/reports/${id}/approve`, data),
  reject: (id: string, data?: any) => apiClient.post(`/reports/${id}/reject`, data),
  submitClientSignature: (id: string, data: any) => 
    apiClient.post(`/reports/${id}/client-signature`, data),
  getDeliveryStatus: (id: string) => 
    apiClient.get(`/reports/${id}/delivery-status`),
  scheduleDelivery: (id: string, data?: any) => 
    apiClient.post(`/reports/${id}/delivery`, data),
};

// Authentication API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  logout: () => apiClient.post('/auth/logout'),
  
  refreshToken: () => apiClient.post('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/change-password', data),
  
  verifyToken: () => apiClient.get('/auth/verify'),
};

// User API
export const userAPI = {
  getProfile: () => apiClient.get('/users/profile'),
  
  updateProfile: (data: any) => apiClient.put('/users/profile', data),
  
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Utility functions
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = async () => {
  try {
    const provider = initializeTokenProvider();
    return await provider.hasValidToken();
  } catch (error) {
    console.debug('Authentication check failed:', error);
    return !!getAuthToken(); // Fallback to localStorage
  }
};

// Additional utility functions for compatibility
export const isAuthenticationAvailable = async () => {
  try {
    const provider = initializeTokenProvider();
    return await provider.hasValidToken();
  } catch (error) {
    console.debug('Authentication availability check failed:', error);
    return !!getAuthToken(); // Fallback to localStorage
  }
};

export const getCurrentTokenInfo = async () => {
  try {
    const provider = initializeTokenProvider();
    const tokenInfo = await provider.getTokenInfo();
    return {
      token: tokenInfo.token,
      type: tokenInfo.type,
      isValid: tokenInfo.isValid
    };
  } catch (error) {
    console.debug('Failed to get token info:', error);
    const fallbackToken = getAuthToken();
    return fallbackToken ? { token: fallbackToken, type: 'stored', isValid: true } : null;
  }
};

// Force token refresh
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const provider = initializeTokenProvider();
    const tokenInfo = await provider.getTokenInfo();

    if (tokenInfo.isValid) {
      console.debug(`Token refreshed successfully: ${tokenInfo.type}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to refresh auth token:', error);
    return false;
  }
};

// Clear authentication state
export const clearAuthenticationState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  delete apiClient.defaults.headers.common['Authorization'];
  delete apiClient.defaults.headers.common['X-Token-Type'];
  console.debug('Authentication state cleared');
};

// Create authenticated request helper
export const createAuthenticatedRequest = async (config: AxiosRequestConfig) => {
  try {
    const provider = initializeTokenProvider();
    const token = await provider.getAuthToken();
    const tokenType = await provider.getTokenType();

    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
        'X-Token-Type': tokenType
      }
    };
  } catch (error) {
    console.error('Failed to create authenticated request:', error);
    return config;
  }
};

// Reset token provider (for testing)
export const resetTokenProvider = () => {
  tokenProvider = null;
};

// Alias for clientPortalAPI for backward compatibility
export const clientAPI = clientPortalAPI;

// Initialize auth token on app start
const token = getAuthToken();
if (token) {
  setAuthToken(token);
}

export default apiClient;
