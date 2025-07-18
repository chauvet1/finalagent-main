import { PrismaClient } from '@prisma/client';
export interface AnalyticsQuery {
    id: string;
    name: string;
    description: string;
    query: string;
    parameters: Record<string, any>;
    cacheKey?: string;
    cacheTTL?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface AnalyticsResult {
    queryId: string;
    data: any[];
    metadata: {
        queryId?: string;
        totalRows: number;
        executionTime: number;
        cacheHit: boolean;
        generatedAt: Date;
    };
    aggregations?: Record<string, number>;
    trends?: Array<{
        period: string;
        value: number;
        change: number;
        changePercent: number;
    }>;
}
export interface KPIDefinition {
    id: string;
    name: string;
    description: string;
    formula: string;
    target: number;
    unit: string;
    category: 'operational' | 'financial' | 'quality' | 'safety';
    frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    dependencies: string[];
    thresholds: {
        critical: number;
        warning: number;
        good: number;
        excellent: number;
    };
}
export interface Dashboard {
    id: string;
    name: string;
    description: string;
    layout?: Record<string, any>;
    widgets: Array<{
        id: string;
        type: 'chart' | 'metric' | 'table' | 'map' | 'gauge';
        title: string;
        queryId: string;
        configuration: Record<string, any>;
        config?: Record<string, any>;
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    filters: Array<{
        id: string;
        name: string;
        type: 'date' | 'select' | 'multiselect' | 'text';
        options?: string[];
        defaultValue?: any;
    }>;
    permissions: {
        viewRoles: string[];
        editRoles: string[];
    };
    isPublic: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
declare class AnalyticsEngine {
    private prisma;
    private queries;
    private kpis;
    private dashboards;
    private queryCache;
    constructor(prisma: PrismaClient);
    private initializeDefaultQueries;
    private initializeDefaultKPIs;
    executeQuery(queryId: string, parameters?: Record<string, any>, useCache?: boolean): Promise<AnalyticsResult>;
    calculateKPI(kpiId: string, parameters?: Record<string, any>): Promise<{
        value: number;
        target: number;
        status: 'critical' | 'warning' | 'good' | 'excellent';
        trend: 'up' | 'down' | 'stable';
        previousValue?: number;
    }>;
    createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
    generateReport(dashboardId: string, parameters?: Record<string, any>, format?: 'json' | 'pdf' | 'excel'): Promise<Buffer | object>;
    getRealtimeMetrics(): Promise<Record<string, any>>;
    private executeRawQuery;
    private calculateAggregations;
    private calculateTrends;
    private getNumericFields;
    private getCachedResult;
    private cacheResult;
    private evaluateKPIFormula;
    private getKPIStatus;
    private getPreviousKPIValue;
    private calculateKPITrend;
    private storeDashboard;
    private generatePDFReport;
    private generateExcelReport;
    private startCacheCleanup;
    private cleanupCache;
}
export default AnalyticsEngine;
//# sourceMappingURL=analyticsEngine.d.ts.map