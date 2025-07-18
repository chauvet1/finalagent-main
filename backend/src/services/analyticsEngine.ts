import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
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
    position: { x: number; y: number; width: number; height: number };
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

class AnalyticsEngine {
  private prisma: PrismaClient;
  private queries: Map<string, AnalyticsQuery> = new Map();
  private kpis: Map<string, KPIDefinition> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private queryCache: Map<string, { result: AnalyticsResult; expiry: number }> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  constructor() {
    this.initializeDefaultQueries();
    this.initializeDefaultKPIs();
    this.startCacheCleanup();
  }

  private initializeDefaultQueries(): void {
    const defaultQueries: AnalyticsQuery[] = [
      {
        id: 'shifts_by_status',
        name: 'Shifts by Status',
        description: 'Count of shifts grouped by status',
        query: `
          SELECT status, COUNT(*) as count
          FROM shifts
          WHERE created_at >= :startDate AND created_at <= :endDate
          GROUP BY status
          ORDER BY count DESC
        `,
        parameters: { startDate: null, endDate: null },
        cacheKey: 'shifts_by_status',
        cacheTTL: 300, // 5 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'agent_performance',
        name: 'Agent Performance Metrics',
        description: 'Performance metrics for agents including completion rates and quality scores',
        query: `
          SELECT 
            a.id as agent_id,
            u.username,
            COUNT(s.id) as total_shifts,
            COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_shifts,
            AVG(s.quality_score) as avg_quality_score,
            AVG(EXTRACT(EPOCH FROM (s.actual_end_time - s.actual_start_time))/3600) as avg_shift_duration
          FROM agents a
          JOIN users u ON a.user_id = u.id
          LEFT JOIN shifts s ON a.id = s.agent_id
          WHERE s.created_at >= :startDate AND s.created_at <= :endDate
          GROUP BY a.id, u.username
          ORDER BY avg_quality_score DESC
        `,
        parameters: { startDate: null, endDate: null },
        cacheKey: 'agent_performance',
        cacheTTL: 600, // 10 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'incident_trends',
        name: 'Incident Trends',
        description: 'Incident reports over time with severity breakdown',
        query: `
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            priority,
            COUNT(*) as incident_count
          FROM reports
          WHERE type = 'incident' 
            AND created_at >= :startDate 
            AND created_at <= :endDate
          GROUP BY DATE_TRUNC('day', created_at), priority
          ORDER BY date, priority
        `,
        parameters: { startDate: null, endDate: null },
        cacheKey: 'incident_trends',
        cacheTTL: 900, // 15 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'site_utilization',
        name: 'Site Utilization',
        description: 'Site coverage and utilization metrics',
        query: `
          SELECT 
            st.id as site_id,
            st.name as site_name,
            COUNT(s.id) as total_shifts,
            SUM(EXTRACT(EPOCH FROM (s.actual_end_time - s.actual_start_time))/3600) as total_hours,
            AVG(s.quality_score) as avg_quality_score,
            COUNT(r.id) as total_reports
          FROM sites st
          LEFT JOIN shifts s ON st.id = s.site_id
          LEFT JOIN reports r ON st.id = r.site_id
          WHERE s.created_at >= :startDate AND s.created_at <= :endDate
          GROUP BY st.id, st.name
          ORDER BY total_hours DESC
        `,
        parameters: { startDate: null, endDate: null },
        cacheKey: 'site_utilization',
        cacheTTL: 1800, // 30 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultQueries.forEach(query => {
      this.queries.set(query.id, query);
    });
  }

