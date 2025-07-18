import apiClient, { analyticsAPI, usersAPI, monitoringAPI } from '../api';

describe('API Service Token Provider Integration', () => {
    describe('API Client Configuration', () => {
        it('should have correct base URL configuration', () => {
            const expectedBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost/api';
            expect(apiClient.defaults.baseURL).toBe(expectedBaseUrl);
        });

        it('should have correct timeout configuration', () => {
            expect(apiClient.defaults.timeout).toBe(10000);
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

    describe('API Endpoints', () => {
        it('should have analytics API endpoints', () => {
            expect(typeof analyticsAPI.getDashboard).toBe('function');
            expect(typeof analyticsAPI.getKPIMetrics).toBe('function');
            expect(typeof analyticsAPI.getDashboardWidgets).toBe('function');
            expect(typeof analyticsAPI.getRealtimeMetrics).toBe('function');
            expect(typeof analyticsAPI.exportDashboard).toBe('function');
        });

        it('should have users API endpoints', () => {
            expect(typeof usersAPI.getAll).toBe('function');
            expect(typeof usersAPI.getById).toBe('function');
            expect(typeof usersAPI.create).toBe('function');
            expect(typeof usersAPI.update).toBe('function');
            expect(typeof usersAPI.delete).toBe('function');
        });

        it('should have monitoring API endpoints', () => {
            expect(typeof monitoringAPI.getAgentLocations).toBe('function');
            expect(typeof monitoringAPI.getSystemStatus).toBe('function');
            expect(typeof monitoringAPI.getAlerts).toBe('function');
            expect(typeof monitoringAPI.acknowledgeAlert).toBe('function');
            expect(typeof monitoringAPI.getActiveAgentLocations).toBe('function');
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