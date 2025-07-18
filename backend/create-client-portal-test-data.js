const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createClientPortalTestData() {
  try {
    console.log('Creating client portal test data...');

    // Create a test client user first
    const clientUser = await prisma.user.upsert({
      where: { email: 'client@demo.com' },
      update: {},
      create: {
        clerkId: 'client_demo_clerk_id',
        email: 'client@demo.com',
        firstName: 'Demo',
        lastName: 'Client',
        role: 'CLIENT'
      }
    });

    // Create a client profile
    const client = await prisma.clientProfile.upsert({
      where: { userId: clientUser.id },
      update: {},
      create: {
        userId: clientUser.id,
        companyName: 'Demo Security Client',
        contactPerson: 'Demo Client',
        phone: '555-0123',
        address: '123 Business Plaza',
        city: 'Demo City',
        country: 'USA'
      }
    });

    console.log('Created client:', client.companyName);

    // Create test sites for the client
    // First check if sites already exist
    const existingSite1 = await prisma.site.findFirst({
      where: { name: 'Downtown Office Complex', clientId: client.id }
    });

    const site1 = existingSite1 || await prisma.site.create({
      data: {
        name: 'Downtown Office Complex',
        clientId: client.id,
        address: '456 Downtown Ave',
        city: 'Demo City',
        country: 'USA',
        coordinates: {
          latitude: 34.0522,
          longitude: -118.2437
        },
        type: 'OFFICE',
        status: 'ACTIVE',
        securityLevel: 'HIGH'
      }
    });

    const existingSite2 = await prisma.site.findFirst({
      where: { name: 'Warehouse District', clientId: client.id }
    });

    const site2 = existingSite2 || await prisma.site.create({
      data: {
        name: 'Warehouse District',
        clientId: client.id,
        address: '789 Industrial Blvd',
        city: 'Demo City',
        country: 'USA',
        coordinates: {
          latitude: 34.0622,
          longitude: -118.2537
        },
        type: 'INDUSTRIAL',
        status: 'ACTIVE',
        securityLevel: 'MEDIUM'
      }
    });

    console.log('Created sites:', site1.name, site2.name);

    // Create test users and agents
    const user1 = await prisma.user.upsert({
      where: { email: 'agent1@demo.com' },
      update: {},
      create: {
        clerkId: 'agent1_demo_clerk_id',
        email: 'agent1@demo.com',
        firstName: 'John',
        lastName: 'Security',
        role: 'AGENT',
        status: 'ACTIVE'
      }
    });

    const user2 = await prisma.user.upsert({
      where: { email: 'agent2@demo.com' },
      update: {},
      create: {
        clerkId: 'agent2_demo_clerk_id',
        email: 'agent2@demo.com',
        firstName: 'Jane',
        lastName: 'Guard',
        role: 'AGENT',
        status: 'ACTIVE'
      }
    });

    // Create agent profiles
    const agent1 = await prisma.agentProfile.upsert({
      where: { userId: user1.id },
      update: {},
      create: {
        userId: user1.id,
        employeeId: `EMP001_${Date.now()}`,
        hireDate: new Date('2023-01-15'),
        currentSiteId: site1.id
      }
    });

    const agent2 = await prisma.agentProfile.upsert({
      where: { userId: user2.id },
      update: {},
      create: {
        userId: user2.id,
        employeeId: `EMP002_${Date.now()}`,
        hireDate: new Date('2023-02-01'),
        currentSiteId: site2.id
      }
    });

    console.log('Created agents:', user1.firstName, user2.firstName);

    // Create test shifts
    const today = new Date();
    const shift1 = await prisma.shift.create({
      data: {
        agentId: agent1.id,
        siteId: site1.id,
        startTime: new Date(today.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        endTime: new Date(today.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        status: 'IN_PROGRESS'
      }
    });

    const shift2 = await prisma.shift.create({
      data: {
        agentId: agent2.id,
        siteId: site2.id,
        startTime: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        endTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), // 6 hours from now
        status: 'IN_PROGRESS'
      }
    });

    console.log('Created shifts for both agents');

    // Create test reports
    const report1 = await prisma.report.create({
      data: {
        title: 'Daily Security Patrol Report',
        type: 'DAILY',
        content: 'Completed routine patrol of all areas. No incidents observed. All entry points secure.',
        status: 'APPROVED',
        authorId: agent1.id,
        siteId: site1.id,
        reportDate: new Date(today.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    });

    const report2 = await prisma.report.create({
      data: {
        title: 'Incident Report - Unauthorized Access Attempt',
        type: 'INCIDENT',
        content: 'Individual attempted to access restricted area at 14:30. Security protocols followed, individual escorted off premises.',
        status: 'APPROVED',
        authorId: agent2.id,
        siteId: site2.id,
        reportDate: new Date(today.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    });

    console.log('Created test reports');

    // Create test incidents
    const incident1 = await prisma.incident.create({
      data: {
        title: 'Suspicious Activity',
        type: 'SECURITY_BREACH',
        description: 'Unidentified person observed near loading dock',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        occurredAt: new Date(today.getTime() - 3 * 60 * 60 * 1000),
        reportedById: agent1.id,
        siteId: site1.id
      }
    });

    console.log('Created test incident');

    // Create test service requests
    const serviceRequest1 = await prisma.clientRequest.create({
      data: {
        clientId: client.id,
        type: 'ADDITIONAL_SECURITY',
        title: 'Additional Evening Patrol',
        description: 'Request for additional patrol coverage during evening hours due to recent incidents in the area',
        priority: 'HIGH',
        status: 'PENDING',
        siteId: site1.id
      }
    });

    const serviceRequest2 = await prisma.clientRequest.create({
      data: {
        clientId: client.id,
        type: 'MAINTENANCE',
        title: 'Security Camera Maintenance',
        description: 'Camera #3 in parking lot needs cleaning and adjustment',
        priority: 'NORMAL',
        status: 'IN_PROGRESS',
        siteId: site2.id
      }
    });

    console.log('Created test service requests');

    // Create test attendance records
    const attendance1 = await prisma.attendance.create({
      data: {
        agentId: agent1.id,
        siteId: site1.id,
        clockInTime: new Date(today.getTime() - 4 * 60 * 60 * 1000),
        status: 'ACTIVE'
      }
    });

    const attendance2 = await prisma.attendance.create({
      data: {
        agentId: agent2.id,
        siteId: site2.id,
        clockInTime: new Date(today.getTime() - 2 * 60 * 60 * 1000),
        status: 'ACTIVE'
      }
    });

    console.log('Created test attendance records');

    console.log('✅ Client portal test data created successfully!');
    console.log('📧 Test client email: client@demo.com');
    console.log('🏢 Sites created: Downtown Office Complex, Warehouse District');
    console.log('👮 Agents created: John Security, Jane Guard');
    console.log('📊 Sample reports, incidents, and service requests created');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createClientPortalTestData();