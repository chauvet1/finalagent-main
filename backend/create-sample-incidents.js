const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleIncidents() {
  try {
    console.log('🔄 Creating sample incident data...');

    // Create sample incidents
    const incidents = [
      {
        id: 'incident-1',
        title: 'Unauthorized Access Attempt',
        description: 'Security camera detected someone attempting to access restricted area without proper credentials.',
        type: 'SECURITY_BREACH',
        severity: 'HIGH',
        status: 'OPEN',
        siteId: 'sample-site-1',
        location: 'Main Entrance - Door A',
        reportedById: 'sample-agent-1',
        occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        evidence: {
          photos: ['camera_feed_001.jpg'],
          description: 'Individual wearing dark clothing, no visible ID badge'
        }
      },
      {
        id: 'incident-2',
        title: 'Equipment Malfunction',
        description: 'Fire alarm system showing false positive alerts in warehouse section B.',
        type: 'TECHNICAL_ISSUE',
        severity: 'MEDIUM',
        status: 'IN_PROGRESS',
        siteId: 'sample-site-2',
        location: 'Warehouse Section B',
        reportedById: 'sample-agent-2',
        occurredAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        evidence: {
          notes: 'System diagnostics show sensor malfunction in zone B-12'
        }
      },
      {
        id: 'incident-3',
        title: 'Suspicious Vehicle',
        description: 'Unidentified vehicle parked in restricted area for extended period.',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'LOW',
        status: 'RESOLVED',
        siteId: 'sample-site-1',
        location: 'Parking Lot - Zone C',
        reportedById: 'sample-agent-1',
        occurredAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        evidence: {
          photos: ['vehicle_plate_001.jpg'],
          notes: 'Vehicle owner contacted and verified as authorized visitor'
        }
      },
      {
        id: 'incident-4',
        title: 'Medical Emergency',
        description: 'Employee reported feeling unwell, first aid administered.',
        type: 'MEDICAL_EMERGENCY',
        severity: 'CRITICAL',
        status: 'RESOLVED',
        siteId: 'sample-site-1',
        location: 'Office Floor 2 - Break Room',
        reportedById: 'sample-agent-1',
        occurredAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        resolvedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
        evidence: {
          notes: 'Paramedics called, employee transported to hospital, full recovery expected'
        }
      }
    ];

    for (const incident of incidents) {
      await prisma.incident.upsert({
        where: { id: incident.id },
        update: {
          title: incident.title,
          description: incident.description,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          location: incident.location,
          occurredAt: incident.occurredAt,
          resolvedAt: incident.resolvedAt,
          evidence: incident.evidence
        },
        create: incident
      });
    }

    console.log('✅ Sample incident data created successfully!');
    console.log(`📋 Created ${incidents.length} incidents`);
    console.log('🔍 Incident breakdown:');
    console.log('  - 1 Open incident (HIGH severity)');
    console.log('  - 1 In Progress incident (MEDIUM severity)');
    console.log('  - 2 Resolved incidents (LOW and CRITICAL severity)');

  } catch (error) {
    console.error('❌ Error creating sample incidents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleIncidents();
