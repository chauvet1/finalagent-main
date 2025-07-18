import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTrainingData() {
  console.log('🌱 Seeding training data...');

  try {
    // First, let's check if we have any users to use as creators
    const users = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      take: 1
    });

    if (users.length === 0) {
      console.log('❌ No admin users found. Please create an admin user first.');
      return;
    }

    const adminUser = users[0];
    console.log(`✅ Using admin user: ${adminUser.firstName} ${adminUser.lastName}`);

    // Create sample trainings
    const training1 = await prisma.training.create({
      data: {
        title: 'Security Protocols Training',
        description: 'Comprehensive training on security protocols and procedures for all security personnel.',
        type: 'SAFETY',
        category: 'Security Operations',
        duration: 120, // 2 hours
        isRequired: true,
        validityPeriod: 365, // 1 year
        prerequisites: ['Basic Security Orientation'],
        createdBy: adminUser.id
      }
    });

    const training2 = await prisma.training.create({
      data: {
        title: 'Customer Service Excellence',
        description: 'Advanced customer service techniques and best practices for client interaction.',
        type: 'SOFT_SKILLS',
        category: 'Customer Relations',
        duration: 90, // 1.5 hours
        isRequired: false,
        validityPeriod: 730, // 2 years
        prerequisites: [],
        createdBy: adminUser.id
      }
    });

    const training3 = await prisma.training.create({
      data: {
        title: 'Emergency Response Procedures',
        description: 'Critical emergency response protocols and evacuation procedures.',
        type: 'SAFETY',
        category: 'Emergency Management',
        duration: 180, // 3 hours
        isRequired: true,
        validityPeriod: 365, // 1 year
        prerequisites: ['Security Protocols Training'],
        createdBy: adminUser.id
      }
    });

    console.log('✅ Created sample trainings:');
    console.log(`   - ${training1.title}`);
    console.log(`   - ${training2.title}`);
    console.log(`   - ${training3.title}`);

    // Create sample certifications
    const cert1 = await prisma.certification.create({
      data: {
        name: 'Security Guard License',
        description: 'Basic security guard certification required by state law.',
        issuingBody: 'State Security Board',
        type: 'SECURITY_LICENSE',
        validityPeriod: 365,
        requirements: ['Complete Security Training', 'Pass Written Exam', 'Background Check']
      }
    });

    const cert2 = await prisma.certification.create({
      data: {
        name: 'First Aid Certification',
        description: 'Basic first aid and CPR certification.',
        issuingBody: 'Red Cross',
        type: 'FIRST_AID',
        validityPeriod: 730,
        requirements: ['Complete First Aid Course', 'Pass Practical Exam']
      }
    });

    console.log('✅ Created sample certifications:');
    console.log(`   - ${cert1.name}`);
    console.log(`   - ${cert2.name}`);

    // Check if we have any agents to create enrollments
    const agents = await prisma.agentProfile.findMany({
      take: 2
    });

    if (agents.length > 0) {
      console.log(`✅ Found ${agents.length} agents, creating sample enrollments...`);

      // Create sample enrollments
      for (const agent of agents) {
        await prisma.trainingEnrollment.create({
          data: {
            trainingId: training1.id,
            agentId: agent.id,
            enrolledBy: adminUser.id,
            status: 'ENROLLED',
            progress: 0
          }
        });

        await prisma.trainingEnrollment.create({
          data: {
            trainingId: training2.id,
            agentId: agent.id,
            enrolledBy: adminUser.id,
            status: 'IN_PROGRESS',
            progress: 45,
            startedAt: new Date()
          }
        });
      }

      console.log('✅ Created sample enrollments');
    } else {
      console.log('⚠️  No agents found, skipping enrollment creation');
    }

    console.log('🎉 Training data seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding training data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTrainingData()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
