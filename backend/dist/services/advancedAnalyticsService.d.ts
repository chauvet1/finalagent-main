export interface AdvancedAnalyticsQuery {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    dateRange: {
        start: Date;
        end: Date;
    };
    groupBy?: string[];
    orderBy?: {
        field: string;
        direction: 'asc' | 'desc';
    }[];
    limit?: number;
    offset?: number;
}
export interface PredictiveModel {
    id: string;
    name: string;
    type: 'DEMAND_FORECASTING' | 'INCIDENT_PREDICTION' | 'RESOURCE_OPTIMIZATION' | 'RISK_ASSESSMENT';
    algorithm: string;
    accuracy: number;
    lastTrained: Date;
    isActive: boolean;
    parameters: Record<string, any>;
}
export interface AnalyticsData {
    totalAgents: number;
    activeShifts: number;
    completedShifts: number;
    incidents: number;
    averageResponseTime: number;
    siteUtilization: number;
    agentPerformance: any[];
    shiftDistribution: any[];
    incidentTrends: any[];
    revenueMetrics: any;
}
export interface PredictiveAnalytics {
    forecast: Array<{
        date: Date;
        value: number;
        confidence: number;
    }>;
    riskAssessment: Array<{
        siteId: string;
        riskScore: number;
        predictedIncidentType: string;
        timeWindow: string;
        confidence: number;
    }>;
    optimization: {
        recommendations: Array<{
            siteId: string;
            siteName: string;
            currentAgents: number;
            recommendedAgents: number;
            action: string;
            impact: number;
        }>;
    };
}
export declare class AdvancedAnalyticsService {
    private static instance;
    private models;
    private prisma;
    private constructor();
    static getInstance(): AdvancedAnalyticsService;
    private initializeModels;
    executeAdvancedQuery(query: AdvancedAnalyticsQuery): Promise<any>;
    private buildDynamicQuery;
    private determineTableFromMetrics;
    private buildWhereClause;
    generateForecast(modelId: string, parameters: Record<string, any>): Promise<any>;
    private generateDemandForecast;
    private generateIncidentPrediction;
    private generateResourceOptimization;
    private applyARIMAModel;
    private applyIncidentPredictionModel;
    private applyResourceOptimization;
    private getHistoricalDemandData;
    private calculateTrend;
    private calculateSeasonality;
    private getIncidentWeight;
    private predictIncidentType;
    private calculateRequiredAgents;
    getRealtimeMetrics(): Promise<any>;
    exportAnalytics(format: 'CSV' | 'PDF' | 'EXCEL', query: AdvancedAnalyticsQuery): Promise<Buffer>;
    private exportToCSV;
    private exportToPDF;
    private exportToExcel;
    private convertToCSV;
    getComprehensiveAnalytics(siteId?: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<AnalyticsData>;
    getPredictiveAnalytics(siteId?: string): Promise<PredictiveAnalytics>;
    private getTotalAgents;
    private getActiveShifts;
    private getCompletedShifts;
    private getIncidentCount;
    private calculateAverageResponseTime;
    private calculateSiteUtilization;
    private getAgentPerformance;
    private getShiftDistribution;
    private getIncidentTrends;
    private calculateRevenueMetrics;
    private assessRisk;
    private generateOptimizationRecommendations;
}
export declare const advancedAnalyticsService: AdvancedAnalyticsService;
//# sourceMappingURL=advancedAnalyticsService.d.ts.map