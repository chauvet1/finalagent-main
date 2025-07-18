import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createTokenProvider, detectTokenType } from './tokenProvider';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a global token provider instance
let globalTokenProvider: any = null;

// Initialize token provider
const initializeTokenProvider = () => {
  if (!globalTokenProvider) {
    // Try to get Clerk auth if available
    let clerkAuth = null;
    try {
      // Check if Clerk is available in the global scope
      if ((window as any).Clerk) {
        clerkAuth = (window as any).Clerk;
      }
    } catch (error) {
      console.debug('Clerk not available, using fallback authentication');
    }
    
    globalTokenProvider = createTokenProvider(clerkAuth, {
      developmentMode: process.env.NODE_ENV === 'development',
      fallbackEmail: 'admin@bahinlink.com'
    });
  }
  return globalTokenProvider;
};

// Request interceptor to add auth token using token provider
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Check if token is already set in headers
      if (!config.headers['Authorization']) {
        const tokenProvider = initializeTokenProvider();
        const tokenInfo = await tokenProvider.getTokenInfo();
        
        if (tokenInfo.isValid && tokenInfo.token) {
          config.headers['Authorization'] = `Bearer ${tokenInfo.token}`;
          
          // Add token type to headers for backend processing
          config.headers['X-Token-Type'] = tokenInfo.type;
          
          console.debug(`Using ${tokenInfo.type} token for API request to ${config.url}`);
          
          // Log token expiration warning for JWT tokens
          if (tokenInfo.type === 'jwt' && tokenInfo.expiresAt) {
            const timeUntilExpiry = tokenInfo.expiresAt.getTime() - Date.now();
            if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
              console.warn(`JWT token expires in ${Math.round(timeUntilExpiry / 1000)} seconds`);
            }
          }
        } else {
          console.warn('No valid authentication token available for API request');
          
          // Attempt fallback to global Clerk session token
          const globalToken = (window as any).__CLERK_SESSION_TOKEN;
          if (globalToken) {
            config.headers['Authorization'] = `Bearer ${globalToken}`;
            config.headers['X-Token-Type'] = 'jwt';
            console.debug('Using fallback global Clerk token');
          }
        }
      } else {
        // Token already set, detect its type for header
        const existingToken = config.headers['Authorization']?.toString().replace('Bearer ', '') || '';
        if (existingToken) {
          const tokenType = detectTokenType(existingToken);
          config.headers['X-Token-Type'] = tokenType;
          console.debug(`Using existing ${tokenType} token for API request`);
        }
      }
    } catch (error) {
      console.debug('Failed to get authentication token:', error);
      
      // Enhanced fallback logic
      const globalToken = (window as any).__CLERK_SESSION_TOKEN;
      if (globalToken) {
        config.headers['Authorization'] = `Bearer ${globalToken}`;
        config.headers['X-Token-Type'] = 'jwt';
        console.debug('Using fallback global Clerk token due to error');
      } else if (process.env.NODE_ENV === 'development') {
        // Development fallback
        const devToken = 'dev:admin@bahinlink.com';
        config.headers['Authorization'] = `Bearer ${devToken}`;
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

// Response interceptor for enhanced error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful authentication method for audit purposes
    const tokenType = response.config.headers?.['X-Token-Type'];
    if (tokenType && response.status === 200) {
      console.debug(`Successful API request with ${tokenType} token to ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401) {
      // Unauthorized - enhanced token handling
      console.warn(`Authentication failed for ${originalRequest.url}:`, {
        tokenType: originalRequest.headers?.['X-Token-Type'],
        error: error.response?.data?.message || 'Unauthorized'
      });
      
      // Prevent infinite retry loops
      if (originalRequest._retryAuth) {
        console.error('Authentication retry failed, redirecting to login');
        // Clear any stored tokens
        if (globalTokenProvider?.clearToken) {
          globalTokenProvider.clearToken();
        }
        return Promise.reject(error);
      }
      
      // Mark request as retried
      originalRequest._retryAuth = true;
      
      try {
        // Attempt to get a fresh token
        const tokenProvider = initializeTokenProvider();
        const tokenInfo = await tokenProvider.getTokenInfo();
        
        if (tokenInfo.isValid && tokenInfo.token) {
          // Update the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${tokenInfo.token}`;
          originalRequest.headers['X-Token-Type'] = tokenInfo.type;
          
          console.debug(`Retrying request with fresh ${tokenInfo.type} token`);
          
          // Retry the original request
          return apiClient(originalRequest);
        } else {
          console.warn('No valid token available for retry');
        }
      } catch (tokenError) {
        console.error('Failed to refresh token:', tokenError);
      }
      
      // Add a delay to prevent rapid retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Enhanced server error handling with exponential backoff
    if (error.response?.status >= 500) {
      const retryCount = originalRequest.__retryCount || 0;
      const maxRetries = 3;
      
      if (retryCount < maxRetries) {
        originalRequest.__retryCount = retryCount + 1;
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        
        console.warn(`Server error (${error.response.status}), retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiClient(originalRequest);
      } else {
        console.error(`Server error after ${maxRetries} retries:`, {
          url: originalRequest.url,
          status: error.response.status,
          message: error.response?.data?.message || 'Server error'
        });
      }
    }
    
    // Enhanced error logging for debugging
    if (error.response) {
      console.error('API Error:', {
        url: originalRequest.url,
        method: originalRequest.method?.toUpperCase(),
        status: error.response.status,
        statusText: error.response.statusText,
        tokenType: originalRequest.headers?.['X-Token-Type'],
        message: error.response.data?.message || error.message
      });
    } else if (error.request) {
      console.error('Network Error:', {
        url: originalRequest.url,
        message: 'No response received from server'
      });
    } else {
      console.error('Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Enhanced helper functions for token management
export const createAuthenticatedRequest = async (token: string) => {
  const tokenType = detectTokenType(token);
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Token-Type': tokenType,
    },
  };
};

// Get current token information
export const getCurrentTokenInfo = async () => {
  try {
    const tokenProvider = initializeTokenProvider();
    return await tokenProvider.getTokenInfo();
  } catch (error) {
    console.debug('Failed to get current token info:', error);
    return {
      token: '',
      type: 'development' as const,
      isValid: false
    };
  }
};

// Check if authentication is available
export const isAuthenticationAvailable = async (): Promise<boolean> => {
  try {
    const tokenProvider = initializeTokenProvider();
    return await tokenProvider.hasValidToken();
  } catch (error) {
    console.debug('Failed to check authentication availability:', error);
    return false;
  }
};

// Force token refresh
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const tokenProvider = initializeTokenProvider();
    const tokenInfo = await tokenProvider.getTokenInfo();
    
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
  try {
    // Clear global token provider
    if (globalTokenProvider?.clearToken) {
      globalTokenProvider.clearToken();
    }
    
    // Clear any global tokens
    if ((window as any).__CLERK_SESSION_TOKEN) {
      delete (window as any).__CLERK_SESSION_TOKEN;
    }
    
    console.debug('Authentication state cleared');
  } catch (error) {
    console.error('Failed to clear authentication state:', error);
  }
};

// Users API
export const usersAPI = {
  getAll: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/users', { params }),
  
  getById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/users/${id}`),
  
  create: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/users', data),
  
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/users/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/users/${id}`),
};

// Agents API
export const agentsAPI = {
  getAll: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/agents', { params }),
  
  getById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/agents/${id}`),
  
  create: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/agents', data),
  
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/agents/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/agents/${id}`),
};

// Shifts API
export const shiftsAPI = {
  getAll: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/shifts', { params }),
  
  getById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/shifts/${id}`),
  
  create: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/shifts', data),
  
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/shifts/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/shifts/${id}`),
};

// Sites API
export const sitesAPI = {
  getAll: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/sites', { params }),
  
  getById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/sites/${id}`),
  
  create: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/sites', data),
  
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/sites/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/sites/${id}`),
};

// Reports API
export const reportsAPI = {
  getAll: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/reports', { params }),
  
  getById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/reports/${id}`),
  
  create: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/reports', data),
  
  update: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/reports/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/reports/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/analytics/dashboard', { params }),

  getKPIMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/analytics/kpi', { params }),

  getDashboardWidgets: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/analytics/widgets', { params }),

  getRealtimeMetrics: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/analytics/realtime'),

  exportDashboard: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/analytics/export', params, { responseType: 'blob' }),

  getAvailableFields: (): Promise<AxiosResponse<ApiResponse<{ fields: any[] }>>> =>
    apiClient.get('/analytics/fields'),

  generateCustomReport: (config: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/analytics/custom-report', config),

  getOperationalAnalytics: (params: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/analytics/operational', { params }),

  exportAnalytics: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/analytics/export', params, { responseType: 'blob' }),
};

// Audit API
export const auditAPI = {
  getLogs: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/audit/logs', { params }),

  getLogById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/audit/logs/${id}`),

  exportLogs: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/audit/export', params, { responseType: 'blob' }),

  getAuditLogs: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/audit/logs', { params }),

  exportAuditLogs: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/audit/export', params, { responseType: 'blob' }),
};

// Compliance API
export const complianceAPI = {
  getReports: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/compliance/reports', { params }),

  generateReport: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/compliance/generate', data),

  getCompliance: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/compliance/status', { params }),

  getComplianceChecks: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/compliance/checks'),

  getComplianceReports: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/compliance/reports'),

  runComplianceCheck: (checkId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/compliance/checks/${checkId}/run`),

  generateComplianceReport: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/compliance/reports', data),
};

