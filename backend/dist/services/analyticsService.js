"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class AnalyticsService {
    static getInstance() {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }
    async getDashboardMetrics(dateRange) {
        try {
            const now = new Date();
            const startDate = dateRange?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const endDate = dateRange?.endDate || now;
            const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const lastWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const [totalAgents, activeShifts, openIncidents, completedShifts, totalSites, activeClients] = await Promise.all([
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
            const [shiftsThisWeek, shiftsLastWeek, incidentsThisWeek, incidentsLastWeek] = await Promise.all([
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
            const [avgShiftDuration, onTimeShifts, totalScheduledShifts, avgIncidentResolution, agentHours] = await Promise.all([
                this.calculateAverageShiftDuration(startDate, endDate),
                prisma.shift.count({
                    where: {
                        status: 'COMPLETED',
                        startTime: { gte: startDate, lte: endDate },
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get dashboard metrics', { error });
            throw error;
        }
    }
    async getAnalyticsData(dateRange) {
        try {
            const now = new Date();
            const startDate = dateRange?.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const endDate = dateRange?.endDate || now;
            const shiftsData = await this.getShiftsAnalytics(startDate, endDate);
            const incidentsData = await this.getIncidentsAnalytics(startDate, endDate);
            const agentsData = await this.getAgentsAnalytics(startDate, endDate);
            const sitesData = await this.getSitesAnalytics(startDate, endDate);
            return {
                shifts: shiftsData,
                incidents: incidentsData,
                agents: agentsData,
                sites: sitesData
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get analytics data', { error });
            throw error;
        }
    }
    async getShiftsAnalytics(startDate, endDate) {
        const [totalShifts, completedShifts, inProgressShifts, cancelledShifts, shiftsByStatus, shiftsByWeek] = await Promise.all([
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
    async getIncidentsAnalytics(startDate, endDate) {
        const [totalIncidents, openIncidents, resolvedIncidents, criticalIncidents, incidentsBySeverity, incidentsByType, incidentsByWeek] = await Promise.all([
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
    async getAgentsAnalytics(startDate, endDate) {
        const [totalAgents, activeAgents, onShiftAgents, agentUtilization] = await Promise.all([
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
    async getSitesAnalytics(startDate, endDate) {
        const [totalSites, activeSites, siteCoverage] = await Promise.all([
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
    async calculateAverageShiftDuration(startDate, endDate) {
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
        if (completedShifts.length === 0)
            return 0;
        const totalDuration = completedShifts.reduce((sum, shift) => {
            if (shift.endTime) {
                const duration = shift.endTime.getTime() - shift.startTime.getTime();
                return sum + duration;
            }
            return sum;
        }, 0);
        return Math.round(totalDuration / completedShifts.length / (1000 * 60 * 60));
    }
    async calculateAverageIncidentResolutionTime(startDate, endDate) {
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
        if (resolvedIncidents.length === 0)
            return 0;
        const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
            if (incident.resolvedAt) {
                const duration = incident.resolvedAt.getTime() - incident.occurredAt.getTime();
                return sum + duration;
            }
            return sum;
        }, 0);
        return Math.round(totalResolutionTime / resolvedIncidents.length / (1000 * 60 * 60));
    }
    async calculateAgentUtilization(startDate, endDate) {
        const totalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const totalAgents = await prisma.agentProfile.count({
            where: { user: { status: 'ACTIVE' } }
        });
        const shiftHours = await prisma.shift.aggregate({
            _sum: {},
            where: {
                status: 'COMPLETED',
                startTime: { gte: startDate, lte: endDate }
            }
        });
        const estimatedWorkedHours = await prisma.shift.count({
            where: {
                status: 'COMPLETED',
                startTime: { gte: startDate, lte: endDate }
            }
        }) * 8;
        const maxPossibleHours = totalAgents * totalHours;
        return maxPossibleHours > 0 ? Math.round((estimatedWorkedHours / maxPossibleHours) * 100) : 0;
    }
    async getWeeklyShiftData(startDate, endDate) {
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
    async getWeeklyIncidentData(startDate, endDate) {
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
    async getAgentUtilizationData(startDate, endDate) {
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
            const hoursWorked = agent.shifts.length * 8;
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
    async getSiteCoverageData(startDate, endDate) {
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
            coverageHours: site.shifts.length * 8,
            incidents: site.incidents.length
        }));
    }
}
exports.AnalyticsService = AnalyticsService;
exports.default = AnalyticsService;
//# sourceMappingURL=analyticsService.js.map