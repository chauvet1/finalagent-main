import { Router, Request, Response } from 'express';
import LocationService from '../services/locationService';
import { requireAuth, requireAgent, requireAdmin } from '../middleware/auth';
import { validateBody, validateQuery, locationSchemas, commonSchemas } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const locationService = new LocationService();

/**
 * POST /api/tracking/location
 * Update agent location
 */
router.post('/location',
  requireAuth,
  requireAgent,
  validateBody(locationSchemas.locationUpdate),
  async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, accuracy, batteryLevel, speed, heading, siteId, status } = req.body;
      
      // Get agent ID from authenticated user
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
    } catch (error) {
      logger.error('Failed to update location', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: {
          code: 'LOCATION_UPDATE_FAILED',
          message: 'Failed to update location'
        }
      });
    }
  }
);

/**
 * GET /api/tracking/agents/current
 * Get current locations of all active agents
 */
router.get('/agents/current',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const currentLocations = await locationService.getCurrentAgentLocations();

      res.json({
        success: true,
        data: currentLocations,
        totalAgents: currentLocations.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get current agent locations', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LOCATION_FETCH_FAILED',
          message: 'Failed to fetch current agent locations'
        }
      });
    }
  }
);

/**
 * GET /api/tracking/agents/:agentId/history
 * Get location history for a specific agent
 */
router.get('/agents/:agentId/history',
  requireAuth,
  requireAdmin,
  validateQuery(commonSchemas.dateRange.optional().keys({
    limit: commonSchemas.pagination.extract('limit')
  })),
  async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate, limit } = req.query;

      const locationHistory = await locationService.getAgentLocationHistory(
        agentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        limit ? parseInt(limit as string) : 100
      );

      res.json({
        success: true,
        data: locationHistory,
        totalRecords: locationHistory.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get agent location history', { error, agentId: req.params.agentId });
      res.status(500).json({
        success: false,
        error: {
          code: 'LOCATION_HISTORY_FAILED',
          message: 'Failed to fetch location history'
        }
      });
    }
  }
);

/**
 * GET /api/tracking/stats
 * Get tracking statistics
 */
router.get('/stats',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const trackingStats = await locationService.getTrackingStats();

      res.json({
        success: true,
        data: trackingStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get tracking statistics', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'TRACKING_STATS_FAILED',
          message: 'Failed to fetch tracking statistics'
        }
      });
    }
  }
);

/**
 * POST /api/tracking/geofence/validate
 * Validate agent location against geofences
 */
router.post('/geofence/validate',
  requireAuth,
  requireAgent,
  validateBody(locationSchemas.geofenceValidation),
  async (req: Request, res: Response) => {
    try {
      const { agentId, siteId, latitude, longitude, action } = req.body;

      // Validate geofence
      const validation = await locationService.validateGeofence(
        agentId,
        latitude,
        longitude,
        siteId
      );

      // Log geofence validation
      // This would typically create a GeofenceValidation record
      logger.info('Geofence validation performed', {
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
    } catch (error) {
      logger.error('Failed to validate geofence', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'GEOFENCE_VALIDATION_FAILED',
          message: 'Failed to validate geofence'
        }
      });
    }
  }
);

/**
 * DELETE /api/tracking/cleanup
 * Clean up old tracking data (admin only)
 */
router.delete('/cleanup',
  requireAuth,
  requireAdmin,
  validateQuery(commonSchemas.pagination.keys({
    daysToKeep: commonSchemas.pagination.extract('limit').default(30)
  })),
  async (req: Request, res: Response) => {
    try {
      const { daysToKeep } = req.query;
      
      const deletedCount = await locationService.cleanupOldTrackingData(
        parseInt(daysToKeep as string) || 30
      );

      res.json({
        success: true,
        message: 'Tracking data cleanup completed',
        data: {
          deletedRecords: deletedCount,
          daysToKeep: parseInt(daysToKeep as string) || 30
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to cleanup tracking data', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_FAILED',
          message: 'Failed to cleanup tracking data'
        }
      });
    }
  }
);

export default router;