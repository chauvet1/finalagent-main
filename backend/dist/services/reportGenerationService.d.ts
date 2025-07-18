export interface ReportGenerationOptions {
    format: 'PDF' | 'EXCEL';
    type: 'INCIDENT_SUMMARY' | 'INCIDENT_DETAILED' | 'INCIDENT_ANALYTICS';
    filters?: {
        startDate?: Date;
        endDate?: Date;
        siteId?: string;
        severity?: string;
        status?: string;
        type?: string;
    };
    includeEvidence?: boolean;
}
export declare class ReportGenerationService {
    private static instance;
    private reportsDir;
    constructor();
    static getInstance(): ReportGenerationService;
    generateIncidentReport(options: ReportGenerationOptions): Promise<string>;
    private fetchIncidentData;
    private generatePDFReport;
    private generateExcelReport;
    private calculateIncidentStats;
    getReportFile(filename: string): Promise<string | null>;
    cleanupOldReports(maxAgeHours?: number): Promise<void>;
}
export default ReportGenerationService;
//# sourceMappingURL=reportGenerationService.d.ts.map