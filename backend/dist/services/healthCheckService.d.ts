export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    lastChecked: Date;
    error?: string;
}
export declare class HealthCheckService {
    private prisma;
    private redis;
    constructor();
    performHealthCheck(): Promise<HealthCheckResult[]>;
    private checkDatabase;
    private checkRedis;
    private checkExternalServices;
    getHealthHistory(service?: string, limit?: number): Promise<any[]>;
    getServiceStatus(service: string): Promise<HealthCheckResult | null>;
    getReadinessCheck(): Promise<{
        ready: boolean;
        checks: any;
    }>;
    getLivenessCheck(): Promise<{
        alive: boolean;
    }>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=healthCheckService.d.ts.map