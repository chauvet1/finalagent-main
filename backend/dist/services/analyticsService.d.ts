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
        byStatus: Array<{
            status: string;
            count: number;
        }>;
        byWeek: Array<{
            week: string;
            count: number;
        }>;
    };
    incidents: {
        total: number;
        open: number;
        resolved: number;
        critical: number;
        bySeverity: Array<{
            severity: string;
            count: number;
        }>;
        byType: Array<{
            type: string;
            count: number;
        }>;
        byWeek: Array<{
            week: string;
            count: number;
        }>;
    };
    agents: {
        total: number;
        active: number;
        onShift: number;
        utilization: Array<{
            agentId: string;
            name: string;
            hoursWorked: number;
            utilization: number;
        }>;
    };
    sites: {
        total: number;
        active: number;
        coverage: Array<{
            siteId: string;
            name: string;
            coverageHours: number;
            incidents: number;
        }>;
    };
}
export declare class AnalyticsService {
    private static instance;
    static getInstance(): AnalyticsService;
    getDashboardMetrics(dateRange?: DateRange): Promise<DashboardMetrics>;
    getAnalyticsData(dateRange?: DateRange): Promise<AnalyticsData>;
    private getShiftsAnalytics;
    private getIncidentsAnalytics;
    private getAgentsAnalytics;
    private getSitesAnalytics;
    private calculateAverageShiftDuration;
    private calculateAverageIncidentResolutionTime;
    private calculateAgentUtilization;
    private getWeeklyShiftData;
    private getWeeklyIncidentData;
    private getAgentUtilizationData;
    private getSiteCoverageData;
}
export default AnalyticsService;
//# sourceMappingURL=analyticsService.d.ts.map