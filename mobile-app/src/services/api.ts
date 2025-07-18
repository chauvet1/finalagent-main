import axios from 'axios';
import { TokenProvider } from './tokenProvider';

// Create a base axios instance with common configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize token provider
const tokenProvider = new TokenProvider();

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await tokenProvider.getToken();
      const tokenType = await tokenProvider.getTokenType();
      
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        // Add token type header to help backend identify token format
        config.headers['X-Token-Type'] = tokenType;
      }
      return config;
    } catch (error) {
      console.error('Error setting auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to check if authentication is available
export const isAuthenticationAvailable = async () => {
  try {
    const token = await tokenProvider.getToken();
    return !!token;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
};

// Helper function to get current token info for debugging
export const getCurrentTokenInfo = async () => {
  try {
    const token = await tokenProvider.getToken();
    const tokenType = await tokenProvider.getTokenType();
    return { 
      type: tokenType,
      available: !!token,
      // Don't include the actual token for security reasons
    };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return { type: 'unknown', available: false };
  }
};

// Mobile API endpoints
export const mobileAPI = {
  getDashboard: () => api.get('/mobile/dashboard'),
  getPatrols: () => api.get('/mobile/patrols'),
  startPatrol: (patrolId: string) => api.post(`/mobile/patrols/${patrolId}/start`),
  completePatrol: (patrolId: string, data: any) => api.post(`/mobile/patrols/${patrolId}/complete`, data),
  getIncidents: () => api.get('/mobile/incidents'),
  createIncident: (data: any) => api.post('/mobile/incidents', data),
  updateIncident: (incidentId: string, data: any) => api.patch(`/mobile/incidents/${incidentId}`, data),
  getReports: () => api.get('/mobile/reports'),
  createReport: (data: any) => api.post('/mobile/reports', data),
  startShift: (data: any) => api.post('/mobile/shifts/start', data),
  endShift: (shiftId: string, data: any) => api.post(`/mobile/shifts/${shiftId}/end`, data),
  takeBreak: (shiftId: string) => api.post(`/mobile/shifts/${shiftId}/break`),
  resumeShift: (shiftId: string) => api.post(`/mobile/shifts/${shiftId}/resume`),
};

export default api;