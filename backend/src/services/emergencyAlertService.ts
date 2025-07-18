import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export interface EmergencyAlert {
  id: string;
  type: 'PANIC' | 'MEDICAL' | 'SECURITY' | 'FIRE' | 'GENERAL';
  priority: 'HIGH' | 'CRITICAL';
  agentId: string;
  agentName: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  description?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalationLevel: number;
  notificationsSent: string[];
}

export interface AlertEscalation {
  level: number;
  delayMinutes: number;
  recipients: string[];
  channels: ('websocket' | 'email' | 'sms' | 'push')[];
}

class EmergencyAlertService {
  private prisma: PrismaClient;
  private readonly ALERT_CACHE_TTL = 3600; // 1 hour
  private readonly MAX_ESCALATION_LEVEL = 3;

  // Default escalation configuration
  private readonly DEFAULT_ESCALATIONS: AlertEscalation[] = [
    {
      level: 1,
      delayMinutes: 0,
      recipients: ['supervisor'],
      channels: ['websocket', 'push']
    },
    {
      level: 2,
      delayMinutes: 5,
      recipients: ['supervisor', 'admin'],
      channels: ['websocket', 'push', 'email']
    },
    {
      level: 3,
      delayMinutes: 15,
      recipients: ['supervisor', 'admin', 'emergency_contact'],
      channels: ['websocket', 'push', 'email', 'sms']
    }
  ];

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createEmergencyAlert(alertData: {
    type: EmergencyAlert['type'];
    agentId: string;
    location?: EmergencyAlert['location'];
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<EmergencyAlert> {
    try {
      // Get agent information
      const agent = await this.prisma.agentProfile.findUnique({
        where: { id: alertData.agentId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const alert: EmergencyAlert = {
        id: alertId,
        type: alertData.type,
        priority: alertData.type === 'PANIC' || alertData.type === 'MEDICAL' ? 'CRITICAL' : 'HIGH',
        agentId: alertData.agentId,
        agentName: `${agent.user.firstName} ${agent.user.lastName}`,
        location: alertData.location,
        description: alertData.description,
        metadata: alertData.metadata,
        timestamp: new Date(),
        status: 'ACTIVE',
        escalationLevel: 1,
        notificationsSent: []
      };

      // Store alert in database
      await this.storeAlert(alert);

      // Cache alert for quick access
      await this.cacheAlert(alert);

      // Start escalation process
      await this.startEscalationProcess(alert);

      logger.warn(`Emergency alert created: ${alert.id} - ${alert.type} from ${alert.agentName}`);

      return alert;
    } catch (error) {
      logger.error('Failed to create emergency alert:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<EmergencyAlert> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      if (alert.status !== 'ACTIVE') {
        throw new Error('Alert is not active');
      }

      // Update alert status
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();

      // Update in database and cache
      await this.updateAlert(alert);

      // Cancel escalation timers
      await this.cancelEscalation(alertId);

      logger.info(`Emergency alert acknowledged: ${alertId} by ${acknowledgedBy}`);

      return alert;
    } catch (error) {
      logger.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  async resolveAlert(alertId: string, resolvedBy: string, resolution: 'RESOLVED' | 'FALSE_ALARM'): Promise<EmergencyAlert> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      // Update alert status
      alert.status = resolution;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date();

      // Update in database and cache
      await this.updateAlert(alert);

      // Cancel escalation timers
      await this.cancelEscalation(alertId);

      logger.info(`Emergency alert resolved: ${alertId} by ${resolvedBy} as ${resolution}`);

      return alert;
    } catch (error) {
      logger.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  async getActiveAlerts(): Promise<EmergencyAlert[]> {
    try {
      // Try cache first
      const cachedAlerts = await this.getCachedActiveAlerts();
      if (cachedAlerts.length > 0) {
        return cachedAlerts;
      }

      // Fallback to database
      const incidents = await this.prisma.incident.findMany({
        where: {
          type: {
            in: ['MEDICAL_EMERGENCY', 'FIRE', 'SECURITY_BREACH', 'OTHER']
          },
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
        include: {
          reportedBy: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          occurredAt: 'desc'
        }
      });

      const alerts = incidents.map(incident => this.mapIncidentToAlert(incident));
      
      // Cache the results
      await this.cacheActiveAlerts(alerts);

      return alerts;
    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      throw error;
    }
  }

  async getAlert(alertId: string): Promise<EmergencyAlert | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`alert:${alertId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const incident = await this.prisma.incident.findFirst({
        where: {
          evidence: {
            path: ['alertId'],
            equals: alertId
          }
        },
        include: {
          reportedBy: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!incident) return null;

      const alert = this.mapIncidentToAlert(incident);
      
      // Cache the result
      await this.cacheAlert(alert);

      return alert;
    } catch (error) {
      logger.error('Failed to get alert:', error);
      return null;
    }
  }

  async processEscalation(alertId: string, escalationLevel: number): Promise<void> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert || alert.status !== 'ACTIVE') {
        return; // Alert no longer active
      }

      const escalation = this.DEFAULT_ESCALATIONS.find(e => e.level === escalationLevel);
      if (!escalation) {
        logger.warn(`No escalation configuration found for level ${escalationLevel}`);
        return;
      }

      // Update alert escalation level
      alert.escalationLevel = escalationLevel;
      await this.updateAlert(alert);

      // Send notifications based on escalation configuration
      await this.sendEscalationNotifications(alert, escalation);

      // Schedule next escalation if not at max level
      if (escalationLevel < this.MAX_ESCALATION_LEVEL) {
        await this.scheduleEscalation(alertId, escalationLevel + 1);
      }

      logger.info(`Alert ${alertId} escalated to level ${escalationLevel}`);
    } catch (error) {
      logger.error('Failed to process escalation:', error);
    }
  }

  private async storeAlert(alert: EmergencyAlert): Promise<void> {
    // Get agent's current site if available
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id: alert.agentId },
      include: { currentSite: true }
    });

    await this.prisma.incident.create({
      data: {
        title: `Emergency Alert - ${alert.type}`,
        description: alert.description || `${alert.type} alert from ${alert.agentName}`,
        type: alert.type === 'MEDICAL' ? 'MEDICAL_EMERGENCY' : 
              alert.type === 'FIRE' ? 'FIRE' : 
              alert.type === 'SECURITY' ? 'SECURITY_BREACH' : 'OTHER',
        severity: alert.priority,
        status: 'OPEN',
        occurredAt: alert.timestamp,
        reportedById: alert.agentId,
        siteId: agent?.currentSiteId || 'unknown',
        location: alert.location ? JSON.stringify(alert.location) : null,
        evidence: JSON.stringify({
          alertId: alert.id,
          alertType: alert.type,
          priority: alert.priority,
          escalationLevel: alert.escalationLevel,
          metadata: alert.metadata
        })
      }
    });
  }

  private async updateAlert(alert: EmergencyAlert): Promise<void> {
    // Update database
    await this.prisma.incident.updateMany({
      where: {
        evidence: {
          path: ['alertId'],
          equals: alert.id
        }
      },
      data: {
        status: alert.status === 'ACTIVE' ? 'OPEN' : 
               alert.status === 'ACKNOWLEDGED' ? 'IN_PROGRESS' : 'RESOLVED',
        resolvedAt: alert.resolvedAt,
        evidence: JSON.stringify({
          alertId: alert.id,
          alertType: alert.type,
          priority: alert.priority,
          escalationLevel: alert.escalationLevel,
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt,
          resolvedBy: alert.resolvedBy,
          resolvedAt: alert.resolvedAt,
          metadata: alert.metadata
        })
      }
    });

    // Update cache
    await this.cacheAlert(alert);
  }

  private async cacheAlert(alert: EmergencyAlert): Promise<void> {
    await redisClient.setex(`alert:${alert.id}`, this.ALERT_CACHE_TTL, JSON.stringify(alert));
  }

  private async getCachedActiveAlerts(): Promise<EmergencyAlert[]> {
    try {
      const keys = await redisClient.keys('alert:*');
      if (keys.length === 0) return [];

      const alerts = await redisClient.mget(keys);
      return alerts
        .filter(alert => alert !== null)
        .map(alert => JSON.parse(alert!))
        .filter(alert => alert.status === 'ACTIVE');
    } catch (error) {
      logger.error('Failed to get cached active alerts:', error);
      return [];
    }
  }

  private async cacheActiveAlerts(alerts: EmergencyAlert[]): Promise<void> {
    const pipeline = redisClient.pipeline();
    alerts.forEach(alert => {
      pipeline.setex(`alert:${alert.id}`, this.ALERT_CACHE_TTL, JSON.stringify(alert));
    });
    await pipeline.exec();
  }

  private async startEscalationProcess(alert: EmergencyAlert): Promise<void> {
    // Immediate notification (level 1)
    await this.processEscalation(alert.id, 1);
  }

  private async scheduleEscalation(alertId: string, level: number): Promise<void> {
    const escalation = this.DEFAULT_ESCALATIONS.find(e => e.level === level);
    if (!escalation) return;

    const delayMs = escalation.delayMinutes * 60 * 1000;
    const scheduleKey = `escalation:${alertId}:${level}`;
    
    // Store escalation schedule in Redis
    await redisClient.setex(scheduleKey, Math.ceil(delayMs / 1000), JSON.stringify({
      alertId,
      level,
      scheduledAt: new Date(),
      executeAt: new Date(Date.now() + delayMs)
    }));

    // In a production environment, you would use a proper job queue like Bull
    // For now, we'll use setTimeout (note: this won't survive server restarts)
    setTimeout(async () => {
      // Check if escalation is still needed
      const exists = await redisClient.exists(scheduleKey);
      if (exists) {
        await this.processEscalation(alertId, level);
        await redisClient.del(scheduleKey);
      }
    }, delayMs);
  }

  private async cancelEscalation(alertId: string): Promise<void> {
    // Remove all scheduled escalations for this alert
    const keys = await redisClient.keys(`escalation:${alertId}:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }

  private async sendEscalationNotifications(alert: EmergencyAlert, escalation: AlertEscalation): Promise<void> {
    // This would integrate with your notification services
    // For now, we'll just log the notifications that would be sent
    
    logger.info(`Sending escalation notifications for alert ${alert.id}:`, {
      level: escalation.level,
      recipients: escalation.recipients,
      channels: escalation.channels,
      alert: {
        id: alert.id,
        type: alert.type,
        agentName: alert.agentName,
        location: alert.location
      }
    });

    // Update notifications sent
    alert.notificationsSent.push(`level_${escalation.level}_${new Date().toISOString()}`);
  }

  private mapIncidentToAlert(incident: any): EmergencyAlert {
    const evidence = incident.evidence ? JSON.parse(incident.evidence) : {};
    
    return {
      id: evidence.alertId || `incident_${incident.id}`,
      type: evidence.alertType || 'GENERAL',
      priority: evidence.priority || 'HIGH',
      agentId: incident.reportedById,
      agentName: incident.reportedBy ? 
        `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 
        'Unknown',
      location: incident.location ? JSON.parse(incident.location) : undefined,
      description: incident.description,
      metadata: evidence.metadata,
      timestamp: incident.occurredAt,
      status: incident.status === 'OPEN' ? 'ACTIVE' : 
              incident.status === 'IN_PROGRESS' ? 'ACKNOWLEDGED' : 'RESOLVED',
      acknowledgedBy: evidence.acknowledgedBy,
      acknowledgedAt: evidence.acknowledgedAt ? new Date(evidence.acknowledgedAt) : undefined,
      resolvedBy: evidence.resolvedBy,
      resolvedAt: incident.resolvedAt,
      escalationLevel: evidence.escalationLevel || 1,
      notificationsSent: evidence.notificationsSent || []
    };
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default EmergencyAlertService;