export interface LocationUpdate {
    agentId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    batteryLevel?: number;
    speed?: number;
    heading?: number;
}
export interface GeofenceViolation {
    id: string;
    agentId: string;
    agentName: string;
    siteId: string;
    siteName: string;
    location: {
        latitude: number;
        longitude: number;
    };
    distance: number;
    allowedRadius: number;
    timestamp: Date;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}
declare class LocationService {
    private prisma;
    private readonly LOCATION_CACHE_TTL;
    private readonly LOCATION_HISTORY_RETENTION_DAYS;
    constructor();
    processLocationUpdate(locationUpdate: LocationUpdate): Promise<GeofenceViolation[]>;
    getCurrentAgentLocations(): Promise<any[]>;
    getLocationHistory(agentId: string, startDate: Date, endDate: Date): Promise<any[]>;
    cleanupOldLocations(): Promise<void>;
    updateAgentLocation(locationData: {
        agentId: string;
        latitude: number;
        longitude: number;
        accuracy?: number;
        batteryLevel?: number;
        speed?: number;
        heading?: number;
        siteId?: string;
        status: string;
        timestamp: Date;
    }): Promise<void>;
    getAgentLocationHistory(agentId: string, startDate?: Date, endDate?: Date, limit?: number): Promise<any[]>;
    getTrackingStats(): Promise<any>;
    validateGeofence(agentId: string, latitude: number, longitude: number, siteId?: string): Promise<{
        isValid: boolean;
        violations: any[];
    }>;
    cleanupOldTrackingData(daysToKeep: number): Promise<number>;
    private storeLocationUpdate;
    private cacheCurrentLocation;
    private getCachedLocations;
    private cacheLocations;
    private checkGeofenceViolations;
    private calculateDistance;
    private calculateViolationSeverity;
    private storeGeofenceViolation;
    disconnect(): Promise<void>;
}
export default LocationService;
//# sourceMappingURL=locationService.d.ts.map