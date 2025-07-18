export interface GeoCoordinate {
    latitude: number;
    longitude: number;
}
export interface GeofenceZone {
    id: string;
    name: string;
    type?: 'EMERGENCY' | 'ENTRY' | 'EXIT' | 'RESTRICTED' | 'PATROL';
    coordinates: GeoCoordinate[];
    rules?: GeofenceRule[];
    isActive: boolean;
    siteId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface GeofenceRule {
    id: string;
    ruleType: string;
    conditions: Record<string, any>;
    trigger: 'EXIT' | 'ENTER' | 'DWELL' | 'SPEED';
    actions: GeofenceAction[];
    isActive: boolean;
    zoneId: string;
    siteId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface GeofenceAction {
    type: 'NOTIFICATION' | 'ALERT' | 'CHECK_IN' | 'AUDIT_LOG';
    parameters: Record<string, any>;
}
export interface GeofenceEvent {
    id: string;
    agentId: string;
    zoneId: string;
    siteId: string;
    eventType: 'EXIT' | 'ENTER' | 'DWELL' | 'VIOLATION';
    timestamp: Date;
    location: GeoCoordinate;
    metadata?: Record<string, any>;
}
export declare class GeofencingService {
    private static instance;
    private agentLocations;
    private agentEvents;
    private zones;
    private constructor();
    static getInstance(): GeofencingService;
    private loadZones;
    updateAgentLocation(agentId: string, latitude: number, longitude: number, accuracy: number, speed?: number, heading?: number): Promise<void>;
    private checkGeofenceEvents;
    private isPointInPolygon;
    private wasAgentInZone;
    private handleZoneEntry;
    private handleZoneExit;
    private createGeofenceEvent;
    getAgentLocation(agentId: string): Promise<GeoCoordinate | null>;
    getAgentLocations(): Promise<Array<{
        agentId: string;
        location: GeoCoordinate;
    }>>;
    getZoneEvents(zoneId: string, startDate?: Date, endDate?: Date, siteId?: string): Promise<any[]>;
    getAgentEvents(agentId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
    createZone(zoneData: {
        siteId: string;
        name: string;
        coordinates: any;
        isActive?: boolean;
    }): Promise<GeofenceZone>;
    createRule(ruleData: {
        zoneId: string;
        ruleType: string;
        conditions: any;
        isActive?: boolean;
        trigger?: string;
        siteId: string;
        actions?: any;
    }): Promise<GeofenceRule>;
    updateZone(zoneId: string, updates: Partial<{
        name: string;
        coordinates: any;
        isActive: boolean;
    }>): Promise<GeofenceZone>;
    deleteZone(zoneId: string): Promise<void>;
    getZones(siteId?: string): Promise<any[]>;
    getRecentLocationUpdates(agentId?: string, limit?: number): Promise<Array<{
        agentId: string;
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: Date;
        speed: number | null;
        heading: number | null;
    }>>;
    getAgentLocationHistory(agentId: string, startDate: Date, endDate: Date): Promise<Array<{
        agentId: string;
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: Date;
        speed: number | null;
        heading: number | null;
    }>>;
    getSiteLocationHistory(siteId: string, startDate: Date, endDate: Date): Promise<Array<{
        agentId: string;
        latitude: number;
        longitude: number;
        accuracy: number;
        timestamp: Date;
        speed: number | null;
        heading: number | null;
    }>>;
    private mapZoneToGeofenceZone;
    private parseCoordinates;
    private parseActions;
}
export declare const geofencingService: GeofencingService;
//# sourceMappingURL=geofencingService.d.ts.map