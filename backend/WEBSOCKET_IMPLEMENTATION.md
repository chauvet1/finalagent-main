# WebSocket Real-Time Communication Implementation

## Overview
This document outlines the complete WebSocket real-time communication system implemented for the BahinLink Security Workforce Management platform.

## Components Implemented

### 1. WebSocket Service (`src/services/websocketService.ts`)
- **Authentication**: Clerk-based JWT token verification
- **Connection Management**: User session tracking and room management
- **Real-time Features**:
  - Location updates and broadcasting
  - Emergency alert system
  - Messaging and chat functionality
  - Status updates
  - Typing indicators
  - User presence tracking

### 2. Location Service (`src/services/locationService.ts`)
- **Location Tracking**: Real-time agent location updates
- **Geofence Monitoring**: Automatic violation detection
- **Location History**: Historical tracking data management
- **Caching**: Redis-based location caching for performance
- **Analytics**: Tracking statistics and reporting

### 3. Emergency Alert Service (`src/services/emergencyAlertService.ts`)
- **Alert Types**: PANIC, MEDICAL, SECURITY, FIRE, GENERAL
- **Escalation System**: Multi-level alert escalation
- **Alert Management**: Acknowledge and resolve alerts
- **Notification Channels**: WebSocket, email, SMS, push notifications
- **Alert History**: Complete audit trail

## Key Features

### Real-Time Location Broadcasting
- Agents send location updates via WebSocket
- Supervisors receive real-time location data
- Automatic geofence violation detection
- Battery level and accuracy monitoring
- Location history tracking with configurable retention

### Emergency Alert System
- Instant alert creation and broadcasting
- Multi-level escalation (3 levels by default)
- Automatic escalation timers
- Alert acknowledgment and resolution
- Priority-based alert handling (HIGH/CRITICAL)

### Communication Features
- Private messaging between users
- Group/room-based communication
- Broadcast messages to roles
- Message queuing for offline users
- Typing indicators
- Message priority levels

### Authentication & Security
- Clerk JWT token verification
- Role-based access control
- Rate limiting middleware
- Secure WebSocket connections
- User session management

## API Endpoints

### Emergency Alerts
- `GET /api/emergency-alerts` - Get active alerts
- `GET /api/emergency-alerts/:alertId` - Get alert details
- `POST /api/emergency-alerts/:alertId/acknowledge` - Acknowledge alert
- `POST /api/emergency-alerts/:alertId/resolve` - Resolve alert

### Location Management
- `GET /api/locations/current` - Get current agent locations
- `GET /api/locations/history/:agentId` - Get location history

### Tracking
- `POST /api/tracking/location` - Update agent location
- `GET /api/tracking/agents/current` - Get current agent locations
- `GET /api/tracking/agents/:agentId/history` - Get location history
- `GET /api/tracking/stats` - Get tracking statistics
- `POST /api/tracking/geofence/validate` - Validate geofence
- `DELETE /api/tracking/cleanup` - Cleanup old tracking data

## WebSocket Events

### Client to Server Events
- `location_update` - Send location update
- `emergency_alert` - Trigger emergency alert
- `send_message` - Send message
- `join_room` - Join chat room
- `leave_room` - Leave chat room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `status_update` - Update user status

### Server to Client Events
- `location_update` - Broadcast location update
- `emergency_alert` - Broadcast emergency alert
- `geofence_violation` - Geofence violation alert
- `alert_acknowledged` - Alert acknowledgment notification
- `alert_resolved` - Alert resolution notification
- `message` - Receive message
- `user_joined` - User joined room
- `user_left` - User left room
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `user_status_change` - User online/offline status

## Database Integration

### Models Used
- `TrackingLog` - Location tracking data
- `Incident` - Emergency alerts and violations
- `Communication` - Messages and communications
- `AgentProfile` - Agent information
- `Shift` - Current shift information
- `Site` - Site and geofence data

### Caching Strategy
- Redis for real-time location data
- Message queuing for offline users
- Alert escalation scheduling
- User session management

## Configuration

### Environment Variables
```env
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

### WebSocket Configuration
- CORS enabled for specified origins
- Ping timeout: 60 seconds
- Ping interval: 25 seconds
- Transports: WebSocket and polling fallback

## Error Handling
- Comprehensive error logging
- Graceful degradation for offline scenarios
- Automatic reconnection support
- Rate limiting protection
- Input validation and sanitization

## Performance Optimizations
- Redis caching for frequently accessed data
- Connection pooling for database operations
- Efficient room management
- Message queuing for offline users
- Automatic cleanup of old data

## Security Features
- JWT token verification
- Role-based access control
- Rate limiting per user
- Input validation
- Secure WebSocket connections
- User session tracking

## Testing
- Unit tests for WebSocket service
- Integration tests for real-time features
- Mock authentication for testing
- Test coverage for critical paths

## Deployment Considerations
- Redis server required for production
- WebSocket load balancing support
- Horizontal scaling capabilities
- Health check endpoints
- Monitoring and logging integration

## Future Enhancements
- Push notification integration
- Advanced analytics dashboard
- Custom alert escalation rules
- Multi-language support
- Mobile app WebSocket integration