  private initializeDefaultKPIs(): void {
    const defaultKPIs: KPIDefinition[] = [
      {
        id: 'shift_completion_rate',
        name: 'Shift Completion Rate',
        description: 'Percentage of shifts completed successfully',
        formula: '(completed_shifts / total_shifts) * 100',
        target: 95,
        unit: '%',
        category: 'operational',
        frequency: 'daily',
        dependencies: ['shifts_by_status'],
        thresholds: {
          critical: 80,
          warning: 85,
          good: 90,
          excellent: 95,
        },
      },
      {
        id: 'average_response_time',
        name: 'Average Emergency Response Time',
        description: 'Average time to respond to emergency alerts',
        formula: 'AVG(response_time_minutes)',
        target: 5,
        unit: 'minutes',
        category: 'safety',
        frequency: 'real-time',
        dependencies: ['emergency_responses'],
        thresholds: {
          critical: 15,
          warning: 10,
          good: 7,
          excellent: 5,
        },
      },
      {
        id: 'agent_utilization',
        name: 'Agent Utilization Rate',
        description: 'Percentage of available agent hours utilized',
        formula: '(worked_hours / available_hours) * 100',
        target: 85,
        unit: '%',
        category: 'operational',
        frequency: 'daily',
        dependencies: ['agent_performance'],
        thresholds: {
          critical: 60,
          warning: 70,
          good: 80,
          excellent: 85,
        },
      },
      {
        id: 'incident_resolution_rate',
        name: 'Incident Resolution Rate',
        description: 'Percentage of incidents resolved within SLA',
        formula: '(resolved_within_sla / total_incidents) * 100',
        target: 90,
        unit: '%',
        category: 'quality',
        frequency: 'daily',
        dependencies: ['incident_trends'],
        thresholds: {
          critical: 70,
          warning: 80,
          good: 85,
          excellent: 90,
        },
      },
    ];

    defaultKPIs.forEach(kpi => {
      this.kpis.set(kpi.id, kpi);
    });
  }

  public async executeQuery(
    queryId: string,
    parameters: Record<string, any> = {},
    useCache: boolean = true
  ): Promise<AnalyticsResult> {
    try {
      const query = this.queries.get(queryId);
      if (!query) {
        throw new Error(`Query not found: ${queryId}`);
      }

      // Check cache first
      if (useCache && query.cacheKey) {
        const cached = await this.getCachedResult(query.cacheKey, parameters);
        if (cached) {
          return cached;
        }
      }

      const startTime = Date.now();

      // Execute query with parameters
      const data = await this.executeRawQuery(query.query, { ...query.parameters, ...parameters });

      const executionTime = Date.now() - startTime;

      // Calculate aggregations
      const aggregations = this.calculateAggregations(data);

      // Calculate trends if applicable
      const trends = this.calculateTrends(data);

      const result: AnalyticsResult = {
        queryId,
        data,
        metadata: {
          totalRows: data.length,
          executionTime,
          cacheHit: false,
          generatedAt: new Date(),
        },
        aggregations,
        trends,
      };

      // Cache result
      if (query.cacheKey && query.cacheTTL) {
        await this.cacheResult(query.cacheKey, parameters, result, query.cacheTTL);
      }

      logger.info(`Analytics query executed: ${queryId}, rows: ${data.length}, time: ${executionTime}ms`);
      return result;

    } catch (error) {
      logger.error(`Analytics query failed: ${queryId}`, error);
      throw error;
    }
  }

  public async calculateKPI(kpiId: string, parameters: Record<string, any> = {}): Promise<{
    value: number;
    target: number;
    status: 'critical' | 'warning' | 'good' | 'excellent';
    trend: 'up' | 'down' | 'stable';
    previousValue?: number;
  }> {
    try {
      const kpi = this.kpis.get(kpiId);
      if (!kpi) {
        throw new Error(`KPI not found: ${kpiId}`);
      }

      // Execute dependent queries
      const dependencyResults = await Promise.all(
        kpi.dependencies.map(dep => this.executeQuery(dep, parameters))
      );

      // Calculate KPI value based on formula
      const value = await this.evaluateKPIFormula(kpi.formula, dependencyResults);

      // Determine status based on thresholds
      const status = this.getKPIStatus(value, kpi.thresholds);

      // Calculate trend (compare with previous period)
      const previousValue = await this.getPreviousKPIValue(kpiId, parameters);
      const trend = this.calculateKPITrend(value, previousValue);

      return {
        value,
        target: kpi.target,
        status,
        trend,
        previousValue,
      };

    } catch (error) {
      logger.error(`KPI calculation failed: ${kpiId}`, error);
      throw error;
    }
  }

