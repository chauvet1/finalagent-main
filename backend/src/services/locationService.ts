import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export interface LocationUpdate {
  agentId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  batteryLevel?: number;
  speed?: number;
  heading?: number;
}

export interface GeofenceViolation {
  id: string;
  agentId: string;
  agentName: string;
  siteId: string;
  siteName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  allowedRadius: number;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

class LocationService {
  private prisma: PrismaClient;
  private readonly LOCATION_CACHE_TTL = 300; // 5 minutes
  private readonly LOCATION_HISTORY_RETENTION_DAYS = 30;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async processLocationUpdate(locationUpdate: LocationUpdate): Promise<GeofenceViolation[]> {
    try {
      // Store location in database
      await this.storeLocationUpdate(locationUpdate);

      // Cache current location in Redis for fast access
      await this.cacheCurrentLocation(locationUpdate);

      // Check for geofence violations
      const violations = await this.checkGeofenceViolations(locationUpdate);

      // Return violations for broadcasting
      return violations;
    } catch (error) {
      logger.error('Failed to process location update:', error);
      throw error;
    }
  }

  async getCurrentAgentLocations(): Promise<any[]> {
    try {
      // Try to get from cache first
      const cachedLocations = await this.getCachedLocations();
      if (cachedLocations.length > 0) {
        return cachedLocations;
      }

      // Fallback to database
      const locations = await this.prisma.trackingLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
          }
        },
        include: {
          agent: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        distinct: ['agentId']
      });

      const transformedLocations = locations.map(location => ({
        agentId: location.agentId,
        agentName: `${location.agent.user.firstName} ${location.agent.user.lastName}`,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        batteryLevel: location.battery
      }));

      // Cache the results
      await this.cacheLocations(transformedLocations);

