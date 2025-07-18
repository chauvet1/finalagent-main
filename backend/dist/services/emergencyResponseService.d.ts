export interface EmergencyContact {
    id: string;
    name: string;
    userId: string;
    phone: string;
    relation: string | null;
}
export interface EmergencyProcedure {
    id: string;
    name: string;
    siteId: string;
    steps: any;
}
export interface EmergencyAlert {
    id: string;
    siteId: string;
    agentId: string;
    type: string;
    message: string;
    createdAt: Date;
}
export interface EmergencyResponse {
    id: string;
    alertId: string;
    responderId: string;
    response: string;
    createdAt: Date;
}
export declare class EmergencyResponseService {
    private prisma;
    constructor();
    getEmergencyContacts(userId: string): Promise<EmergencyContact[]>;
    getEmergencyProcedures(siteId: string): Promise<EmergencyProcedure[]>;
    createEmergencyAlert(alert: {
        siteId: string;
        agentId: string;
        type: string;
        message: string;
    }): Promise<EmergencyAlert>;
    createEmergencyResponse(response: {
        alertId: string;
        responderId: string;
        response: string;
    }): Promise<EmergencyResponse>;
    logEmergencyAction(action: string, entityType: string, entityId: string, userId: string, details: any): Promise<void>;
    notifyEmergencyContacts(contacts: EmergencyContact[], alert: EmergencyAlert): Promise<void>;
    getAvailableResponders(siteId: string): Promise<any[]>;
    updateEmergencyResponse(responseId: string, updates: {
        response?: string;
    }): Promise<EmergencyResponse>;
    escalateEmergency(alertId: string, escalationLevel: string, reason: string): Promise<void>;
    resolveEmergency(alertId: string, resolutionNotes: string, resolvedBy: string): Promise<void>;
    getEmergencyHistory(siteId: string, startDate: Date, endDate: Date): Promise<any[]>;
    getEmergencyStatistics(siteId: string, period: string): Promise<any>;
    private getStartDateForPeriod;
}
//# sourceMappingURL=emergencyResponseService.d.ts.map