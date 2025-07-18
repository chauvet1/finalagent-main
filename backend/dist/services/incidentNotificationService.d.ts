export interface IncidentNotificationData {
    incidentId: string;
    title: string;
    type: string;
    severity: string;
    status: string;
    siteId: string;
    siteName: string;
    reportedById?: string;
    reportedByName?: string;
    occurredAt: Date;
    location?: string;
    description: string;
}
export declare class IncidentNotificationService {
    private static instance;
    static getInstance(): IncidentNotificationService;
    notifyIncidentCreated(incidentData: IncidentNotificationData): Promise<void>;
    notifyIncidentEscalated(incidentData: IncidentNotificationData, escalationReason: string): Promise<void>;
    notifyIncidentResolved(incidentData: IncidentNotificationData): Promise<void>;
    notifyIncidentStatusUpdate(incidentData: IncidentNotificationData, oldStatus: string, newStatus: string): Promise<void>;
    private mapSeverityToPriority;
    getIncidentNotifications(userId: string, incidentId?: string): Promise<any[]>;
    markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
}
export default IncidentNotificationService;
//# sourceMappingURL=incidentNotificationService.d.ts.map