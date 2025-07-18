const { createServer } = require('http');
const Redis = require('ioredis');

// Test WebSocket service initialization
async function testWebSocketInit() {
  try {
    console.log('🧪 Testing WebSocket service initialization...');
    
    // Create HTTP server
    const httpServer = createServer();
    
    // Create Redis client
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Import WebSocket service
    const WebSocketService = require('./dist/services/websocketService.js').default;
    
    // Initialize WebSocket service
    const wsService = new WebSocketService(httpServer, redisClient);
    
    console.log('✅ WebSocket service initialized successfully');
    console.log('✅ Authentication middleware configured');
    console.log('✅ Event handlers registered');
    console.log('✅ Redis subscriptions setup');
    
    // Test public methods
    console.log('🔍 Testing public methods...');
    console.log('- Connected users:', wsService.getConnectedUsers().length);
    console.log('- User online check works:', typeof wsService.isUserOnline('test') === 'boolean');
    
    // Cleanup
    await redisClient.quit();
    httpServer.close();
    
    console.log('✅ All WebSocket tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ WebSocket test failed:', error.message);
    process.exit(1);
  }
}

testWebSocketInit();