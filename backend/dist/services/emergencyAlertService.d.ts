export interface EmergencyAlert {
    id: string;
    type: 'PANIC' | 'MEDICAL' | 'SECURITY' | 'FIRE' | 'GENERAL';
    priority: 'HIGH' | 'CRITICAL';
    agentId: string;
    agentName: string;
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    description?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolvedBy?: string;
    resolvedAt?: Date;
    escalationLevel: number;
    notificationsSent: string[];
}
export interface AlertEscalation {
    level: number;
    delayMinutes: number;
    recipients: string[];
    channels: ('websocket' | 'email' | 'sms' | 'push')[];
}
declare class EmergencyAlertService {
    private prisma;
    private readonly ALERT_CACHE_TTL;
    private readonly MAX_ESCALATION_LEVEL;
    private readonly DEFAULT_ESCALATIONS;
    constructor();
    createEmergencyAlert(alertData: {
        type: EmergencyAlert['type'];
        agentId: string;
        location?: EmergencyAlert['location'];
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<EmergencyAlert>;
    acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<EmergencyAlert>;
    resolveAlert(alertId: string, resolvedBy: string, resolution: 'RESOLVED' | 'FALSE_ALARM'): Promise<EmergencyAlert>;
    getActiveAlerts(): Promise<EmergencyAlert[]>;
    getAlert(alertId: string): Promise<EmergencyAlert | null>;
    processEscalation(alertId: string, escalationLevel: number): Promise<void>;
    private storeAlert;
    private updateAlert;
    private cacheAlert;
    private getCachedActiveAlerts;
    private cacheActiveAlerts;
    private startEscalationProcess;
    private scheduleEscalation;
    private cancelEscalation;
    private sendEscalationNotifications;
    private mapIncidentToAlert;
    disconnect(): Promise<void>;
}
export default EmergencyAlertService;
//# sourceMappingURL=emergencyAlertService.d.ts.map