import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

export class ReportGenerationService {
  private static instance: ReportGenerationService;
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'generated-reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  static getInstance(): ReportGenerationService {
    if (!ReportGenerationService.instance) {
      ReportGenerationService.instance = new ReportGenerationService();
    }
    return ReportGenerationService.instance;
  }

  async generateIncidentReport(options: ReportGenerationOptions): Promise<string> {
    const incidents = await this.fetchIncidentData(options.filters);
    
    if (options.format === 'PDF') {
      return await this.generatePDFReport(incidents, options);
    } else {
      return await this.generateExcelReport(incidents, options);
    }
  }

  private async fetchIncidentData(filters?: ReportGenerationOptions['filters']) {
    const where: any = {};

    if (filters) {
      if (filters.startDate || filters.endDate) {
        where.occurredAt = {};
        if (filters.startDate) where.occurredAt.gte = filters.startDate;
        if (filters.endDate) where.occurredAt.lte = filters.endDate;
      }
      if (filters.siteId) where.siteId = filters.siteId;
      if (filters.severity) where.severity = filters.severity;
      if (filters.status) where.status = filters.status;
      if (filters.type) where.type = filters.type;
    }

    return await prisma.incident.findMany({
      where,
      include: {
        reportedBy: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        site: {
          select: {
            name: true,
            address: true,
            client: {
              select: {
                companyName: true
              }
            }
          }
        },
        reports: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { occurredAt: 'desc' }
    });
  }

  private async generatePDFReport(incidents: any[], options: ReportGenerationOptions): Promise<string> {
    const filename = `incident-report-${Date.now()}.pdf`;
    const filepath = path.join(this.reportsDir, filename);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(20).text('Incident Report', { align: 'center' });
    doc.moveDown();
    
    // Report metadata
    doc.fontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Total Incidents: ${incidents.length}`);
    doc.moveDown();

    // Summary statistics
    const stats = this.calculateIncidentStats(incidents);
    doc.fontSize(14).text('Summary Statistics', { underline: true });
    doc.fontSize(10);
    doc.text(`Open: ${stats.open} | In Progress: ${stats.inProgress} | Resolved: ${stats.resolved}`);
    doc.text(`Critical: ${stats.critical} | High: ${stats.high} | Medium: ${stats.medium} | Low: ${stats.low}`);
    doc.moveDown();

    // Incident details
    doc.fontSize(14).text('Incident Details', { underline: true });
    doc.moveDown();

    incidents.forEach((incident, index) => {
      if (index > 0) doc.addPage();
      
      doc.fontSize(12).text(`Incident #${index + 1}`, { underline: true });
      doc.fontSize(10);
      doc.text(`ID: ${incident.id}`);
      doc.text(`Title: ${incident.title}`);
      doc.text(`Type: ${incident.type}`);
      doc.text(`Severity: ${incident.severity}`);
      doc.text(`Status: ${incident.status}`);
      doc.text(`Site: ${incident.site?.name || 'Unknown'}`);
      doc.text(`Client: ${incident.site?.client?.companyName || 'Unknown'}`);
      doc.text(`Occurred: ${new Date(incident.occurredAt).toLocaleString()}`);
      
      if (incident.reportedBy) {
        doc.text(`Reported by: ${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}`);
      }
      
      if (incident.location) {
        doc.text(`Location: ${incident.location}`);
      }
      
      doc.moveDown();
      doc.text('Description:', { underline: true });
      doc.text(incident.description, { width: 500 });
      
      if (incident.resolvedAt) {
        doc.moveDown();
        doc.text(`Resolved: ${new Date(incident.resolvedAt).toLocaleString()}`);
        const resolutionTime = Math.round((new Date(incident.resolvedAt).getTime() - new Date(incident.occurredAt).getTime()) / (1000 * 60 * 60));
        doc.text(`Resolution Time: ${resolutionTime} hours`);
      }
      
      if (incident.reports && incident.reports.length > 0) {
        doc.moveDown();
        doc.text('Related Reports:', { underline: true });
        incident.reports.forEach((report: any) => {
          doc.text(`- ${report.title} (${report.status})`);
        });
      }
    });

    doc.end();

    return filepath;
  }

  private async generateExcelReport(incidents: any[], options: ReportGenerationOptions): Promise<string> {
    const filename = `incident-report-${Date.now()}.xlsx`;
    const filepath = path.join(this.reportsDir, filename);

    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 20 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    const stats = this.calculateIncidentStats(incidents);
    summarySheet.addRows([
      { metric: 'Total Incidents', value: incidents.length },
      { metric: 'Open', value: stats.open },
      { metric: 'In Progress', value: stats.inProgress },
      { metric: 'Resolved', value: stats.resolved },
      { metric: 'Critical Severity', value: stats.critical },
      { metric: 'High Severity', value: stats.high },
      { metric: 'Medium Severity', value: stats.medium },
      { metric: 'Low Severity', value: stats.low }
    ]);

    // Incidents sheet
    const incidentsSheet = workbook.addWorksheet('Incidents');
    incidentsSheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Site', key: 'site', width: 25 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Reported By', key: 'reportedBy', width: 20 },
      { header: 'Occurred At', key: 'occurredAt', width: 20 },
      { header: 'Resolved At', key: 'resolvedAt', width: 20 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Description', key: 'description', width: 50 }
    ];

    incidents.forEach(incident => {
      incidentsSheet.addRow({
        id: incident.id,
        title: incident.title,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        site: incident.site?.name || 'Unknown',
        client: incident.site?.client?.companyName || 'Unknown',
        reportedBy: incident.reportedBy ? 
          `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 
          'System',
        occurredAt: new Date(incident.occurredAt).toLocaleString(),
        resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '',
        location: incident.location || '',
        description: incident.description
      });
    });

    // Style headers
    [summarySheet, incidentsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    await workbook.xlsx.writeFile(filepath);
    return filepath;
  }

  private calculateIncidentStats(incidents: any[]) {
    return {
      open: incidents.filter(i => i.status === 'OPEN').length,
      inProgress: incidents.filter(i => i.status === 'IN_PROGRESS').length,
      resolved: incidents.filter(i => i.status === 'RESOLVED').length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.filter(i => i.severity === 'HIGH').length,
      medium: incidents.filter(i => i.severity === 'MEDIUM').length,
      low: incidents.filter(i => i.severity === 'LOW').length
    };
  }

  async getReportFile(filename: string): Promise<string | null> {
    const filepath = path.join(this.reportsDir, filename);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
    return null;
  }

  async cleanupOldReports(maxAgeHours: number = 24): Promise<void> {
    const files = fs.readdirSync(this.reportsDir);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    files.forEach(file => {
      const filepath = path.join(this.reportsDir, file);
      const stats = fs.statSync(filepath);
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filepath);
      }
    });
  }
}

export default ReportGenerationService;