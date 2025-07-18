const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createRecentTrackingData() {
  try {
    console.log('🔄 Creating recent tracking data...');

    // Create more recent tracking logs (last 10 minutes)
    const recentTrackingLogs = [
      {
        id: 'tracking-recent-1',
        agentId: 'sample-agent-1',
        siteId: 'sample-site-1',
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5.0,
        status: 'active',
        battery: 85,
        timestamp: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      },
      {
        id: 'tracking-recent-2',
        agentId: 'sample-agent-2',
        siteId: 'sample-site-2',
        latitude: 40.7589,
        longitude: -73.9851,
        accuracy: 3.0,
        status: 'active',
        battery: 92,
        timestamp: new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
      },
      {
        id: 'tracking-recent-3',
        agentId: 'sample-agent-1',
        siteId: 'sample-site-1',
        latitude: 40.7130,
        longitude: -74.0058,
        accuracy: 4.0,
        status: 'active',
        battery: 84,
        timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        id: 'tracking-recent-4',
        agentId: 'sample-agent-2',
        siteId: 'sample-site-2',
        latitude: 40.7591,
        longitude: -73.9849,
        accuracy: 6.0,
        status: 'active',
        battery: 91,
        timestamp: new Date(Date.now() - 3 * 60 * 1000) // 3 minutes ago
      }
    ];

    for (const log of recentTrackingLogs) {
      await prisma.trackingLog.upsert({
        where: { id: log.id },
        update: {
          latitude: log.latitude,
          longitude: log.longitude,
          accuracy: log.accuracy,
          status: log.status,
          battery: log.battery,
          timestamp: log.timestamp
        },
        create: log
      });
    }

    console.log('✅ Recent tracking data created successfully!');
    console.log(`📍 Created ${recentTrackingLogs.length} recent tracking logs`);
    console.log('🕐 All logs are within the last 5 minutes');

  } catch (error) {
    console.error('❌ Error creating recent tracking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRecentTrackingData();
