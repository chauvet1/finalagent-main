import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

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

export class GeofencingService {
  private static instance: GeofencingService;
  private agentLocations: Map<string, GeoCoordinate> = new Map();
  private agentEvents: Map<string, any[]> = new Map();
  private zones: Map<string, any> = new Map();

  private constructor() {
    this.loadZones();
  }

  public static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  private async loadZones(): Promise<void> {
    try {
      const zones = await prisma.geofenceZone.findMany({
        where: { isActive: true },
        include: { geofenceRules: true }
      });
      for (const zone of zones) {
        this.zones.set(zone.id, zone);
      }
    } catch (error) {
      console.error('Failed to load geofence zones:', error);
    }
  }

  public async updateAgentLocation(
    agentId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    speed?: number,
    heading?: number
  ): Promise<void> {
    try {
      const location: GeoCoordinate = { latitude, longitude };
      this.agentLocations.set(agentId, location);
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { locationUpdates: { orderBy: { timestamp: 'desc' }, take: 1, select: { siteId: true } } }
      });
      const siteId = agent?.locationUpdates[0]?.siteId;
      if (!siteId) {
        console.error('Agent not found or no site assigned:', agentId);
        return;
      }
      await prisma.locationUpdate.create({
        data: {
          agentId,
          siteId,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
          speed: speed || null,
          heading: heading || null,
        },
      });
      await this.checkGeofenceEvents(agentId, location);
    } catch (error) {
      console.error('Failed to update agent location:', error);
    }
  }

  private async checkGeofenceEvents(agentId: string, location: GeoCoordinate): Promise<void> {
    for (const [zoneId, zone] of this.zones) {
      let coordinates: GeoCoordinate[] = [];
      try {
        coordinates = JSON.parse(JSON.stringify(zone.coordinates));
      } catch {}
      const isInside = this.isPointInPolygon(location, coordinates);
      const wasInside = this.wasAgentInZone(agentId, zoneId);
      if (isInside && !wasInside) {
        await this.handleZoneEntry(agentId, zoneId, location);
      } else if (!isInside && wasInside) {
        await this.handleZoneExit(agentId, zoneId, location);
      }
    }
  }

  private isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].latitude > point.latitude) !== (polygon[j].latitude > point.latitude)) &&
        (point.longitude < (polygon[j].longitude - polygon[i].longitude) * (point.latitude - polygon[i].latitude) / (polygon[j].latitude - polygon[i].latitude) + polygon[i].longitude)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private wasAgentInZone(agentId: string, zoneId: string): boolean {
    const events = this.agentEvents.get(agentId) || [];
    const lastEvent = events.find(e => e.zoneId === zoneId);
    return lastEvent?.eventType === 'ENTER';
  }

  private async handleZoneEntry(agentId: string, zoneId: string, location: GeoCoordinate): Promise<void> {
    const zone = this.zones.get(zoneId);
    if (!zone) return;
    const event = {
      id: uuidv4(),
      agentId,
      zoneId,
      siteId: zone.siteId,
      eventType: 'ENTER',
      timestamp: new Date(),
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: null
    };
    await this.createGeofenceEvent(event);
  }

  private async handleZoneExit(agentId: string, zoneId: string, location: GeoCoordinate): Promise<void> {
    const zone = this.zones.get(zoneId);
    if (!zone) return;
    const event = {
      id: uuidv4(),
      agentId,
      zoneId,
      siteId: zone.siteId,
      eventType: 'EXIT',
      timestamp: new Date(),
      latitude: location.latitude,
      longitude: location.longitude,
      metadata: null
    };
    await this.createGeofenceEvent(event);
  }

  private async createGeofenceEvent(event: any): Promise<void> {
    try {
      await prisma.geofenceEvent.create({
        data: {
          id: event.id,
          agentId: event.agentId,
          zoneId: event.zoneId,
          siteId: event.siteId,
          eventType: event.eventType,
          timestamp: event.timestamp,
          latitude: event.latitude,
          longitude: event.longitude,
          metadata: event.metadata
        },
      });
      const agentEvents = this.agentEvents.get(event.agentId) || [];
      agentEvents.push(event);
      this.agentEvents.set(event.agentId, agentEvents);
    } catch (error) {
      console.error('Failed to create geofence event:', error);
    }
  }

  // Public API methods
  public async getAgentLocation(agentId: string): Promise<GeoCoordinate | null> {
    return this.agentLocations.get(agentId) || null;
  }

  public async getAgentLocations(): Promise<Array<{ agentId: string; location: GeoCoordinate }>> {
    const locations: Array<{ agentId: string; location: GeoCoordinate }> = [];
    
    for (const [agentId, location] of this.agentLocations) {
      locations.push({ agentId, location });
    }
    
    return locations;
  }

  public async getZoneEvents(
    zoneId: string,
    startDate?: Date,
    endDate?: Date,
    siteId?: string
  ): Promise<any[]> {
    const where: any = { zoneId };
    if (startDate && endDate) {
      where.timestamp = { gte: startDate, lte: endDate };
    }
    if (siteId) {
      where.siteId = siteId;
    }
    return await prisma.geofenceEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    });
  }

  public async getAgentEvents(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const where: any = { agentId };
    if (startDate && endDate) {
      where.timestamp = { gte: startDate, lte: endDate };
    }
    return await prisma.geofenceEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    });
  }

  public async createZone(zoneData: { siteId: string; name: string; coordinates: any; isActive?: boolean }): Promise<GeofenceZone> {
    const zone = await prisma.geofenceZone.create({
      data: {
        siteId: zoneData.siteId,
        name: zoneData.name,
        coordinates: zoneData.coordinates,
        isActive: zoneData.isActive ?? true,
      },
    });

    const newZone = this.mapZoneToGeofenceZone(zone);
    this.zones.set(zone.id, newZone);
    return newZone;
  }

  public async createRule(ruleData: { zoneId: string; ruleType: string; conditions: any; isActive?: boolean; trigger?: string; siteId: string; actions?: any }): Promise<GeofenceRule> {
    const rule = await prisma.geofenceRule.create({
      data: {
        zoneId: ruleData.zoneId,
        ruleType: ruleData.ruleType,
        conditions: ruleData.conditions,
        isActive: ruleData.isActive ?? true,
        trigger: ruleData.trigger,
        siteId: ruleData.siteId,
        actions: ruleData.actions,
      },
    });

    return {
      id: rule.id,
      ruleType: rule.ruleType,
      conditions: rule.conditions as Record<string, any>,
      trigger: rule.trigger as any,
      actions: this.parseActions(rule.actions),
      isActive: rule.isActive,
      zoneId: rule.zoneId,
      siteId: rule.siteId,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };
  }

  public async updateZone(
    zoneId: string,
    updates: Partial<{ name: string; coordinates: any; isActive: boolean }>
  ): Promise<GeofenceZone> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.coordinates !== undefined) updateData.coordinates = updates.coordinates;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const zone = await prisma.geofenceZone.update({
      where: { id: zoneId },
      data: updateData,
    });

    const updatedZone = this.mapZoneToGeofenceZone(zone);
    this.zones.set(zoneId, updatedZone);
    return updatedZone;
  }

  public async deleteZone(zoneId: string): Promise<void> {
    await prisma.geofenceZone.delete({
      where: { id: zoneId }
    });
    
    this.zones.delete(zoneId);
  }

  public async getZones(siteId?: string): Promise<any[]> {
    const where = siteId ? { siteId, isActive: true } : { isActive: true };
    return await prisma.geofenceZone.findMany({
      where,
      include: { geofenceRules: true }
    });
  }

  public async getRecentLocationUpdates(
    agentId?: string,
    limit: number = 100
  ): Promise<Array<{ agentId: string; latitude: number; longitude: number; accuracy: number; timestamp: Date; speed: number | null; heading: number | null }>> {
    const where = agentId ? { agentId } : {};
    
    const locations = await prisma.locationUpdate.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return locations.map((loc: any) => ({
      agentId: loc.agentId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      timestamp: loc.timestamp,
      speed: loc.speed,
      heading: loc.heading,
    }));
  }

  public async getAgentLocationHistory(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ agentId: string; latitude: number; longitude: number; accuracy: number; timestamp: Date; speed: number | null; heading: number | null }>> {
    const locations = await prisma.locationUpdate.findMany({
      where: {
        agentId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return locations.map((loc: any) => ({
      agentId: loc.agentId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      timestamp: loc.timestamp,
      speed: loc.speed,
      heading: loc.heading,
    }));
  }

  public async getSiteLocationHistory(
    siteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ agentId: string; latitude: number; longitude: number; accuracy: number; timestamp: Date; speed: number | null; heading: number | null }>> {
    const locations = await prisma.locationUpdate.findMany({
      where: {
        siteId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return locations.map((loc: any) => ({
      agentId: loc.agentId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      timestamp: loc.timestamp,
      speed: loc.speed,
      heading: loc.heading,
    }));
  }

  private mapZoneToGeofenceZone(zone: any): GeofenceZone {
    return {
      id: zone.id,
      name: zone.name,
      isActive: zone.isActive,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
      siteId: zone.siteId,
      coordinates: this.parseCoordinates(zone.coordinates),
      rules: [],
    };
  }

  private parseCoordinates(coordinates: any): GeoCoordinate[] {
    if (Array.isArray(coordinates)) {
      return coordinates.map((coord: any) => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
      }));
    } else if (typeof coordinates === 'string') {
      return JSON.parse(coordinates);
    } else {
      throw new Error('Invalid coordinates format');
    }
  }

  private parseActions(actions: any): GeofenceAction[] {
    if (Array.isArray(actions)) {
      return actions.map((action: any) => ({
        type: action.type,
        parameters: action.parameters || {},
      }));
    } else if (typeof actions === 'string') {
      return JSON.parse(actions);
    } else {
      return [];
    }
  }
}

export const geofencingService = GeofencingService.getInstance();
