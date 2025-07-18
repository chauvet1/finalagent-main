const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('🔄 Creating sample tracking data...');

    // Create a sample user first
    const clientUser = await prisma.user.upsert({
      where: { id: 'sample-user-client-1' },
      update: {},
      create: {
        id: 'sample-user-client-1',
        clerkId: 'sample-clerk-client-1',
        email: 'client@demo.com',
        firstName: 'John',
        lastName: 'Manager',
        role: 'CLIENT',
        status: 'ACTIVE'
      }
    });

    // Create a sample client profile
    const clientProfile = await prisma.clientProfile.upsert({
      where: { id: 'sample-client-1' },
      update: {},
      create: {
        id: 'sample-client-1',
        userId: clientUser.id,
        companyName: 'Demo Security Corp',
        contactPerson: 'John Manager',
        phone: '+1-555-0123',
        address: '123 Business Ave',
        city: 'Demo City',
        country: 'USA',
        industry: 'Security Services',
        companySize: 'MEDIUM',
        serviceLevel: 'PREMIUM'
      }
    });

    // Create sample sites
    const site1 = await prisma.site.upsert({
      where: { id: 'sample-site-1' },
      update: {},
      create: {
        id: 'sample-site-1',
        name: 'Downtown Office Complex',
        address: '456 Main Street, Downtown',
        city: 'Demo City',
        country: 'USA',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        clientId: clientProfile.id,
        type: 'OFFICE',
        status: 'ACTIVE',
        securityLevel: 'HIGH',
        maxAgents: 3,
        description: 'Large office complex requiring 24/7 security coverage'
      }
    });

    const site2 = await prisma.site.upsert({
      where: { id: 'sample-site-2' },
      update: {},
      create: {
        id: 'sample-site-2',
        name: 'Warehouse District',
        address: '789 Industrial Blvd',
        city: 'Demo City',
        country: 'USA',
        coordinates: {
          latitude: 40.7589,
          longitude: -73.9851
        },
        clientId: clientProfile.id,
        type: 'INDUSTRIAL',
        status: 'ACTIVE',
        securityLevel: 'MEDIUM',
        maxAgents: 2,
        description: 'Warehouse facility with perimeter security needs'
      }
    });

    // Create sample agent users
    const agentUser1 = await prisma.user.upsert({
      where: { id: 'sample-user-agent-1' },
      update: {},
      create: {
        id: 'sample-user-agent-1',
        clerkId: 'sample-clerk-agent-1',
        email: 'agent1@demo.com',
        firstName: 'Mike',
        lastName: 'Security',
        role: 'AGENT',
        status: 'ACTIVE'
      }
    });

    const agentUser2 = await prisma.user.upsert({
      where: { id: 'sample-user-agent-2' },
      update: {},
      create: {
        id: 'sample-user-agent-2',
        clerkId: 'sample-clerk-agent-2',
        email: 'agent2@demo.com',
        firstName: 'Sarah',
        lastName: 'Guard',
        role: 'AGENT',
        status: 'ACTIVE'
      }
    });

    // Create sample agent profiles
    const agent1 = await prisma.agentProfile.upsert({
      where: { id: 'sample-agent-1' },
      update: {},
      create: {
        id: 'sample-agent-1',
        userId: agentUser1.id,
        employeeId: 'EMP001',
        phone: '+1-555-0101',
        emergencyContact: 'Jane Doe - +1-555-0102',
        hireDate: new Date('2024-01-15'),
        certifications: ['Basic Security', 'First Aid'],
        skills: ['Patrol', 'Surveillance'],
        rating: 4.5,
        completedShifts: 25
      }
    });

    const agent2 = await prisma.agentProfile.upsert({
      where: { id: 'sample-agent-2' },
      update: {},
      create: {
        id: 'sample-agent-2',
        userId: agentUser2.id,
        employeeId: 'EMP002',
        phone: '+1-555-0201',
        emergencyContact: 'Bob Smith - +1-555-0202',
        hireDate: new Date('2024-02-01'),
        certifications: ['Advanced Security', 'CPR'],
        skills: ['Patrol', 'Emergency Response'],
        rating: 4.8,
        completedShifts: 18
      }
    });

    // Create active shifts
    const shift1 = await prisma.shift.upsert({
      where: { id: 'sample-shift-1' },
      update: {},
      create: {
        id: 'sample-shift-1',
        agentId: agent1.id,
        siteId: site1.id,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // Ends in 6 hours
        status: 'IN_PROGRESS',
        type: 'Regular Patrol',
        notes: 'Standard security patrol shift'
      }
    });

    const shift2 = await prisma.shift.upsert({
      where: { id: 'sample-shift-2' },
      update: {},
      create: {
        id: 'sample-shift-2',
        agentId: agent2.id,
        siteId: site2.id,
        startTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // Started 1 hour ago
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000), // Ends in 7 hours
        status: 'IN_PROGRESS',
        type: 'Warehouse Security',
        notes: 'Warehouse perimeter monitoring'
      }
    });

    // Create recent tracking logs
    const trackingLogs = [
      {
        id: 'tracking-1',
        agentId: agent1.id,
        siteId: site1.id,
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5.0,
        status: 'active',
        battery: 85,
        timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        id: 'tracking-2',
        agentId: agent2.id,
        siteId: site2.id,
        latitude: 40.7589,
        longitude: -73.9851,
        accuracy: 3.0,
        status: 'active',
        battery: 92,
        timestamp: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      },
      {
        id: 'tracking-3',
        agentId: agent1.id,
        siteId: site1.id,
        latitude: 40.7130,
        longitude: -74.0058,
        accuracy: 4.0,
        status: 'active',
        battery: 84,
        timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    ];

    for (const log of trackingLogs) {
      await prisma.trackingLog.upsert({
        where: { id: log.id },
        update: {},
        create: log
      });
    }

    console.log('✅ Sample tracking data created successfully!');
    console.log(`📍 Created ${trackingLogs.length} tracking logs`);
    console.log(`👥 Created 2 agents with active shifts`);
    console.log(`🏢 Created 2 sites`);
    console.log(`🔄 Created 2 active shifts`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();
