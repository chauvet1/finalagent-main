import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDashboardData() {
  console.log('🌱 Seeding dashboard data...');

  try {
    // Create a test client if it doesn't exist
    let client = await prisma.client.findFirst({
      where: { name: 'BahinLink Demo Client' }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: 'BahinLink Demo Client',
          contactEmail: 'demo@bahinlink.com',
          contactPhone: '+1-555-0123',
          address: '123 Security Street, Demo City, DC 12345',
          status: 'ACTIVE',
          contractStartDate: new Date('2024-01-01'),
          contractEndDate: new Date('2025-12-31'),
          billingCycle: 'MONTHLY'
        }
      });
      console.log('✅ Created demo client');
    }

    // Create test users
    const users = [];
    for (let i = 1; i <= 5; i++) {
      let user = await prisma.user.findFirst({
        where: { email: `agent${i}@bahinlink.com` }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `agent${i}@bahinlink.com`,
            firstName: `Agent`,
            lastName: `${i}`,
            role: 'AGENT',
            status: 'ACTIVE'
          }
        });
      }
      users.push(user);
    }
    console.log('✅ Created demo users');

    // Create test sites
    const sites = [];
    const siteNames = ['Downtown Office', 'Warehouse District', 'Shopping Mall', 'Corporate Campus'];
    
    for (let i = 0; i < siteNames.length; i++) {
      let site = await prisma.site.findFirst({
        where: { name: siteNames[i], clientId: client.id }
      });

      if (!site) {
        site = await prisma.site.create({
          data: {
            name: siteNames[i],
            address: `${100 + i * 10} Demo Street, Demo City, DC 1234${i}`,
            clientId: client.id,
            status: 'ACTIVE',
            securityLevel: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
            coordinates: {
              latitude: 40.7128 + (i * 0.01),
              longitude: -74.0060 + (i * 0.01)
            }
          }
        });
      }
      sites.push(site);
    }
    console.log('✅ Created demo sites');

    // Create agent profiles
    const agentProfiles = [];
    for (let i = 0; i < users.length; i++) {
      let agentProfile = await prisma.agentProfile.findFirst({
        where: { userId: users[i].id }
      });

      if (!agentProfile) {
        agentProfile = await prisma.agentProfile.create({
          data: {
            userId: users[i].id,
            badgeNumber: `BADGE${1000 + i}`,
            hireDate: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)), // Hired i months ago
            status: 'ACTIVE',
            currentSiteId: sites[i % sites.length].id,
            emergencyContact: {
              name: `Emergency Contact ${i + 1}`,
              phone: `+1-555-010${i}`,
              relationship: 'Spouse'
            }
          }
        });
      }
      agentProfiles.push(agentProfile);
    }
    console.log('✅ Created agent profiles');

    // Create active shifts
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (let i = 0; i < 3; i++) {
      const shiftStart = new Date(today.getTime() + (8 + i * 8) * 60 * 60 * 1000); // 8am, 4pm, 12am
      
      const existingShift = await prisma.shift.findFirst({
        where: {
          agentId: agentProfiles[i].id,
          startTime: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!existingShift) {
        await prisma.shift.create({
          data: {
            agentId: agentProfiles[i].id,
            siteId: sites[i % sites.length].id,
            startTime: shiftStart,
            endTime: null, // Active shift
            status: 'IN_PROGRESS',
            notes: `Active shift for ${users[i].firstName} ${users[i].lastName}`
          }
        });
      }
    }
    console.log('✅ Created active shifts');

    // Create recent reports
    for (let i = 0; i < 10; i++) {
      const reportDate = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // Every 2 hours back
      
      const existingReport = await prisma.report.findFirst({
        where: {
          title: `Demo Report ${i + 1}`,
          agentId: agentProfiles[i % agentProfiles.length].id
        }
      });

      if (!existingReport) {
        await prisma.report.create({
          data: {
            title: `Demo Report ${i + 1}`,
            description: `This is a demo report #${i + 1} for testing dashboard functionality.`,
            type: ['INCIDENT', 'PATROL', 'MAINTENANCE'][i % 3],
            status: ['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED'][i % 4],
            priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
            agentId: agentProfiles[i % agentProfiles.length].id,
            siteId: sites[i % sites.length].id,
            createdAt: reportDate,
            updatedAt: reportDate
          }
        });
      }
    }
    console.log('✅ Created demo reports');

    // Create recent incidents
    for (let i = 0; i < 5; i++) {
      const incidentDate = new Date(now.getTime() - (i * 4 * 60 * 60 * 1000)); // Every 4 hours back
      
      const existingIncident = await prisma.incident.findFirst({
        where: {
          title: `Demo Incident ${i + 1}`,
          siteId: sites[i % sites.length].id
        }
      });

      if (!existingIncident) {
        await prisma.incident.create({
          data: {
            title: `Demo Incident ${i + 1}`,
            description: `This is a demo incident #${i + 1} for testing dashboard functionality.`,
            type: ['SECURITY_BREACH', 'EMERGENCY', 'SAFETY_VIOLATION'][i % 3],
            severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4],
            status: ['OPEN', 'IN_PROGRESS', 'RESOLVED'][i % 3],
            siteId: sites[i % sites.length].id,
            reporterId: users[i % users.length].id,
            occurredAt: incidentDate,
            location: `Location ${i + 1} at ${sites[i % sites.length].name}`,
            createdAt: incidentDate,
            updatedAt: incidentDate
          }
        });
      }
    }
    console.log('✅ Created demo incidents');

    console.log('🎉 Dashboard seed data completed successfully!');
    console.log('📊 Summary:');
    console.log(`- Client: ${client.name}`);
    console.log(`- Sites: ${sites.length}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Agent Profiles: ${agentProfiles.length}`);
    console.log('- Active Shifts: 3');
    console.log('- Reports: 10');
    console.log('- Incidents: 5');

  } catch (error) {
    console.error('❌ Error seeding dashboard data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedDashboardData()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDashboardData;