  public async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newDashboard: Dashboard = {
        ...dashboard,
        id: dashboardId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.dashboards.set(dashboardId, newDashboard);
      
      // Store in database
      await this.storeDashboard(newDashboard);

      logger.info(`Dashboard created: ${dashboardId}`);
      return dashboardId;

    } catch (error) {
      logger.error('Dashboard creation failed:', error);
      throw error;
    }
  }

  public async generateReport(
    dashboardId: string,
    parameters: Record<string, any> = {},
    format: 'json' | 'pdf' | 'excel' = 'json'
  ): Promise<Buffer | object> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      // Execute all widget queries
      const widgetResults = await Promise.all(
        dashboard.widgets.map(async widget => {
          const result = await this.executeQuery(widget.queryId, parameters);
          return {
            widget,
            result,
          };
        })
      );

      const reportData = {
        dashboard,
        widgets: widgetResults,
        parameters,
        generatedAt: new Date(),
      };

      switch (format) {
        case 'json':
          return reportData;
        case 'pdf':
          return await this.generatePDFReport(reportData);
        case 'excel':
          return await this.generateExcelReport(reportData);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

    } catch (error) {
      logger.error('Report generation failed:', error);
      throw error;
    }
  }

  public async getRealtimeMetrics(): Promise<Record<string, any>> {
    try {
      const realtimeKPIs = Array.from(this.kpis.values())
        .filter(kpi => kpi.frequency === 'real-time');

      const metrics = await Promise.all(
        realtimeKPIs.map(async kpi => {
          const result = await this.calculateKPI(kpi.id);
          return { [kpi.id]: result };
        })
      );

      return Object.assign({}, ...metrics);

    } catch (error) {
      logger.error('Real-time metrics failed:', error);
      throw error;
    }
  }

  // Private helper methods
  private async executeRawQuery(query: string, parameters: Record<string, any>): Promise<any[]> {
    try {
      // Replace parameter placeholders in the query
      let processedQuery = query;
      Object.entries(parameters).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        if (typeof value === 'string') {
          processedQuery = processedQuery.replace(placeholder, `'${value}'`);
        } else {
          processedQuery = processedQuery.replace(placeholder, String(value));
        }
      });
      
      logger.info('Executing analytics query:', { query: processedQuery });
      
      // Execute the raw SQL query using Prisma
      const result = await this.prisma.$queryRawUnsafe(processedQuery);
      
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      logger.error('Failed to execute raw query:', { error, query, parameters });
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateAggregations(data: any[]): Record<string, number> {
    if (data.length === 0) return {};

    const aggregations: Record<string, number> = {};
    const numericFields = this.getNumericFields(data[0]);

    numericFields.forEach(field => {
      const values = data.map(row => row[field]).filter(val => typeof val === 'number');
      if (values.length > 0) {
        aggregations[`${field}_sum`] = values.reduce((sum, val) => sum + val, 0);
        aggregations[`${field}_avg`] = aggregations[`${field}_sum`] / values.length;
        aggregations[`${field}_min`] = Math.min(...values);
        aggregations[`${field}_max`] = Math.max(...values);
      }
    });

    return aggregations;
  }

  private calculateTrends(data: any[]): Array<{ period: string; value: number; change: number; changePercent: number }> {
    if (data.length < 2) return [];
    
    const trends: Array<{ period: string; value: number; change: number; changePercent: number }> = [];
    
    // Sort data by period (assuming there's a date/period field)
    const sortedData = data.sort((a, b) => {
      const dateA = new Date(a.period || a.date || a.createdAt);
      const dateB = new Date(b.period || b.date || b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Calculate trends for numeric fields
    const numericFields = this.getNumericFields(sortedData[0]);
    const primaryField = numericFields[0] || 'value';
    
    for (let i = 1; i < sortedData.length; i++) {
      const current = sortedData[i];
      const previous = sortedData[i - 1];
      
      const currentValue = current[primaryField] || 0;
      const previousValue = previous[primaryField] || 0;
      
      const change = currentValue - previousValue;
      const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
      
      trends.push({
        period: current.period || current.date || current.createdAt,
        value: currentValue,
        change,
        changePercent: Math.round(changePercent * 100) / 100,
      });
    }
    
    return trends;
  }

  private getNumericFields(row: any): string[] {
    return Object.keys(row).filter(key => typeof row[key] === 'number');
  }

  private async getCachedResult(cacheKey: string, parameters: Record<string, any>): Promise<AnalyticsResult | null> {
    try {
      const key = `analytics:${cacheKey}:${JSON.stringify(parameters)}`;
      const cached = await redisClient.get(key);
      
      if (cached) {
        const result = JSON.parse(cached);
        result.metadata.cacheHit = true;
        return result;
      }
    } catch (error) {
      logger.error('Cache retrieval failed:', error);
    }
    
    return null;
  }

  private async cacheResult(
    cacheKey: string,
    parameters: Record<string, any>,
    result: AnalyticsResult,
    ttl: number
  ): Promise<void> {
    try {
      const key = `analytics:${cacheKey}:${JSON.stringify(parameters)}`;
      await redisClient.setex(key, ttl, JSON.stringify(result));
    } catch (error) {
      logger.error('Cache storage failed:', error);
    }
  }

  private async evaluateKPIFormula(formula: string, dependencyResults: AnalyticsResult[]): Promise<number> {
    try {
      // Create a context with dependency results
      const context: Record<string, any> = {};
      
      dependencyResults.forEach((result, index) => {
        context[`dep${index}`] = result.data;
        context[`agg${index}`] = result.aggregations;
        
        // Also add by query ID if available
        if (result.metadata.queryId) {
          context[result.metadata.queryId] = result.data;
        }
      });
      
      // Add common mathematical functions
      context.SUM = (arr: number[]) => arr.reduce((sum, val) => sum + val, 0);
      context.AVG = (arr: number[]) => arr.length > 0 ? context.SUM(arr) / arr.length : 0;
      context.MIN = (arr: number[]) => Math.min(...arr);
      context.MAX = (arr: number[]) => Math.max(...arr);
      context.COUNT = (arr: any[]) => arr.length;
      
      // Simple formula evaluation (in production, use a proper expression parser)
      let processedFormula = formula;
      
      // Replace context variables
      Object.entries(context).forEach(([key, value]) => {
        if (typeof value === 'number') {
          processedFormula = processedFormula.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
        }
      });
      
      // Evaluate basic mathematical expressions
      // WARNING: In production, use a safe expression evaluator
      const result = Function(`"use strict"; return (${processedFormula})`)();
      
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      logger.error('Failed to evaluate KPI formula:', { error, formula });
      return 0;
    }
  }

  private getKPIStatus(value: number, thresholds: KPIDefinition['thresholds']): 'critical' | 'warning' | 'good' | 'excellent' {
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'critical';
  }

  private async getPreviousKPIValue(kpiId: string, parameters: Record<string, any>): Promise<number | undefined> {
    try {
      // Calculate previous period parameters
      const previousParams = { ...parameters };
      
      if (parameters.startDate && parameters.endDate) {
        const startDate = new Date(parameters.startDate);
        const endDate = new Date(parameters.endDate);
        const periodLength = endDate.getTime() - startDate.getTime();
        
        previousParams.startDate = new Date(startDate.getTime() - periodLength);
        previousParams.endDate = new Date(startDate.getTime());
      }
      
      // Get previous KPI value from cache or calculate
      const cacheKey = `kpi_previous_${kpiId}_${JSON.stringify(previousParams)}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return parseFloat(cached);
      }
      
      // Calculate previous KPI value
      const previousResult = await this.calculateKPI(kpiId, previousParams);
      
      // Cache the result
      await redisClient.setex(cacheKey, 3600, String(previousResult.value)); // Cache for 1 hour
      
      return previousResult.value;
    } catch (error) {
      logger.error('Failed to get previous KPI value:', { error, kpiId });
      return undefined;
    }
  }

  private calculateKPITrend(current: number, previous?: number): 'up' | 'down' | 'stable' {
    if (!previous) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private async storeDashboard(dashboard: Dashboard): Promise<void> {
    try {
      await this.prisma.analyticsDashboard.create({
        data: {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          filters: dashboard.filters || {},
          permissions: dashboard.permissions || {},
          createdAt: dashboard.createdAt,
          updatedAt: dashboard.updatedAt,
        },
      });
      
      // Store dashboard widgets
      if (dashboard.widgets && dashboard.widgets.length > 0) {
        await this.prisma.analyticsDashboardWidget.createMany({
          data: dashboard.widgets.map(widget => ({
            id: widget.id,
            dashboardId: dashboard.id,
            queryId: widget.queryId,
            title: widget.title,
            type: widget.type,
            position: widget.position || {},
            config: widget.config || {},
            createdAt: new Date(),
          })),
        });
      }
    } catch (error) {
      logger.error('Failed to store dashboard:', error);
      throw error;
    }
  }

  private async generatePDFReport(reportData: any): Promise<Buffer> {
    try {
      // In production, use a proper PDF generation library like puppeteer or jsPDF
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        
        doc.on('error', reject);
        
        // Generate PDF content
        doc.fontSize(20).text(reportData.dashboard.name, 50, 50);
        doc.fontSize(12).text(`Generated: ${reportData.generatedAt.toISOString()}`, 50, 80);
        
        let yPosition = 120;
        
        reportData.widgets.forEach((widget: any, index: number) => {
          doc.fontSize(16).text(widget.widget.title, 50, yPosition);
          yPosition += 30;
          
          // Add widget data summary
          if (widget.result.data && widget.result.data.length > 0) {
            doc.fontSize(10).text(`Records: ${widget.result.data.length}`, 50, yPosition);
            yPosition += 20;
            
            // Add aggregations if available
            if (widget.result.aggregations) {
              Object.entries(widget.result.aggregations).forEach(([key, value]) => {
                doc.text(`${key}: ${value}`, 50, yPosition);
                yPosition += 15;
              });
            }
          }
          
          yPosition += 20;
          
          // Add new page if needed
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
        });
        
        doc.end();
      });
    } catch (error) {
      logger.error('Failed to generate PDF report:', error);
      return Buffer.from('PDF generation failed');
    }
  }

  private async generateExcelReport(reportData: any): Promise<Buffer> {
    try {
      // In production, use a proper Excel generation library like exceljs
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Create summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Dashboard', reportData.dashboard.name]);
      summarySheet.addRow(['Generated', reportData.generatedAt.toISOString()]);
      summarySheet.addRow([]);
      
      // Add widget data sheets
      reportData.widgets.forEach((widget: any, index: number) => {
        const sheet = workbook.addWorksheet(widget.widget.title.substring(0, 30));
        
        if (widget.result.data && widget.result.data.length > 0) {
          // Add headers
          const headers = Object.keys(widget.result.data[0]);
          sheet.addRow(headers);
          
          // Add data rows
          widget.result.data.forEach((row: any) => {
            const values = headers.map(header => row[header]);
            sheet.addRow(values);
          });
          
          // Add aggregations if available
          if (widget.result.aggregations) {
            sheet.addRow([]);
            sheet.addRow(['Aggregations']);
            Object.entries(widget.result.aggregations).forEach(([key, value]) => {
              sheet.addRow([key, value]);
            });
          }
        }
      });
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Failed to generate Excel report:', error);
      return Buffer.from('Excel generation failed');
    }
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (value.expiry <= now) {
        this.queryCache.delete(key);
      }
    }
  }
}

export default AnalyticsEngine;