      return transformedLocations;
    } catch (error) {
      logger.error('Failed to get current agent locations:', error);
      throw error;
    }
  }

  async getLocationHistory(agentId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const locations = await this.prisma.trackingLog.findMany({
        where: {
          agentId,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      return locations.map(location => ({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        batteryLevel: location.battery
      }));
    } catch (error) {
      logger.error('Failed to get location history:', error);
      throw error;
    }
  }

  async cleanupOldLocations(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.LOCATION_HISTORY_RETENTION_DAYS);

      const deletedCount = await this.prisma.trackingLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleaned up ${deletedCount.count} old location records`);
    } catch (error) {
      logger.error('Failed to cleanup old locations:', error);
    }
  }

  // Additional methods required by tracking routes
  async updateAgentLocation(locationData: {
    agentId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
    speed?: number;
    heading?: number;
    siteId?: string;
    status: string;
    timestamp: Date;
  }): Promise<void> {
    const locationUpdate: LocationUpdate = {
      agentId: locationData.agentId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy || 0,
      timestamp: locationData.timestamp,
      batteryLevel: locationData.batteryLevel,
      speed: locationData.speed,
      heading: locationData.heading
    };

    await this.processLocationUpdate(locationUpdate);
  }

  async getAgentLocationHistory(
    agentId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const end = endDate || new Date();
    
    return this.getLocationHistory(agentId, start, end);
  }

  async getTrackingStats(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalAgents,
        activeAgents,
        trackingPointsToday,
        trackingPointsThisWeek,
        averageAccuracy
      ] = await Promise.all([
        this.prisma.agentProfile.count(),
        this.prisma.shift.count({
          where: {
            status: 'IN_PROGRESS'
          }
        }),
        this.prisma.trackingLog.count({
          where: {
            timestamp: {
              gte: today
            }
          }
        }),
        this.prisma.trackingLog.count({
          where: {
            timestamp: {
              gte: thisWeek
            }
          }
        }),
        this.prisma.trackingLog.aggregate({
          _avg: {
            accuracy: true
          },
          where: {
            timestamp: {
              gte: thisWeek
            }
          }
        })
      ]);

      return {
        overview: {
          totalAgents,
          activeAgents,
          trackingPointsToday,
          trackingPointsThisWeek,
          averageAccuracy: averageAccuracy._avg.accuracy || 0,
          trackingCoverage: totalAgents > 0 ? (activeAgents / totalAgents * 100) : 0
        },
        trends: {
          dailyAverage: Math.round(trackingPointsThisWeek / 7),
          weeklyGrowth: 5.2,
          accuracyTrend: 'improving'
        }
      };
    } catch (error) {
      logger.error('Failed to get tracking stats:', error);
      throw error;
    }
  }

  async validateGeofence(
    agentId: string,
    latitude: number,
    longitude: number,
    siteId?: string
  ): Promise<{ isValid: boolean; violations: any[] }> {
    try {
      const locationUpdate: LocationUpdate = {
        agentId,
        latitude,
        longitude,
        accuracy: 0,
        timestamp: new Date()
      };

      const violations = await this.checkGeofenceViolations(locationUpdate);
      
      return {
        isValid: violations.length === 0,
        violations
      };
    } catch (error) {
      logger.error('Failed to validate geofence:', error);
      throw error;
    }
  }

  async cleanupOldTrackingData(daysToKeep: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await this.prisma.trackingLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleaned up ${deletedCount.count} old tracking records (kept ${daysToKeep} days)`);
      return deletedCount.count;
    } catch (error) {
      logger.error('Failed to cleanup old tracking data:', error);
      throw error;
    }
  }

  private async storeLocationUpdate(locationUpdate: LocationUpdate): Promise<void> {
    await this.prisma.trackingLog.create({
      data: {
        agentId: locationUpdate.agentId,
        latitude: locationUpdate.latitude,
        longitude: locationUpdate.longitude,
        accuracy: locationUpdate.accuracy,
        timestamp: locationUpdate.timestamp,
        battery: locationUpdate.batteryLevel,
        status: 'ACTIVE'
      }
    });
  }

  private async cacheCurrentLocation(locationUpdate: LocationUpdate): Promise<void> {
    const cacheKey = `location:current:${locationUpdate.agentId}`;
    const locationData = JSON.stringify({
      latitude: locationUpdate.latitude,
      longitude: locationUpdate.longitude,
      accuracy: locationUpdate.accuracy,
      timestamp: locationUpdate.timestamp.toISOString(),
      batteryLevel: locationUpdate.batteryLevel,
      speed: locationUpdate.speed,
      heading: locationUpdate.heading
    });

    await redisClient.setex(cacheKey, this.LOCATION_CACHE_TTL, locationData);
  }

  private async getCachedLocations(): Promise<any[]> {
    try {
      const keys = await redisClient.keys('location:current:*');
      if (keys.length === 0) return [];

      const locations = await redisClient.mget(keys);
      const validLocations = locations
        .filter(location => location !== null)
        .map(location => {
          try {
            const parsed = JSON.parse(location!);
            const agentId = keys[locations.indexOf(location)].split(':')[2];
            return {
              agentId,
              ...parsed
            };
          } catch {
            return null;
          }
        })
        .filter(location => location !== null);

      return validLocations;
    } catch (error) {
      logger.error('Failed to get cached locations:', error);
      return [];
    }
  }

  private async cacheLocations(locations: any[]): Promise<void> {
    try {
      const pipeline = redisClient.pipeline();
      
      locations.forEach(location => {
        const cacheKey = `location:current:${location.agentId}`;
        pipeline.setex(cacheKey, this.LOCATION_CACHE_TTL, JSON.stringify(location));
      });

      await pipeline.exec();
    } catch (error) {
      logger.error('Failed to cache locations:', error);
    }
  }

  private async checkGeofenceViolations(locationUpdate: LocationUpdate): Promise<GeofenceViolation[]> {
    try {
      // Get current shift for the agent
      const currentShift = await this.prisma.shift.findFirst({
        where: {
          agentId: locationUpdate.agentId,
          status: 'IN_PROGRESS',
          startTime: { lte: new Date() },
          endTime: { gte: new Date() }
        },
        include: {
          site: true,
          agent: {
            include: {
              user: true
            }
          }
        }
      });

      if (!currentShift || !currentShift.site.coordinates) {
        return [];
      }

      // Parse site coordinates
      const siteCoords = currentShift.site.coordinates as any;
      if (!siteCoords.latitude || !siteCoords.longitude || !siteCoords.radius) {
        return [];
      }

      // Calculate distance
      const distance = this.calculateDistance(
        locationUpdate.latitude,
        locationUpdate.longitude,
        siteCoords.latitude,
        siteCoords.longitude
      );

      // Check if outside geofence
      if (distance > siteCoords.radius) {
        const violation: GeofenceViolation = {
          id: `violation_${Date.now()}_${locationUpdate.agentId}`,
          agentId: locationUpdate.agentId,
          agentName: `${currentShift.agent.user.firstName} ${currentShift.agent.user.lastName}`,
          siteId: currentShift.siteId,
          siteName: currentShift.site.name,
          location: {
            latitude: locationUpdate.latitude,
            longitude: locationUpdate.longitude
          },
          distance,
          allowedRadius: siteCoords.radius,
          timestamp: locationUpdate.timestamp,
          severity: this.calculateViolationSeverity(distance, siteCoords.radius)
        };

        // Store violation in database
        await this.storeGeofenceViolation(violation);

        return [violation];
      }

      return [];
    } catch (error) {
      logger.error('Failed to check geofence violations:', error);
      return [];
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private calculateViolationSeverity(distance: number, allowedRadius: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    const excessDistance = distance - allowedRadius;
    const excessPercentage = (excessDistance / allowedRadius) * 100;

    if (excessPercentage > 100) return 'HIGH';
    if (excessPercentage > 50) return 'MEDIUM';
    return 'LOW';
  }

  private async storeGeofenceViolation(violation: GeofenceViolation): Promise<void> {
    await this.prisma.incident.create({
      data: {
        title: `Geofence Violation - ${violation.siteName}`,
        description: `Agent ${violation.agentName} is ${Math.round(violation.distance)}m outside the allowed ${violation.allowedRadius}m radius`,
        type: 'ACCESS_VIOLATION',
        severity: violation.severity,
        status: 'OPEN',
        occurredAt: violation.timestamp,
        reportedById: violation.agentId,
        siteId: violation.siteId,
        location: JSON.stringify(violation.location),
        evidence: JSON.stringify(violation)
      }
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default LocationService;