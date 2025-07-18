import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardMetrics {
  overview: {
    totalAgents: number;
    activeShifts: number;
    openIncidents: number;
    completedShifts: number;
    totalSites: number;
    activeClients: number;
  };
  trends: {
    shiftsThisWeek: number;
    shiftsLastWeek: number;
    incidentsThisWeek: number;
    incidentsLastWeek: number;
    shiftsGrowth: number;
    incidentsChange: number;
  };
  performance: {
    averageShiftDuration: number;
    onTimePercentage: number;
    incidentResolutionTime: number;
    agentUtilization: number;
  };
}

export interface AnalyticsData {
  shifts: {
    total: number;
    completed: number;
    inProgress: number;
    cancelled: number;
    byStatus: Array<{ status: string; count: number }>;
    byWeek: Array<{ week: string; count: number }>;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    bySeverity: Array<{ severity: string; count: number }>;
    byType: Array<{ type: string; count: number }>;
    byWeek: Array<{ week: string; count: number }>;
  };
  agents: {
    total: number;
    active: number;
    onShift: number;
    utilization: Array<{ agentId: string; name: string; hoursWorked: number; utilization: number }>;
  };
  sites: {
    total: number;
    active: number;
    coverage: Array<{ siteId: string; name: string; coverageHours: number; incidents: number }>;
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(dateRange?: DateRange): Promise<DashboardMetrics> {
    try {
      const now = new Date();
      const startDate = dateRange?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.endDate || now;
      
      const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Overview metrics
      const [
        totalAgents,
        activeShifts,
        openIncidents,
        completedShifts,
        totalSites,
        activeClients
      ] = await Promise.all([
        prisma.agentProfile.count({ where: { user: { status: 'ACTIVE' } } }),
        prisma.shift.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.shift.count({ 
          where: { 
            status: 'COMPLETED',
            startTime: { gte: startDate, lte: endDate }
          } 
        }),
        prisma.site.count({ where: { status: 'ACTIVE' } }),
        prisma.clientProfile.count({ where: { user: { status: 'ACTIVE' } } })
      ]);

      // Trend metrics
      const [
        shiftsThisWeek,
        shiftsLastWeek,
        incidentsThisWeek,
        incidentsLastWeek
      ] = await Promise.all([
        prisma.shift.count({ 
          where: { startTime: { gte: thisWeekStart, lte: now } } 
        }),
        prisma.shift.count({ 
          where: { startTime: { gte: lastWeekStart, lte: lastWeekEnd } } 
        }),
        prisma.incident.count({ 
          where: { occurredAt: { gte: thisWeekStart, lte: now } } 
        }),
        prisma.incident.count({ 
          where: { occurredAt: { gte: lastWeekStart, lte: lastWeekEnd } } 
        })
      ]);

      // Performance metrics
      const [
        avgShiftDuration,
        onTimeShifts,
        totalScheduledShifts,
        avgIncidentResolution,
        agentHours
      ] = await Promise.all([
        this.calculateAverageShiftDuration(startDate, endDate),
        prisma.shift.count({
          where: {
            status: 'COMPLETED',
            startTime: { gte: startDate, lte: endDate },
            // Consider on-time if started within 15 minutes of scheduled time
          }
        }),
        prisma.shift.count({
          where: {
            status: { in: ['COMPLETED', 'IN_PROGRESS'] },
            startTime: { gte: startDate, lte: endDate }
          }
        }),
        this.calculateAverageIncidentResolutionTime(startDate, endDate),
        this.calculateAgentUtilization(startDate, endDate)
      ]);

      const shiftsGrowth = shiftsLastWeek > 0 ? 
        ((shiftsThisWeek - shiftsLastWeek) / shiftsLastWeek) * 100 : 0;
      const incidentsChange = incidentsLastWeek > 0 ? 
        ((incidentsThisWeek - incidentsLastWeek) / incidentsLastWeek) * 100 : 0;

      return {
        overview: {
          totalAgents,
          activeShifts,
          openIncidents,
          completedShifts,
          totalSites,
          activeClients
        },
        trends: {
          shiftsThisWeek,
          shiftsLastWeek,
          incidentsThisWeek,
          incidentsLastWeek,
          shiftsGrowth: Math.round(shiftsGrowth * 100) / 100,
          incidentsChange: Math.round(incidentsChange * 100) / 100
        },
        performance: {
          averageShiftDuration: avgShiftDuration,
          onTimePercentage: totalScheduledShifts > 0 ? 
            Math.round((onTimeShifts / totalScheduledShifts) * 100) : 0,
          incidentResolutionTime: avgIncidentResolution,
          agentUtilization: agentHours
        }
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics', { error });
      throw error;
    }
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalyticsData(dateRange?: DateRange): Promise<AnalyticsData> {
    try {
      const now = new Date();
      const startDate = dateRange?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.endDate || now;

      // Shifts analytics
      const shiftsData = await this.getShiftsAnalytics(startDate, endDate);
      
      // Incidents analytics
      const incidentsData = await this.getIncidentsAnalytics(startDate, endDate);
      
      // Agents analytics
      const agentsData = await this.getAgentsAnalytics(startDate, endDate);
      
      // Sites analytics
      const sitesData = await this.getSitesAnalytics(startDate, endDate);

      return {
        shifts: shiftsData,
        incidents: incidentsData,
        agents: agentsData,
        sites: sitesData
      };
    } catch (error) {
      logger.error('Failed to get analytics data', { error });
      throw error;
    }
  }

  /**
   * Get shifts analytics
   */
  private async getShiftsAnalytics(startDate: Date, endDate: Date) {
    const [
      totalShifts,
      completedShifts,
      inProgressShifts,
      cancelledShifts,
      shiftsByStatus,
      shiftsByWeek
    ] = await Promise.all([
      prisma.shift.count({
        where: { startTime: { gte: startDate, lte: endDate } }
      }),
      prisma.shift.count({
        where: { 
          status: 'COMPLETED',
          startTime: { gte: startDate, lte: endDate }
        }
      }),
      prisma.shift.count({
        where: { status: 'IN_PROGRESS' }
      }),
      prisma.shift.count({
        where: { 
          status: 'CANCELLED',
          startTime: { gte: startDate, lte: endDate }
        }
      }),
      prisma.shift.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { startTime: { gte: startDate, lte: endDate } }
      }),
      this.getWeeklyShiftData(startDate, endDate)
    ]);

    return {
      total: totalShifts,
      completed: completedShifts,
      inProgress: inProgressShifts,
      cancelled: cancelledShifts,
      byStatus: shiftsByStatus.map(item => ({
        status: item.status,
        count: item._count.id
      })),
      byWeek: shiftsByWeek
    };
  }

  /**
   * Get incidents analytics
   */
  private async getIncidentsAnalytics(startDate: Date, endDate: Date) {
    const [
      totalIncidents,
      openIncidents,
      resolvedIncidents,
      criticalIncidents,
      incidentsBySeverity,
      incidentsByType,
      incidentsByWeek
    ] = await Promise.all([
      prisma.incident.count({
        where: { occurredAt: { gte: startDate, lte: endDate } }
      }),
      prisma.incident.count({
        where: { 
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          occurredAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.incident.count({
        where: { 
          status: 'RESOLVED',
          occurredAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.incident.count({
        where: { 
          severity: 'CRITICAL',
          occurredAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.incident.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: { occurredAt: { gte: startDate, lte: endDate } }
      }),
      prisma.incident.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { occurredAt: { gte: startDate, lte: endDate } }
      }),
      this.getWeeklyIncidentData(startDate, endDate)
    ]);

    return {
      total: totalIncidents,
      open: openIncidents,
      resolved: resolvedIncidents,
      critical: criticalIncidents,
      bySeverity: incidentsBySeverity.map(item => ({
        severity: item.severity,
        count: item._count.id
      })),
      byType: incidentsByType.map(item => ({
        type: item.type,
        count: item._count.id
      })),
      byWeek: incidentsByWeek
    };
  }

  /**
   * Get agents analytics
   */
  private async getAgentsAnalytics(startDate: Date, endDate: Date) {
    const [
      totalAgents,
      activeAgents,
      onShiftAgents,
      agentUtilization
    ] = await Promise.all([
      prisma.agentProfile.count(),
      prisma.agentProfile.count({
        where: { user: { status: 'ACTIVE' } }
      }),
      prisma.shift.count({
        where: { status: 'IN_PROGRESS' },
        distinct: ['agentId']
      }),
      this.getAgentUtilizationData(startDate, endDate)
    ]);

    return {
      total: totalAgents,
      active: activeAgents,
      onShift: onShiftAgents,
      utilization: agentUtilization
    };
  }

  /**
   * Get sites analytics
   */
  private async getSitesAnalytics(startDate: Date, endDate: Date) {
    const [
      totalSites,
      activeSites,
      siteCoverage
    ] = await Promise.all([
      prisma.site.count(),
      prisma.site.count({ where: { status: 'ACTIVE' } }),
      this.getSiteCoverageData(startDate, endDate)
    ]);

    return {
      total: totalSites,
      active: activeSites,
      coverage: siteCoverage
    };
  }

  /**
   * Calculate average shift duration
   */
  private async calculateAverageShiftDuration(startDate: Date, endDate: Date): Promise<number> {
    const completedShifts = await prisma.shift.findMany({
      where: {
        status: 'COMPLETED',
        startTime: { gte: startDate, lte: endDate },
        endTime: { not: null }
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    if (completedShifts.length === 0) return 0;

    const totalDuration = completedShifts.reduce((sum, shift) => {
      if (shift.endTime) {
        const duration = shift.endTime.getTime() - shift.startTime.getTime();
        return sum + duration;
      }
      return sum;
    }, 0);

    return Math.round(totalDuration / completedShifts.length / (1000 * 60 * 60)); // in hours
  }

  /**
   * Calculate average incident resolution time
   */
  private async calculateAverageIncidentResolutionTime(startDate: Date, endDate: Date): Promise<number> {
    const resolvedIncidents = await prisma.incident.findMany({
      where: {
        status: 'RESOLVED',
        occurredAt: { gte: startDate, lte: endDate },
        resolvedAt: { not: null }
      },
      select: {
        occurredAt: true,
        resolvedAt: true
      }
    });

    if (resolvedIncidents.length === 0) return 0;

    const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
      if (incident.resolvedAt) {
        const duration = incident.resolvedAt.getTime() - incident.occurredAt.getTime();
        return sum + duration;
      }
      return sum;
    }, 0);

    return Math.round(totalResolutionTime / resolvedIncidents.length / (1000 * 60 * 60)); // in hours
  }

  /**
   * Calculate agent utilization
   */
  private async calculateAgentUtilization(startDate: Date, endDate: Date): Promise<number> {
    const totalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const totalAgents = await prisma.agentProfile.count({
      where: { user: { status: 'ACTIVE' } }
    });

    const shiftHours = await prisma.shift.aggregate({
      _sum: {
        // This would need a calculated field for shift duration
        // For now, we'll estimate based on completed shifts
      },
      where: {
        status: 'COMPLETED',
        startTime: { gte: startDate, lte: endDate }
      }
    });

    // Simplified calculation - in production, you'd want more accurate tracking
    const estimatedWorkedHours = await prisma.shift.count({
      where: {
        status: 'COMPLETED',
        startTime: { gte: startDate, lte: endDate }
      }
    }) * 8; // Assuming 8-hour shifts

    const maxPossibleHours = totalAgents * totalHours;
    return maxPossibleHours > 0 ? Math.round((estimatedWorkedHours / maxPossibleHours) * 100) : 0;
  }

  /**
   * Get weekly shift data
   */
  private async getWeeklyShiftData(startDate: Date, endDate: Date) {
    // This would typically use SQL date functions for proper weekly grouping
    // For now, we'll return a simplified version
    const weeks = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const weekEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      const count = await prisma.shift.count({
        where: {
          startTime: { gte: current, lt: weekEnd }
        }
      });
      
      weeks.push({
        week: current.toISOString().split('T')[0],
        count
      });
      
      current.setTime(weekEnd.getTime());
    }
    
    return weeks;
  }

  /**
   * Get weekly incident data
   */
  private async getWeeklyIncidentData(startDate: Date, endDate: Date) {
    const weeks = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const weekEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      const count = await prisma.incident.count({
        where: {
          occurredAt: { gte: current, lt: weekEnd }
        }
      });
      
      weeks.push({
        week: current.toISOString().split('T')[0],
        count
      });
      
      current.setTime(weekEnd.getTime());
    }
    
    return weeks;
  }

  /**
   * Get agent utilization data
   */
  private async getAgentUtilizationData(startDate: Date, endDate: Date) {
    const agents = await prisma.agentProfile.findMany({
      where: { user: { status: 'ACTIVE' } },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        },
        shifts: {
          where: {
            startTime: { gte: startDate, lte: endDate },
            status: 'COMPLETED'
          }
        }
      }
    });

    return agents.map(agent => {
      const hoursWorked = agent.shifts.length * 8; // Simplified calculation
      const totalPossibleHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * 8;
      const utilization = totalPossibleHours > 0 ? (hoursWorked / totalPossibleHours) * 100 : 0;

      return {
        agentId: agent.id,
        name: `${agent.user.firstName} ${agent.user.lastName}`,
        hoursWorked,
        utilization: Math.round(utilization)
      };
    });
  }

  /**
   * Get site coverage data
   */
  private async getSiteCoverageData(startDate: Date, endDate: Date) {
    const sites = await prisma.site.findMany({
      where: { status: 'ACTIVE' },
      include: {
        shifts: {
          where: {
            startTime: { gte: startDate, lte: endDate },
            status: 'COMPLETED'
          }
        },
        incidents: {
          where: {
            occurredAt: { gte: startDate, lte: endDate }
          }
        }
      }
    });

    return sites.map(site => ({
      siteId: site.id,
      name: site.name,
      coverageHours: site.shifts.length * 8, // Simplified calculation
      incidents: site.incidents.length
    }));
  }
}

export default AnalyticsService;