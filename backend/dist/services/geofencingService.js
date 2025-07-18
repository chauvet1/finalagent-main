"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geofencingService = exports.GeofencingService = void 0;
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class GeofencingService {
    constructor() {
        this.agentLocations = new Map();
        this.agentEvents = new Map();
        this.zones = new Map();
        this.loadZones();
    }
    static getInstance() {
        if (!GeofencingService.instance) {
            GeofencingService.instance = new GeofencingService();
        }
        return GeofencingService.instance;
    }
    async loadZones() {
        try {
            const zones = await prisma.geofenceZone.findMany({
                where: { isActive: true },
                include: { geofenceRules: true }
            });
            for (const zone of zones) {
                this.zones.set(zone.id, zone);
            }
        }
        catch (error) {
            console.error('Failed to load geofence zones:', error);
        }
    }
    async updateAgentLocation(agentId, latitude, longitude, accuracy, speed, heading) {
        try {
            const location = { latitude, longitude };
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
        }
        catch (error) {
            console.error('Failed to update agent location:', error);
        }
    }
    async checkGeofenceEvents(agentId, location) {
        for (const [zoneId, zone] of this.zones) {
            let coordinates = [];
            try {
                coordinates = JSON.parse(JSON.stringify(zone.coordinates));
            }
            catch { }
            const isInside = this.isPointInPolygon(location, coordinates);
            const wasInside = this.wasAgentInZone(agentId, zoneId);
            if (isInside && !wasInside) {
                await this.handleZoneEntry(agentId, zoneId, location);
            }
            else if (!isInside && wasInside) {
                await this.handleZoneExit(agentId, zoneId, location);
            }
        }
    }
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].latitude > point.latitude) !== (polygon[j].latitude > point.latitude)) &&
                (point.longitude < (polygon[j].longitude - polygon[i].longitude) * (point.latitude - polygon[i].latitude) / (polygon[j].latitude - polygon[i].latitude) + polygon[i].longitude)) {
                inside = !inside;
            }
        }
        return inside;
    }
    wasAgentInZone(agentId, zoneId) {
        const events = this.agentEvents.get(agentId) || [];
        const lastEvent = events.find(e => e.zoneId === zoneId);
        return lastEvent?.eventType === 'ENTER';
    }
    async handleZoneEntry(agentId, zoneId, location) {
        const zone = this.zones.get(zoneId);
        if (!zone)
            return;
        const event = {
            id: (0, uuid_1.v4)(),
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
    async handleZoneExit(agentId, zoneId, location) {
        const zone = this.zones.get(zoneId);
        if (!zone)
            return;
        const event = {
            id: (0, uuid_1.v4)(),
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
    async createGeofenceEvent(event) {
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
        }
        catch (error) {
            console.error('Failed to create geofence event:', error);
        }
    }
    async getAgentLocation(agentId) {
        return this.agentLocations.get(agentId) || null;
    }
    async getAgentLocations() {
        const locations = [];
        for (const [agentId, location] of this.agentLocations) {
            locations.push({ agentId, location });
        }
        return locations;
    }
    async getZoneEvents(zoneId, startDate, endDate, siteId) {
        const where = { zoneId };
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
    async getAgentEvents(agentId, startDate, endDate) {
        const where = { agentId };
        if (startDate && endDate) {
            where.timestamp = { gte: startDate, lte: endDate };
        }
        return await prisma.geofenceEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' }
        });
    }
    async createZone(zoneData) {
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
    async createRule(ruleData) {
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
            conditions: rule.conditions,
            trigger: rule.trigger,
            actions: this.parseActions(rule.actions),
            isActive: rule.isActive,
            zoneId: rule.zoneId,
            siteId: rule.siteId,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt
        };
    }
    async updateZone(zoneId, updates) {
        const updateData = {};
        if (updates.name !== undefined)
            updateData.name = updates.name;
        if (updates.coordinates !== undefined)
            updateData.coordinates = updates.coordinates;
        if (updates.isActive !== undefined)
            updateData.isActive = updates.isActive;
        const zone = await prisma.geofenceZone.update({
            where: { id: zoneId },
            data: updateData,
        });
        const updatedZone = this.mapZoneToGeofenceZone(zone);
        this.zones.set(zoneId, updatedZone);
        return updatedZone;
    }
    async deleteZone(zoneId) {
        await prisma.geofenceZone.delete({
            where: { id: zoneId }
        });
        this.zones.delete(zoneId);
    }
    async getZones(siteId) {
        const where = siteId ? { siteId, isActive: true } : { isActive: true };
        return await prisma.geofenceZone.findMany({
            where,
            include: { geofenceRules: true }
        });
    }
    async getRecentLocationUpdates(agentId, limit = 100) {
        const where = agentId ? { agentId } : {};
        const locations = await prisma.locationUpdate.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit
        });
        return locations.map((loc) => ({
            agentId: loc.agentId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp,
            speed: loc.speed,
            heading: loc.heading,
        }));
    }
    async getAgentLocationHistory(agentId, startDate, endDate) {
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
        return locations.map((loc) => ({
            agentId: loc.agentId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp,
            speed: loc.speed,
            heading: loc.heading,
        }));
    }
    async getSiteLocationHistory(siteId, startDate, endDate) {
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
        return locations.map((loc) => ({
            agentId: loc.agentId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp,
            speed: loc.speed,
            heading: loc.heading,
        }));
    }
    mapZoneToGeofenceZone(zone) {
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
    parseCoordinates(coordinates) {
        if (Array.isArray(coordinates)) {
            return coordinates.map((coord) => ({
                latitude: coord.latitude,
                longitude: coord.longitude,
            }));
        }
        else if (typeof coordinates === 'string') {
            return JSON.parse(coordinates);
        }
        else {
            throw new Error('Invalid coordinates format');
        }
    }
    parseActions(actions) {
        if (Array.isArray(actions)) {
            return actions.map((action) => ({
                type: action.type,
                parameters: action.parameters || {},
            }));
        }
        else if (typeof actions === 'string') {
            return JSON.parse(actions);
        }
        else {
            return [];
        }
    }
}
exports.GeofencingService = GeofencingService;
exports.geofencingService = GeofencingService.getInstance();
//# sourceMappingURL=geofencingService.js.map