// Business Intelligence API
export const businessIntelligenceAPI = {
  getMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/bi/metrics', { params }),

  getPredictions: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/bi/predictions', { params }),

  getTrends: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/bi/trends', { params }),

  getBIMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/bi/metrics', { params }),

  exportInsights: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/bi/export', params, { responseType: 'blob' }),
};

// Monitoring API
export const monitoringAPI = {
  getAgentLocations: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/monitoring/locations', { params }),

  getSystemStatus: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/monitoring/status'),

  getAlerts: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/monitoring/alerts', { params }),

  acknowledgeAlert: (alertId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/monitoring/alerts/${alertId}/acknowledge`),

  getActiveAgentLocations: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/monitoring/agent-locations?active=true'),

  getActiveAlerts: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/monitoring/alerts?active=true'),
};

// Scheduling API
export const schedulingAPI = {
  getSchedule: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/scheduling/schedule', { params }),

  getCurrentSchedule: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/scheduling/current', { params }),

  createShift: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/scheduling/shifts', data),

  updateShift: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/scheduling/shifts/${id}`, data),

  deleteShift: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/scheduling/shifts/${id}`),

  getAvailability: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/scheduling/availability', { params }),

  checkConflicts: (params: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/scheduling/check-conflicts', params),

  optimizeSchedule: (requirements: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/scheduling/optimize', requirements),

  applyOptimizedSchedule: (scheduleId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/scheduling/apply/${scheduleId}`),

  exportSchedule: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/scheduling/export', params, { responseType: 'blob' }),
};

