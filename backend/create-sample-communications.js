const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleCommunications() {
  try {
    console.log('🔄 Creating sample communication data...');

    // Create a communication group first
    const securityGroup = await prisma.communicationGroup.upsert({
      where: { id: 'group-security-team' },
      update: {},
      create: {
        id: 'group-security-team',
        name: 'Security Team',
        description: 'Main security operations team communication group',
        type: 'DEPARTMENT',
        isActive: true,
        isPrivate: false,
        createdById: 'sample-user-agent-1'
      }
    });

    // Add members to the group
    await prisma.communicationGroupMember.upsert({
      where: { 
        groupId_userId: {
          groupId: securityGroup.id,
          userId: 'sample-user-agent-1'
        }
      },
      update: {},
      create: {
        groupId: securityGroup.id,
        userId: 'sample-user-agent-1',
        role: 'ADMIN'
      }
    });

    await prisma.communicationGroupMember.upsert({
      where: { 
        groupId_userId: {
          groupId: securityGroup.id,
          userId: 'sample-user-agent-2'
        }
      },
      update: {},
      create: {
        groupId: securityGroup.id,
        userId: 'sample-user-agent-2',
        role: 'MEMBER'
      }
    });

    // Create sample communications
    const communications = [
      {
        id: 'comm-1',
        senderId: 'sample-user-agent-1',
        type: 'MESSAGE',
        subject: 'Shift Change Notification',
        content: 'Reminder: Shift change at 6 PM today. Please ensure proper handover documentation.',
        priority: 'NORMAL',
        groupId: securityGroup.id,
        isUrgent: false,
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: 'comm-2',
        senderId: 'sample-user-agent-2',
        type: 'ALERT',
        subject: 'Equipment Check Required',
        content: 'Radio equipment in sector B needs battery replacement. Please check before next shift.',
        priority: 'HIGH',
        isUrgent: true,
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        id: 'comm-3',
        senderId: 'sample-user-agent-1',
        type: 'ANNOUNCEMENT',
        subject: 'Security Protocol Update',
        content: 'New visitor check-in procedures are now in effect. Please review the updated guidelines in the security manual.',
        priority: 'NORMAL',
        isUrgent: false,
        sentAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        id: 'comm-4',
        senderId: 'sample-user-agent-2',
        type: 'EMERGENCY',
        subject: 'Emergency Drill Scheduled',
        content: 'Fire drill scheduled for tomorrow at 2 PM. All personnel must participate.',
        priority: 'URGENT',
        isUrgent: true,
        sentAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      }
    ];

    for (const comm of communications) {
      await prisma.communication.upsert({
        where: { id: comm.id },
        update: {
          subject: comm.subject,
          content: comm.content,
          priority: comm.priority,
          isUrgent: comm.isUrgent,
          sentAt: comm.sentAt
        },
        create: comm
      });

      // Create message recipients for each communication
      const recipients = comm.groupId ? 
        ['sample-user-agent-1', 'sample-user-agent-2'] : 
        ['sample-user-agent-2']; // Single recipient for non-group messages

      for (const recipientId of recipients) {
        if (recipientId !== comm.senderId) { // Don't send to self
          await prisma.messageRecipient.upsert({
            where: {
              communicationId_userId: {
                communicationId: comm.id,
                userId: recipientId
              }
            },
            update: {},
            create: {
              communicationId: comm.id,
              userId: recipientId,
              deliveredAt: new Date(comm.sentAt.getTime() + 1000), // Delivered 1 second after sent
              readAt: Math.random() > 0.5 ? new Date(comm.sentAt.getTime() + 60000) : null // 50% chance of being read
            }
          });
        }
      }
    }

    console.log('✅ Sample communication data created successfully!');
    console.log(`📨 Created ${communications.length} communications`);
    console.log(`👥 Created 1 communication group with 2 members`);
    console.log('📊 Communication breakdown:');
    console.log('  - 1 Internal message');
    console.log('  - 1 Alert (HIGH priority)');
    console.log('  - 1 Broadcast');
    console.log('  - 1 Emergency alert (URGENT priority)');

  } catch (error) {
    console.error('❌ Error creating sample communications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleCommunications();
