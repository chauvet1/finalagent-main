import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IncidentNotificationData {
  incidentId: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  siteId: string;
  siteName: string;
  reportedById?: string;
  reportedByName?: string;
  occurredAt: Date;
  location?: string;
  description: string;
}

export class IncidentNotificationService {
  private static instance: IncidentNotificationService;

  static getInstance(): IncidentNotificationService {
    if (!IncidentNotificationService.instance) {
      IncidentNotificationService.instance = new IncidentNotificationService();
    }
    return IncidentNotificationService.instance;
  }

  async notifyIncidentCreated(incidentData: IncidentNotificationData): Promise<void> {
    try {
      // Get site information to determine who to notify
      const site = await prisma.site.findUnique({
        where: { id: incidentData.siteId },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      if (!site) {
        console.error('Site not found for incident notification:', incidentData.siteId);
        return;
      }

      // Get supervisors and admins to notify
      const supervisorsAndAdmins = await prisma.user.findMany({
        where: {
          role: { in: ['SUPERVISOR', 'ADMIN'] },
          status: 'ACTIVE'
        }
      });

      // Create notifications for supervisors and admins
      const notifications = supervisorsAndAdmins.map(user => ({
        userId: user.id,
        type: 'INCIDENT' as const,
        priority: this.mapSeverityToPriority(incidentData.severity),
        title: `New ${incidentData.severity} Incident: ${incidentData.title}`,
        message: `A ${incidentData.severity.toLowerCase()} incident has been reported at ${incidentData.siteName}. Type: ${incidentData.type}. ${incidentData.description.substring(0, 100)}${incidentData.description.length > 100 ? '...' : ''}`,
        channels: ['IN_APP', 'EMAIL'],
        relatedEntityType: 'INCIDENT',
        relatedEntityId: incidentData.incidentId,
        actionUrl: `/incidents/${incidentData.incidentId}`,
        scheduledFor: new Date()
      }));

      // Also notify the client if it's a high or critical incident
      if ((incidentData.severity === 'HIGH' || incidentData.severity === 'CRITICAL') && site.client?.user) {
        notifications.push({
          userId: site.client.user.id,
          type: 'INCIDENT' as const,
          priority: this.mapSeverityToPriority(incidentData.severity),
          title: `${incidentData.severity} Incident at ${incidentData.siteName}`,
          message: `A ${incidentData.severity.toLowerCase()} incident has occurred at your site: ${incidentData.siteName}. Our team is responding immediately. Incident type: ${incidentData.type}.`,
          channels: ['IN_APP', 'EMAIL'],
          relatedEntityType: 'INCIDENT',
          relatedEntityId: incidentData.incidentId,
          actionUrl: `/client/incidents/${incidentData.incidentId}`,
          scheduledFor: new Date()
        });
      }

      // Create all notifications
      await prisma.notification.createMany({
        data: notifications
      });

      console.log(`Created ${notifications.length} notifications for incident ${incidentData.incidentId}`);
    } catch (error) {
      console.error('Error creating incident notifications:', error);
    }
  }

  async notifyIncidentEscalated(incidentData: IncidentNotificationData, escalationReason: string): Promise<void> {
    try {
      // Get all admins for escalation notifications
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });

      // Get site client for notification
      const site = await prisma.site.findUnique({
        where: { id: incidentData.siteId },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      const notifications = admins.map(admin => ({
        userId: admin.id,
        type: 'INCIDENT' as const,
        priority: 'URGENT' as const,
        title: `ESCALATED: ${incidentData.title}`,
        message: `Incident at ${incidentData.siteName} has been escalated. Reason: ${escalationReason}. Immediate attention required.`,
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        relatedEntityType: 'INCIDENT',
        relatedEntityId: incidentData.incidentId,
        actionUrl: `/incidents/${incidentData.incidentId}`,
        scheduledFor: new Date()
      }));

      // Also notify client for escalated incidents
      if (site?.client?.user) {
        notifications.push({
          userId: site.client.user.id,
          type: 'INCIDENT' as const,
          priority: 'URGENT' as const,
          title: `Escalated Incident at ${incidentData.siteName}`,
          message: `The incident at your site has been escalated and is receiving priority attention from our management team.`,
          channels: ['IN_APP', 'EMAIL'],
          relatedEntityType: 'INCIDENT',
          relatedEntityId: incidentData.incidentId,
          actionUrl: `/client/incidents/${incidentData.incidentId}`,
          scheduledFor: new Date()
        });
      }

      await prisma.notification.createMany({
        data: notifications
      });

      console.log(`Created ${notifications.length} escalation notifications for incident ${incidentData.incidentId}`);
    } catch (error) {
      console.error('Error creating escalation notifications:', error);
    }
  }

  async notifyIncidentResolved(incidentData: IncidentNotificationData): Promise<void> {
    try {
      // Get site client for resolution notification
      const site = await prisma.site.findUnique({
        where: { id: incidentData.siteId },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      if (!site?.client?.user) {
        return;
      }

      // Calculate resolution time
      const resolutionTime = Math.round((new Date().getTime() - incidentData.occurredAt.getTime()) / (1000 * 60 * 60));

      const notification = {
        userId: site.client.user.id,
        type: 'INCIDENT' as const,
        priority: 'MEDIUM' as const,
        title: `Incident Resolved: ${incidentData.title}`,
        message: `The incident at ${incidentData.siteName} has been resolved. Resolution time: ${resolutionTime} hours. Thank you for your patience.`,
        channels: ['IN_APP', 'EMAIL'],
        relatedEntityType: 'INCIDENT',
        relatedEntityId: incidentData.incidentId,
        actionUrl: `/client/incidents/${incidentData.incidentId}`,
        scheduledFor: new Date()
      };

      await prisma.notification.create({
        data: notification
      });

      console.log(`Created resolution notification for incident ${incidentData.incidentId}`);
    } catch (error) {
      console.error('Error creating resolution notification:', error);
    }
  }

  async notifyIncidentStatusUpdate(incidentData: IncidentNotificationData, oldStatus: string, newStatus: string): Promise<void> {
    try {
      // Only notify on significant status changes
      if (oldStatus === newStatus) return;

      const significantChanges = [
        { from: 'OPEN', to: 'IN_PROGRESS' },
        { from: 'IN_PROGRESS', to: 'RESOLVED' },
        { from: 'RESOLVED', to: 'CLOSED' }
      ];

      const isSignificant = significantChanges.some(change => 
        change.from === oldStatus && change.to === newStatus
      );

      if (!isSignificant) return;

      // Get site client
      const site = await prisma.site.findUnique({
        where: { id: incidentData.siteId },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      if (!site?.client?.user) return;

      const statusMessages = {
        'IN_PROGRESS': 'Our team is now actively working on resolving this incident.',
        'RESOLVED': 'This incident has been resolved. Please review the resolution details.',
        'CLOSED': 'This incident has been closed and archived.'
      };

      const notification = {
        userId: site.client.user.id,
        type: 'INCIDENT' as const,
        priority: 'MEDIUM' as const,
        title: `Incident Status Update: ${incidentData.title}`,
        message: `Status changed from ${oldStatus} to ${newStatus}. ${statusMessages[newStatus as keyof typeof statusMessages] || ''}`,
        channels: ['IN_APP'],
        relatedEntityType: 'INCIDENT',
        relatedEntityId: incidentData.incidentId,
        actionUrl: `/client/incidents/${incidentData.incidentId}`,
        scheduledFor: new Date()
      };

      await prisma.notification.create({
        data: notification
      });

      console.log(`Created status update notification for incident ${incidentData.incidentId}`);
    } catch (error) {
      console.error('Error creating status update notification:', error);
    }
  }

  private mapSeverityToPriority(severity: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL' {
    switch (severity) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'URGENT';
      case 'MEDIUM':
        return 'HIGH';
      case 'LOW':
        return 'MEDIUM';
      default:
        return 'MEDIUM';
    }
  }

  async getIncidentNotifications(userId: string, incidentId?: string): Promise<any[]> {
    try {
      const where: any = {
        userId,
        type: 'INCIDENT'
      };

      if (incidentId) {
        where.relatedEntityId = incidentId;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching incident notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          readAt: new Date(),
          isRead: true
        }
      });

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
}

export default IncidentNotificationService;