// System API
export const systemAPI = {
  getConfig: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/system/config'),

  updateConfig: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/system/config', data),

  getHealth: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/system/health'),

  getLogs: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/system/logs', { params }),

  getSystemConfig: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/system/config'),

  updateSystemConfig: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/system/config', data),

  testConnection: (type: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/system/test-connection/${type}`),

  createSystemBackup: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/system/backup'),
};

// Admin Portal Centralized API - Complete Endpoints Extension
export const adminAPI = {
  // Workforce Management Endpoints (performance metrics, agent CRUD)
  getPerformanceMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/performance', { params }),
  
  getWorkforceAnalytics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/workforce/analytics', { params }),
  
  getAgents: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/agents', { params }),
  
  getAgentById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/agents/${id}`),
  
  createAgent: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/agents', data),
  
  updateAgent: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/agents/${id}`, data),
  
  deleteAgent: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/agents/${id}`),

  getAgentPerformance: (agentId: string, params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/agents/${agentId}/performance`, { params }),

  // Additional workforce management endpoints
  getWorkforceMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/workforce/metrics', { params }),

  getAgentAttendance: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/workforce/attendance', { params }),

  getTrainingRecords: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/workforce/training', { params }),

  // Audit Logs Management
  getAuditLogs: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/audit-logs', { params }),

  exportAuditLogs: (params?: any): Promise<AxiosResponse<any>> =>
    apiClient.get('/admin/audit-logs/export', { params, responseType: 'blob' }),

  // Invoice Management (moved to later section)

  // Contract Management
  getContracts: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/contracts', { params }),

  createContract: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/contracts', data),

  updateContract: (contractId: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/contracts/${contractId}`, data),

  // Patrol Reports Management
  getPatrolReports: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/patrol-reports', { params }),

  getPatrols: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/patrols', { params }),

  // Site Management
  getSites: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/sites', { params }),

  getSitesWithSecurity: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/sites/security', { params }),

  // Note: Agent Management methods already defined above (lines 566-580)

  // Attendance Management
  getAttendanceRecords: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/attendance/records', { params }),

  getAttendanceSummary: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/attendance/summary', { params }),

  updateAttendanceRecord: (recordId: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/attendance/records/${recordId}`, data),

  // Note: Training Management methods already defined above (lines 591-592)

  // Analytics
  getAnalytics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/analytics', { params }),

  // Client Management Endpoints (client CRUD, billing)
  getClientBilling: (clientId: string, params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/clients/${clientId}/billing`, { params }),

  updateClientBilling: (clientId: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/clients/${clientId}/billing`, data),

  // Operations Endpoints (communications, tracking)
  getCommunications: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/communications', { params }),
  
  createCommunication: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/communications', data),

  getCommunicationById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/communications/${id}`),

  updateCommunication: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/communications/${id}`, data),

  deleteCommunication: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/communications/${id}`),
  
  getTrackingData: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/tracking', { params }),

  getLiveTracking: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/tracking/live', { params }),

  getTrackingHistory: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/tracking/history', { params }),

  // Reports Endpoints (custom reports, analytics)
  getCustomReports: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/reports/custom', { params }),
  
  getCustomReportById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/reports/custom/${id}`),
  
  createReport: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/reports/custom', data),
  
  updateReport: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/reports/custom/${id}`, data),

  deleteReport: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/reports/custom/${id}`),
  
  runReport: (id: string, params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/reports/${id}/run`, params),

  exportReport: (id: string, format: string): Promise<AxiosResponse<any>> =>
    apiClient.get(`/admin/reports/${id}/export?format=${format}`, { responseType: 'blob' }),

  getReportAnalytics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/reports/analytics', { params }),

  // Report Execution Endpoints
  getReportExecutions: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/reports/executions', { params }),

  getReportExecutionById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/reports/executions/${id}`),

  // System Endpoints (settings, audit logs)
  getSystemSettings: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/system/settings'),
  
  updateSystemSettings: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/admin/system/settings', data),

  getSystemHealth: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/system/health'),

  getSystemStatus: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/system/status'),
  
  // Note: Audit logs methods already defined above (lines 427-431 and 595-599)

  // Scheduling Endpoints (schedule data, optimization)
  getScheduleData: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/schedule', { params }),
  
  getScheduleById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/schedule/${id}`),

  createSchedule: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/schedule', data),

  updateSchedule: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/schedule/${id}`, data),

  deleteSchedule: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/schedule/${id}`),
  
  optimizeSchedule: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/schedule/optimize', data),

  getScheduleOptimization: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/schedule/optimization', { params }),
  
  exportSchedule: (format: string): Promise<AxiosResponse<any>> =>
    apiClient.get(`/admin/schedule/export?format=${format}`, { responseType: 'blob' }),

  getScheduleConflicts: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/schedule/conflicts', { params }),

  // Profile Management Endpoints
  getProfile: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/profile'),
  
  updateProfile: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/admin/profile', data),

  // Notifications Endpoints
  getNotifications: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/notifications', { params }),
  
  getNotificationById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/notifications/${id}`),

  createNotification: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/notifications', data),

  updateNotification: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/notifications/${id}`, data),

  deleteNotification: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/notifications/${id}`),
  
  markNotificationRead: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.patch(`/admin/notifications/${id}/read`),
  
  markAllNotificationsRead: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.patch('/admin/notifications/read-all'),
  
  updateNotificationSettings: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/admin/notification-settings', data),

  getNotificationSettings: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/notification-settings'),

  // Incidents Management Endpoints
  getIncidents: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/incidents', { params }),

  getIncidentById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/incidents/${id}`),

  createIncident: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/incidents', data),

  updateIncident: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/incidents/${id}`, data),

  deleteIncident: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/incidents/${id}`),

  getIncidentResponse: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/incidents/response', { params }),

  updateIncidentStatus: (id: string, status: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.patch(`/admin/incidents/${id}/status`, { status }),

  // Geofencing Management Endpoints
  getGeofences: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/geofences', { params }),

  getGeofenceById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/geofences/${id}`),

  createGeofence: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/geofences', data),

  updateGeofence: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/geofences/${id}`, data),

  deleteGeofence: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/geofences/${id}`),

  getGeofenceViolations: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/geofences/violations', { params }),

  // Training Management Endpoints
  getTrainingProgramById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/training/programs/${id}`),

  createTrainingProgram: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/training/programs', data),

  updateTrainingProgram: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/training/programs/${id}`, data),

  deleteTrainingProgram: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/training/programs/${id}`),

  createTrainingCertification: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/training/certifications', data),

  updateTrainingCertification: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/training/certifications/${id}`, data),

  getAgentTrainingProgress: (agentId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/agents/${agentId}/training-progress`),

  assignTrainingToAgent: (agentId: string, trainingId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/agents/${agentId}/training/${trainingId}`),

  // Performance Tracking Endpoints
  getPerformanceReports: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/performance/reports', { params }),

  getAgentPerformanceDetails: (agentId: string, params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/agents/${agentId}/performance/details`, { params }),

  getPerformanceKPIs: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/performance/kpis', { params }),

  getPerformanceTrends: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/performance/trends', { params }),

  exportPerformanceReport: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/admin/performance/export', params, { responseType: 'blob' }),

  // Attendance Management Endpoints
  getAgentAttendanceDetails: (agentId: string, params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/agents/${agentId}/attendance`, { params }),

  createAttendanceRecord: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/attendance/records', data),

  exportAttendanceReport: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/admin/attendance/export', params, { responseType: 'blob' }),

  // Sites Management Endpoints
  getSitesOverview: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/sites/overview', { params }),

  getSiteDetails: (siteId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/sites/${siteId}/details`),

  getSiteAgents: (siteId: string, params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/admin/sites/${siteId}/agents`, { params }),

  assignAgentToSite: (siteId: string, agentId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/sites/${siteId}/agents/${agentId}`),

  removeAgentFromSite: (siteId: string, agentId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/sites/${siteId}/agents/${agentId}`),

  getSiteSchedule: (siteId: string, params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/sites/${siteId}/schedule`, { params }),

  // Dashboard Endpoints
  getDashboardOverview: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/dashboard/overview', { params }),

  getDashboardMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/dashboard/metrics', { params }),

  getDashboardAlerts: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/dashboard/alerts', { params }),

  getDashboardActivity: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/dashboard/activity', { params }),

  // User Management Endpoints
  getUsers: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/users', { params }),

  getUserById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/users/${id}`),

  createUser: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/users', data),

  updateUser: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/users/${id}`, data),

  deleteUser: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/users/${id}`),

  getUserRoles: (userId: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/admin/users/${userId}/roles`),

  updateUserRoles: (userId: string, roles: string[]): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/users/${userId}/roles`, { roles }),

  // Analytics Dashboard Endpoints
  getAnalyticsDashboard: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/analytics/dashboard', { params }),

  getAnalyticsWidgets: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/analytics/widgets', { params }),

  getAnalyticsCharts: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/analytics/charts', { params }),

  getAnalyticsFilters: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/analytics/filters'),

  // Workforce Scheduling Endpoints
  getWorkforceSchedule: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/workforce/schedule', { params }),

  createWorkforceSchedule: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/workforce/schedule', data),

  updateWorkforceSchedule: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/workforce/schedule/${id}`, data),

  getScheduleOptimizations: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/workforce/schedule/optimizations', { params }),

  applyScheduleOptimization: (optimizationId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/workforce/schedule/optimizations/${optimizationId}/apply`),

  // Live Tracking Endpoints
  getLiveAgentLocations: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/tracking/live/agents', { params }),

  getTrackingStats: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/tracking/stats', { params }),

  getAgentTrackingHistory: (agentId: string, params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/admin/agents/${agentId}/tracking/history`, { params }),

  // Real-time Monitoring Endpoints
  getMonitoringDashboard: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/monitoring/dashboard', { params }),

  getSystemMetrics: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/monitoring/system-metrics', { params }),

  getActiveConnections: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/monitoring/connections'),

  // Settings Management Endpoints
  getGeneralSettings: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/settings/general'),

  updateGeneralSettings: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/admin/settings/general', data),

  getSecuritySettings: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/settings/security'),

  updateSecuritySettings: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/admin/settings/security', data),

  getIntegrations: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/integrations'),

  createIntegration: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/integrations', data),

  getIntegrationTemplates: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/integrations/templates'),

  installIntegrationTemplate: (template: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/integrations/templates/install', template),

  getIntegrationLogs: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/integrations/logs', { params }),

  // Compliance Management Methods
  getComplianceFrameworks: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/compliance/frameworks'),

  getComplianceRequirements: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/compliance/requirements'),

  getComplianceAudits: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/compliance/audits'),

  getIntegrationSettings: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/settings/integrations'),

  updateIntegrationSettings: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put('/admin/settings/integrations', data),

  // Payroll Management Endpoints
  getPayrollData: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/payroll', { params }),

  getPayrollById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/payroll/${id}`),

  createPayrollEntry: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/payroll', data),

  updatePayrollEntry: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/payroll/${id}`, data),

  processPayroll: (params: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/payroll/process', params),

  exportPayrollReport: (params: any): Promise<AxiosResponse<any>> =>
    apiClient.post('/admin/payroll/export', params, { responseType: 'blob' }),

  // Invoicing Endpoints
  getInvoices: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/invoices', { params }),

  getInvoiceById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/invoices/${id}`),

  createInvoice: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/invoices', data),

  updateInvoice: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/invoices/${id}`, data),

  sendInvoice: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/invoices/${id}/send`),

  getInvoiceTemplate: (templateId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/invoices/templates/${templateId}`),

  // Payments Endpoints
  getPayments: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/payments', { params }),

  getPaymentById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/payments/${id}`),

  processPayment: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/payments/process', data),

  refundPayment: (id: string, amount?: number): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/payments/${id}/refund`, { amount }),

  getPaymentMethods: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/payments/methods'),

  // Communication Center Endpoints
  getMessages: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/communications/messages', { params }),

  getMessageById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/communications/messages/${id}`),

  sendMessage: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/communications/messages', data),

  broadcastMessage: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/communications/broadcast', data),

  getMessageTemplates: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/communications/templates'),

  createMessageTemplate: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/communications/templates', data),

  // Emergency Response Endpoints
  getEmergencyProtocols: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/emergency/protocols'),

  createEmergencyProtocol: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/emergency/protocols', data),

  updateEmergencyProtocol: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/emergency/protocols/${id}`, data),

  triggerEmergencyAlert: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/emergency/alert', data),

  getEmergencyContacts: (): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/emergency/contacts'),

  // Equipment Management Endpoints
  getEquipment: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/equipment', { params }),

  getEquipmentById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/equipment/${id}`),

  createEquipment: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/equipment', data),

  updateEquipment: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/equipment/${id}`, data),

  assignEquipmentToAgent: (equipmentId: string, agentId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/admin/equipment/${equipmentId}/assign/${agentId}`),

  getEquipmentMaintenance: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/equipment/maintenance', { params }),

  scheduleEquipmentMaintenance: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/equipment/maintenance', data),

  // Client Statistics Endpoint
  getClientStats: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/clients/stats', { params }),

  // Payment Recording Endpoint
  recordPayment: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/payments/record', data),

  getBillingInvoices: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/billing/invoices', { params }),

  getBillingPayments: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/billing/payments', { params }),

  // Billing Data Endpoint (unified)
  getBillingData: (params?: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get('/admin/billing/data', { params }),

  // Client Management Endpoints
  getClients: (params?: any): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/clients', { params }),

  getClientById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/admin/clients/${id}`),

  createClient: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/admin/clients', data),

  updateClient: (id: string, data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/admin/clients/${id}`, data),

  deleteClient: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/admin/clients/${id}`),
};

// Export the main API client
export { apiClient };

// Default export
export default apiClient;
