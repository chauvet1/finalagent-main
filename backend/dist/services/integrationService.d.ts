import { EventEmitter } from 'events';
export declare class IntegrationService extends EventEmitter {
    private static instance;
    private webhookEndpoints;
    private apiKeys;
    private constructor();
    static getInstance(): IntegrationService;
    private initializeIntegrations;
    getWeatherData(latitude: number, longitude: number): Promise<{
        temperature: any;
        condition: any;
        description: any;
        humidity: any;
        windSpeed: any;
        visibility: any;
    }>;
    sendSMS(to: string, message: string): Promise<{
        messageId: any;
        status: any;
        to: any;
    }>;
    sendEmail(to: string, subject: string, content: string, isHtml?: boolean): Promise<{
        messageId: any;
        status: string;
    }>;
    sendPushNotification(deviceTokens: string[], title: string, body: string, data?: any): Promise<{
        success: any;
        failure: any;
        results: any;
    }>;
    sendWebhook(type: string, event: string, data: any): Promise<any>;
    reverseGeocode(latitude: number, longitude: number): Promise<{
        address: any;
        components: any;
        placeId: any;
    }>;
    notifyEmergencyServices(incident: any): Promise<void>;
    sendAnalyticsEvent(event: string, properties: any): Promise<void>;
    uploadFile(file: Buffer, fileName: string, contentType: string): Promise<{
        url: any;
        key: any;
        bucket: any;
    }>;
    updateIntegration(type: string, config: any): Promise<void>;
}
export declare const integrationService: IntegrationService;
//# sourceMappingURL=integrationService.d.ts.map