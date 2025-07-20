"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locationService_1 = __importDefault(require("../services/locationService"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const locationService = new locationService_1.default();
router.post('/location', auth_1.requireAuth, auth_1.requireAgent, (0, validation_1.validateBody)(validation_1.locationSchemas.locationUpdate), async (req, res) => {
    try {
        const { latitude, longitude, accuracy, batteryLevel, speed, heading, siteId, status } = req.body;
        const agentProfile = await req.user?.profileData?.agentProfile;
        if (!agentProfile) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'AGENT_PROFILE_REQUIRED',
                    message: 'Agent profile required for location updates'
                }
            });
        }
        await locationService.updateAgentLocation({
            agentId: agentProfile.id,
            latitude,
            longitude,
            accuracy,
            batteryLevel,
            speed,
            heading,
            siteId,
            status: status || 'ACTIVE',
            timestamp: new Date()
        });
        res.json({
            success: true,
            message: 'Location updated successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update location', { error, userId: req.user?.id });
        res.status(500).json({
            success: false,
            error: {
                code: 'LOCATION_UPDATE_FAILED',
                message: 'Failed to update location'
            }
        });
    }
});
router.get('/agents/current', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const currentLocations = await locationService.getCurrentAgentLocations();
        res.json({
            success: true,
            data: currentLocations,
            totalAgents: currentLocations.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get current agent locations', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'LOCATION_FETCH_FAILED',
                message: 'Failed to fetch current agent locations'
            }
        });
    }
});
router.get('/agents/:agentId/history', auth_1.requireAuth, auth_1.requireAdmin, (0, validation_1.validateQuery)(validation_1.commonSchemas.dateRange.optional().keys({
    limit: validation_1.commonSchemas.pagination.extract('limit')
})), async (req, res) => {
    try {
        const { agentId } = req.params;
        const { startDate, endDate, limit } = req.query;
        const locationHistory = await locationService.getAgentLocationHistory(agentId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, limit ? parseInt(limit) : 100);
        res.json({
            success: true,
            data: locationHistory,
            totalRecords: locationHistory.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get agent location history', { error, agentId: req.params.agentId });
        res.status(500).json({
            success: false,
            error: {
                code: 'LOCATION_HISTORY_FAILED',
                message: 'Failed to fetch location history'
            }
        });
    }
});
router.get('/stats', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const trackingStats = await locationService.getTrackingStats();
        res.json({
            success: true,
            data: trackingStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get tracking statistics', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'TRACKING_STATS_FAILED',
                message: 'Failed to fetch tracking statistics'
            }
        });
    }
});
router.post('/geofence/validate', auth_1.requireAuth, auth_1.requireAgent, (0, validation_1.validateBody)(validation_1.locationSchemas.geofenceValidation), async (req, res) => {
    try {
        const { agentId, siteId, latitude, longitude, action } = req.body;
        const validation = await locationService.validateGeofence(agentId, latitude, longitude, siteId);
        logger_1.logger.info('Geofence validation performed', {
            agentId,
            siteId,
            latitude,
            longitude,
            action,
            isValid: validation.isValid,
            violations: validation.violations
        });
        res.json({
            success: true,
            data: {
                isValid: validation.isValid,
                violations: validation.violations,
                action,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to validate geofence', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'GEOFENCE_VALIDATION_FAILED',
                message: 'Failed to validate geofence'
            }
        });
    }
});
router.delete('/cleanup', auth_1.requireAuth, auth_1.requireAdmin, (0, validation_1.validateQuery)(validation_1.commonSchemas.pagination.keys({
    daysToKeep: validation_1.commonSchemas.pagination.extract('limit').default(30)
})), async (req, res) => {
    try {
        const { daysToKeep } = req.query;
        const deletedCount = await locationService.cleanupOldTrackingData(parseInt(daysToKeep) || 30);
        res.json({
            success: true,
            message: 'Tracking data cleanup completed',
            data: {
                deletedRecords: deletedCount,
                daysToKeep: parseInt(daysToKeep) || 30
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to cleanup tracking data', { error });
        res.status(500).json({
            success: false,
            error: {
                code: 'CLEANUP_FAILED',
                message: 'Failed to cleanup tracking data'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=tracking.js.map