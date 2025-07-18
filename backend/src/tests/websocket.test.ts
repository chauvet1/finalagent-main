import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import WebSocketService from '../services/websocketService';
import { redisClient } from '../config/redis';

describe('WebSocket Service', () => {
  let httpServer: any;
  let wsService: WebSocketService;
  let clientSocket: any;
  let serverSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    wsService = new WebSocketService(httpServer, redisClient);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: 'test-token'
        }
      });
      
      wsService['io'].on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    wsService['io'].close();
    clientSocket.close();
    httpServer.close();
    redisClient.quit();
  });

  test('should connect successfully', () => {
    expect(clientSocket.connected).toBe(true);
  });

  test('should handle location updates', (done) => {
    const locationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      batteryLevel: 85
    };

    serverSocket.on('location_update', (data: any) => {
      expect(data.location.latitude).toBe(locationData.latitude);
      expect(data.location.longitude).toBe(locationData.longitude);
      done();
    });

    clientSocket.emit('location_update', locationData);
  });

  test('should handle emergency alerts', (done) => {
    const alertData = {
      type: 'PANIC',
      description: 'Test emergency alert',
      location: {
        latitude: 40.7128,
        longitude: -74.0060
      }
    };

    serverSocket.on('emergency_alert', (data: any) => {
      expect(data.type).toBe(alertData.type);
      expect(data.description).toBe(alertData.description);
      done();
    });

    clientSocket.emit('emergency_alert', alertData);
  });

  test('should handle room joining', (done) => {
    const roomId = 'test-room';

    serverSocket.on('user_joined', (data: any) => {
      expect(data.userId).toBeDefined();
      done();
    });

    clientSocket.emit('join_room', { roomId });
  });

  test('should handle messaging', (done) => {
    const messageData = {
      type: 'chat_message',
      payload: {
        text: 'Hello, this is a test message'
      },
      recipientId: 'test-recipient',
      priority: 'normal'
    };

    serverSocket.on('message_sent', (data: any) => {
      expect(data.messageId).toBeDefined();
      done();
    });

    clientSocket.emit('send_message', messageData);
  });
});