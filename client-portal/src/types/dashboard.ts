/**
 * Complete dashboard data types with all required fields
 * No optional fields that could be undefined
 */

export interface DashboardStats {
  activeSites: number;
  totalAgents: number;
  onDutyAgents: number;
  todayReports: number;
  openIncidents: number;
  completedShifts: number;
  satisfactionScore: number;
  responseTime: number;
}

export interface RecentActivity {
  id: string;
  type: 'SHIFT_START' | 'SHIFT_END' | 'INCIDENT' | 'REPORT' | 'PATROL';
  title: string;
  description: string;
  timestamp: string;
  agentName: string;
  siteName: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SiteStatus {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  agentsOnDuty: number;
  lastActivity: string;
  incidentCount: number;
}

export interface Agent {
  id: string;
  name: string;
  shiftStart: string;
  shiftEnd: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  activeShifts: number;
  agentsOnSite: number;
  lastUpdate: string;
  timestamp: string;
  activeAgents: Agent[];
  openIncidents: number;
  recentReports: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  title: string;
  type: 'PATROL' | 'INCIDENT' | 'MAINTENANCE' | 'INSPECTION' | 'ACCESS_CONTROL';
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  timestamp: string;
  agentName: string;
  siteName: string;
}

export interface Incident {
  id: string;
  title: string;
  type: 'SECURITY_BREACH' | 'EMERGENCY' | 'SAFETY_VIOLATION' | 'TECHNICAL' | 'SECURITY_CONCERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'INVESTIGATING' | 'RESOLVED';
  occurredAt: string;
  timestamp: string;
  reportedBy: string;
  siteName: string;
}

export interface Attendance {
  id: string;
  clockInTime: string;
  clockOutTime: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  timestamp: string;
  agentName: string;
  siteName: string;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    overview: DashboardStats;
    lastUpdated: string;
    timestamp: string;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    recentReports: Report[];
    recentIncidents: Incident[];
    recentAttendance: Attendance[];
  };
  lastUpdated: string;
  timestamp: string;
}

export interface SitesResponse {
  success: boolean;
  data: {
    sites: Site[];
    lastUpdated: string;
    timestamp: string;
  };
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  siteName: string;
  agentName: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface BillingInfo {
  id: string;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  description: string;
  invoiceNumber: string;
  createdAt: string;
}

export interface ReportAccess {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  siteName: string;
  agentName: string;
  downloadUrl: string;
}
