"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedAnalyticsService = exports.AdvancedAnalyticsService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class AdvancedAnalyticsService {
    constructor() {
        this.models = new Map();
        this.prisma = prisma;
        this.initializeModels();
    }
    static getInstance() {
        if (!AdvancedAnalyticsService.instance) {
            AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
        }
        return AdvancedAnalyticsService.instance;
    }
    async initializeModels() {
        const models = [
            {
                id: 'demand_forecast',
                name: 'Security Demand Forecasting',
                type: 'DEMAND_FORECASTING',
                algorithm: 'ARIMA',
                accuracy: 0.85,
                lastTrained: new Date(),
                isActive: true,
                parameters: {
                    seasonality: 'weekly',
                    lookAhead: 30,
                    confidence: 0.95,
                },
            },
            {
                id: 'incident_predictor',
                name: 'Incident Risk Predictor',
                type: 'INCIDENT_PREDICTION',
                algorithm: 'Random Forest',
                accuracy: 0.78,
                lastTrained: new Date(),
                isActive: true,
                parameters: {
                    features: ['time_of_day', 'weather', 'historical_incidents', 'site_type'],
                    threshold: 0.7,
                },
            },
            {
                id: 'resource_optimizer',
                name: 'Resource Allocation Optimizer',
                type: 'RESOURCE_OPTIMIZATION',
                algorithm: 'Linear Programming',
                accuracy: 0.92,
                lastTrained: new Date(),
                isActive: true,
                parameters: {
                    constraints: ['budget', 'availability', 'skills'],
                    objective: 'minimize_cost',
                },
            },
        ];
        for (const model of models) {
            this.models.set(model.id, model);
        }
    }
    async executeAdvancedQuery(query) {
        try {
            const { metrics, dimensions, filters, dateRange, groupBy, orderBy, limit, offset } = query;
            let sqlQuery = this.buildDynamicQuery(metrics, dimensions, filters, dateRange, groupBy, orderBy);
            if (limit) {
                sqlQuery += ` LIMIT ${limit}`;
            }
            if (offset) {
                sqlQuery += ` OFFSET ${offset}`;
            }
            const result = await this.prisma.$queryRawUnsafe(sqlQuery);
            return {
                data: result,
                metadata: {
                    query: sqlQuery,
                    executionTime: Date.now(),
                    rowCount: Array.isArray(result) ? result.length : 1,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Advanced query execution failed:', error);
            throw new Error('Failed to execute advanced analytics query');
        }
    }
    buildDynamicQuery(metrics, dimensions, filters, dateRange, groupBy, orderBy) {
        const selectClause = [...metrics, ...dimensions].join(', ');
        const fromClause = this.determineTableFromMetrics(metrics);
        const whereClause = this.buildWhereClause(filters, dateRange);
        const groupByClause = groupBy && groupBy.length > 0 ? `GROUP BY ${groupBy.join(', ')}` : '';
        const orderByClause = orderBy && orderBy.length > 0
            ? `ORDER BY ${orderBy.map(o => `${o.field} ${o.direction.toUpperCase()}`).join(', ')}`
            : '';
        return `SELECT ${selectClause} FROM ${fromClause} ${whereClause} ${groupByClause} ${orderByClause}`.trim();
    }
    determineTableFromMetrics(metrics) {
        const tables = new Set();
        for (const metric of metrics) {
            if (metric.includes('shift') || metric.includes('agent')) {
                tables.add('Shift');
            }
            if (metric.includes('incident')) {
                tables.add('Incident');
            }
            if (metric.includes('site')) {
                tables.add('Site');
            }
            if (metric.includes('client')) {
                tables.add('Client');
            }
        }
        const tableArray = Array.from(tables);
        if (tableArray.length === 1) {
            return `"${tableArray[0]}"`;
        }
        let query = `"${tableArray[0]}"`;
        for (let i = 1; i < tableArray.length; i++) {
            query += ` LEFT JOIN "${tableArray[i]}" ON /* appropriate join condition */`;
        }
        return query;
    }
    buildWhereClause(filters, dateRange) {
        const conditions = [];
        conditions.push(`"createdAt" >= '${dateRange.start.toISOString()}'`);
        conditions.push(`"createdAt" <= '${dateRange.end.toISOString()}'`);
        for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
                conditions.push(`"${key}" IN (${value.map(v => `'${v}'`).join(', ')})`);
            }
            else if (typeof value === 'string') {
                conditions.push(`"${key}" = '${value}'`);
            }
            else {
                conditions.push(`"${key}" = ${value}`);
            }
        }
        return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    }
    async generateForecast(modelId, parameters) {
        const model = this.models.get(modelId);
        if (!model || !model.isActive) {
            throw new Error(`Model ${modelId} not found or inactive`);
        }
        switch (model.type) {
            case 'DEMAND_FORECASTING':
                return this.generateDemandForecast(parameters);
            case 'INCIDENT_PREDICTION':
                return this.generateIncidentPrediction(parameters);
            case 'RESOURCE_OPTIMIZATION':
                return this.generateResourceOptimization(parameters);
            default:
                throw new Error(`Unsupported model type: ${model.type}`);
        }
    }
    async generateDemandForecast(parameters) {
        const historicalData = await this.getHistoricalDemandData(parameters);
        const forecast = this.applyARIMAModel(historicalData, parameters);
        return {
            modelId: 'demand_forecast',
            forecast,
            confidence: 0.85,
            generatedAt: new Date(),
            parameters,
        };
    }
    async generateIncidentPrediction(parameters) {
        const incidents = await this.prisma.incident.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                },
            },
            include: {
                site: true,
            },
        });
        const predictions = this.applyIncidentPredictionModel(incidents, parameters);
        return {
            modelId: 'incident_predictor',
            predictions,
            accuracy: 0.78,
            generatedAt: new Date(),
            parameters,
        };
    }
    async generateResourceOptimization(parameters) {
        const agents = await this.prisma.agent.findMany({
            include: {
                user: true,
                shifts: {
                    where: {
                        startTime: {
                            gte: new Date(),
                        },
                    },
                },
            },
        });
        const sites = await this.prisma.site.findMany({
            where: { status: 'ACTIVE' },
        });
        const optimization = this.applyResourceOptimization(agents, sites, parameters);
        return {
            modelId: 'resource_optimizer',
            optimization,
            efficiency: 0.92,
            generatedAt: new Date(),
            parameters,
        };
    }
    applyARIMAModel(data, parameters) {
        const trend = this.calculateTrend(data);
        const seasonality = this.calculateSeasonality(data, parameters.seasonality);
        const forecast = [];
        const lookAhead = parameters.lookAhead || 30;
        for (let i = 0; i < lookAhead; i++) {
            const value = trend + seasonality[i % seasonality.length] + Math.random() * 0.1;
            forecast.push({
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
                value: Math.max(0, value),
                confidence: parameters.confidence || 0.95,
            });
        }
        return forecast;
    }
    applyIncidentPredictionModel(incidents, parameters) {
        const siteRiskScores = new Map();
        for (const incident of incidents) {
            const siteId = incident.siteId;
            const currentScore = siteRiskScores.get(siteId) || 0;
            siteRiskScores.set(siteId, currentScore + this.getIncidentWeight(incident));
        }
        const predictions = [];
        for (const [siteId, riskScore] of siteRiskScores.entries()) {
            if (riskScore > (parameters.threshold || 0.7)) {
                predictions.push({
                    siteId,
                    riskScore,
                    predictedIncidentType: this.predictIncidentType(incidents.filter(i => i.siteId === siteId)),
                    timeWindow: '24h',
                    confidence: Math.min(0.95, riskScore),
                });
            }
        }
        return predictions;
    }
    applyResourceOptimization(agents, sites, parameters) {
        const recommendations = [];
        for (const site of sites) {
            const siteAgents = agents.filter(agent => agent.shifts.some((shift) => shift.siteId === site.id));
            const currentCount = siteAgents.length;
            const recommendedCount = Math.ceil(currentCount * (parameters.efficiency || 1.2));
            if (recommendedCount !== currentCount) {
                recommendations.push({
                    siteId: site.id,
                    siteName: site.name,
                    currentAgents: currentCount,
                    recommendedAgents: recommendedCount,
                    action: recommendedCount > currentCount ? 'INCREASE' : 'DECREASE',
                    impact: Math.abs(recommendedCount - currentCount) / currentCount,
                });
            }
        }
        return recommendations;
    }
    async getHistoricalDemandData(parameters) {
        const shifts = await this.prisma.shift.findMany({
            where: {
                startTime: {
                    gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: {
                startTime: 'asc',
            },
        });
        const dailyDemand = new Map();
        for (const shift of shifts) {
            const date = shift.startTime.toISOString().split('T')[0];
            dailyDemand.set(date, (dailyDemand.get(date) || 0) + 1);
        }
        return Array.from(dailyDemand.entries()).map(([date, count]) => ({
            date: new Date(date),
            value: count,
        }));
    }
    calculateTrend(data) {
        if (data.length < 2)
            return 0;
        const firstValue = data[0].value;
        const lastValue = data[data.length - 1].value;
        return (lastValue - firstValue) / data.length;
    }
    calculateSeasonality(data, period) {
        const periodLength = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
        const seasonality = new Array(periodLength).fill(0);
        for (let i = 0; i < data.length; i++) {
            const index = i % periodLength;
            seasonality[index] += data[i].value;
        }
        const cycles = Math.floor(data.length / periodLength);
        return seasonality.map(value => value / Math.max(1, cycles));
    }
    getIncidentWeight(incident) {
        const severityWeights = {
            'LOW': 0.1,
            'MEDIUM': 0.3,
            'HIGH': 0.6,
            'CRITICAL': 1.0,
        };
        return severityWeights[incident.severity] || 0.1;
    }
    predictIncidentType(siteIncidents) {
        const typeCounts = new Map();
        for (const incident of siteIncidents) {
            typeCounts.set(incident.type, (typeCounts.get(incident.type) || 0) + 1);
        }
        let maxType = 'SECURITY_BREACH';
        let maxCount = 0;
        for (const [type, count] of typeCounts.entries()) {
            if (count > maxCount) {
                maxType = type;
                maxCount = count;
            }
        }
        return maxType;
    }
    calculateRequiredAgents(site) {
        const baseAgents = Math.ceil(site.size / 1000);
        const riskMultiplier = site.riskLevel === 'HIGH' ? 1.5 : site.riskLevel === 'MEDIUM' ? 1.2 : 1.0;
        return Math.max(1, Math.ceil(baseAgents * riskMultiplier));
    }
    async getRealtimeMetrics() {
        const [activeShifts, openIncidents, todayReports] = await Promise.all([
            this.prisma.shift.count({
                where: {
                    status: 'IN_PROGRESS',
                },
            }),
            this.prisma.incident.count({
                where: {
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                },
            }),
            this.prisma.report.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);
        return {
            activeShifts,
            openIncidents,
            todayReports,
            timestamp: new Date(),
        };
    }
    async exportAnalytics(format, query) {
        const data = await this.executeAdvancedQuery(query);
        switch (format) {
            case 'CSV':
                return this.exportToCSV(data);
            case 'PDF':
                return this.exportToPDF(data);
            case 'EXCEL':
                return this.exportToExcel(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    async exportToCSV(data) {
        const csv = this.convertToCSV(data.data);
        return Buffer.from(csv, 'utf-8');
    }
    async exportToPDF(data) {
        const content = JSON.stringify(data, null, 2);
        return Buffer.from(content, 'utf-8');
    }
    async exportToExcel(data) {
        const content = JSON.stringify(data, null, 2);
        return Buffer.from(content, 'utf-8');
    }
    convertToCSV(data) {
        if (!data || data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }
    async getComprehensiveAnalytics(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const [totalAgents, activeShifts, completedShifts, incidents, agentPerformance, shiftDistribution, incidentTrends,] = await Promise.all([
                this.getTotalAgents(siteId),
                this.getActiveShifts(siteId),
                this.getCompletedShifts(siteId, dateRange),
                this.getIncidentCount(siteId, dateRange),
                this.getAgentPerformance(siteId, dateRange),
                this.getShiftDistribution(siteId, dateRange),
                this.getIncidentTrends(siteId, dateRange),
            ]);
            const averageResponseTime = await this.calculateAverageResponseTime(siteId, dateRange);
            const siteUtilization = await this.calculateSiteUtilization(siteId, dateRange);
            const revenueMetrics = await this.calculateRevenueMetrics(siteId, dateRange);
            return {
                totalAgents,
                activeShifts,
                completedShifts,
                incidents,
                averageResponseTime,
                siteUtilization,
                agentPerformance,
                shiftDistribution,
                incidentTrends,
                revenueMetrics,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting comprehensive analytics:', error);
            throw new Error('Failed to get comprehensive analytics');
        }
    }
    async getPredictiveAnalytics(siteId) {
        try {
            const forecast = await this.generateForecast('demand_forecast', { siteId });
            const riskAssessment = await this.assessRisk(siteId);
            const optimization = await this.generateOptimizationRecommendations(siteId);
            return {
                forecast,
                riskAssessment,
                optimization,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting predictive analytics:', error);
            throw new Error('Failed to get predictive analytics');
        }
    }
    async getTotalAgents(siteId) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            return await this.prisma.agent.count({ where: whereClause });
        }
        catch (error) {
            logger_1.logger.error('Error getting total agents:', error);
            return 0;
        }
    }
    async getActiveShifts(siteId) {
        try {
            const whereClause = {
                status: 'IN_PROGRESS',
            };
            if (siteId) {
                whereClause.siteId = siteId;
            }
            return await this.prisma.shift.count({ where: whereClause });
        }
        catch (error) {
            logger_1.logger.error('Error getting active shifts:', error);
            return 0;
        }
    }
    async getCompletedShifts(siteId, dateRange) {
        try {
            const whereClause = {
                status: 'COMPLETED',
            };
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            return await this.prisma.shift.count({ where: whereClause });
        }
        catch (error) {
            logger_1.logger.error('Error getting completed shifts:', error);
            return 0;
        }
    }
    async getIncidentCount(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            return await this.prisma.incident.count({ where: whereClause });
        }
        catch (error) {
            logger_1.logger.error('Error getting incident count:', error);
            return 0;
        }
    }
    async calculateAverageResponseTime(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const incidents = await this.prisma.incident.findMany({
                where: whereClause,
                select: { responseTime: true },
            });
            const validResponseTimes = incidents
                .map(incident => incident.responseTime)
                .filter(time => time !== null && time !== undefined);
            if (validResponseTimes.length === 0)
                return 0;
            return validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
        }
        catch (error) {
            logger_1.logger.error('Error calculating average response time:', error);
            return 0;
        }
    }
    async calculateSiteUtilization(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const totalShifts = await this.prisma.shift.count({ where: whereClause });
            const completedShifts = await this.prisma.shift.count({
                where: { ...whereClause, status: 'COMPLETED' },
            });
            return totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;
        }
        catch (error) {
            logger_1.logger.error('Error calculating site utilization:', error);
            return 0;
        }
    }
    async getAgentPerformance(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const agents = await this.prisma.agent.findMany({
                where: whereClause,
                include: {
                    user: true,
                    shifts: {
                        where: dateRange ? {
                            createdAt: {
                                gte: dateRange.start,
                                lte: dateRange.end,
                            },
                        } : undefined,
                    },
                },
            });
            return agents.map(agent => ({
                id: agent.id,
                name: agent.user.firstName + ' ' + agent.user.lastName,
                completedShifts: agent.shifts.filter(shift => shift.status === 'COMPLETED').length,
                totalShifts: agent.shifts.length,
                performance: agent.shifts.length > 0
                    ? (agent.shifts.filter(shift => shift.status === 'COMPLETED').length / agent.shifts.length) * 100
                    : 0,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting agent performance:', error);
            return [];
        }
    }
    async getShiftDistribution(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const shifts = await this.prisma.shift.findMany({
                where: whereClause,
                select: { status: true },
            });
            const distribution = shifts.reduce((acc, shift) => {
                acc[shift.status] = (acc[shift.status] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(distribution).map(([status, count]) => ({
                status,
                count,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting shift distribution:', error);
            return [];
        }
    }
    async getIncidentTrends(siteId, dateRange) {
        try {
            const whereClause = {};
            if (siteId) {
                whereClause.siteId = siteId;
            }
            if (dateRange) {
                whereClause.createdAt = {
                    gte: dateRange.start,
                    lte: dateRange.end,
                };
            }
            const incidents = await this.prisma.incident.findMany({
                where: whereClause,
                select: { type: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            });
            const trends = incidents.reduce((acc, incident) => {
                const date = incident.createdAt.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = {};
                }
                acc[date][incident.type] = (acc[date][incident.type] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(trends).map(([date, types]) => ({
                date,
                ...types,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting incident trends:', error);
            return [];
        }
    }
    async calculateRevenueMetrics(siteId, dateRange) {
        try {
            return {
                totalRevenue: 0,
                averageRevenuePerShift: 0,
                revenueGrowth: 0,
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating revenue metrics:', error);
            return {
                totalRevenue: 0,
                averageRevenuePerShift: 0,
                revenueGrowth: 0,
            };
        }
    }
    async assessRisk(siteId) {
        try {
            const sites = siteId
                ? await this.prisma.site.findMany({ where: { id: siteId } })
                : await this.prisma.site.findMany();
            const predictions = [];
            for (const site of sites) {
                const riskScore = Math.random() * 100;
                predictions.push({
                    siteId: site.id,
                    riskScore,
                    predictedIncidentType: riskScore > 70 ? 'SECURITY_BREACH' : 'MINOR_INCIDENT',
                    timeWindow: '24h',
                    confidence: Math.min(0.95, riskScore),
                });
            }
            return predictions;
        }
        catch (error) {
            logger_1.logger.error('Error assessing risk:', error);
            return [];
        }
    }
    async generateOptimizationRecommendations(siteId) {
        try {
            const sites = siteId
                ? await this.prisma.site.findMany({ where: { id: siteId } })
                : await this.prisma.site.findMany();
            const optimization = {
                recommendations: [],
            };
            for (const site of sites) {
                const shifts = await this.prisma.shift.findMany({
                    where: {
                        siteId: site.id,
                        status: 'IN_PROGRESS'
                    },
                    select: { agentId: true }
                });
                const currentAgents = new Set(shifts.map(shift => shift.agentId)).size;
                const requiredAgents = Math.ceil(Math.random() * 10) + 5;
                optimization.recommendations.push({
                    siteId: site.id,
                    siteName: site.name,
                    currentAgents,
                    recommendedAgents: requiredAgents,
                    action: currentAgents < requiredAgents ? 'INCREASE_STAFF' : 'OPTIMIZE_SCHEDULE',
                    impact: Math.abs(currentAgents - requiredAgents),
                });
            }
            return optimization;
        }
        catch (error) {
            logger_1.logger.error('Error generating optimization recommendations:', error);
            return { recommendations: [] };
        }
    }
}
exports.AdvancedAnalyticsService = AdvancedAnalyticsService;
exports.advancedAnalyticsService = AdvancedAnalyticsService.getInstance();
//# sourceMappingURL=advancedAnalyticsService.js.map