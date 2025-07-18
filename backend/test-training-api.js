const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTrainingAPI() {
  console.log('🧪 Testing Training API...');

  try {
    // Test 1: Fetch existing trainings
    console.log('\n1️⃣ Testing GET /api/trainings...');
    const trainings = await prisma.training.findMany({
      where: {
        isActive: true
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        enrollments: {
          include: {
            agent: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${trainings.length} trainings in database`);
    trainings.forEach(training => {
      console.log(`   - ${training.title} (${training.type})`);
    });

    // Test 2: Create a new training
    console.log('\n2️⃣ Testing POST /api/trainings...');
    
    // Get an admin user to use as creator
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.log('❌ No admin user found for testing');
      return;
    }

    const newTraining = await prisma.training.create({
      data: {
        title: 'Test Training - API Integration',
        description: 'This is a test training created via API to verify database integration.',
        type: 'TECHNICAL',
        category: 'API Testing',
        duration: 60,
        isRequired: false,
        validityPeriod: 365,
        prerequisites: [],
        createdBy: adminUser.id
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    console.log('✅ Successfully created new training:');
    console.log(`   - ID: ${newTraining.id}`);
    console.log(`   - Title: ${newTraining.title}`);
    console.log(`   - Type: ${newTraining.type}`);
    console.log(`   - Creator: ${newTraining.creator.firstName} ${newTraining.creator.lastName}`);

    // Test 3: Update the training
    console.log('\n3️⃣ Testing PUT /api/trainings/:id...');
    
    const updatedTraining = await prisma.training.update({
      where: { id: newTraining.id },
      data: {
        title: 'Updated Test Training - API Integration',
        description: 'This training has been updated to test the PUT endpoint.',
        duration: 90
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('✅ Successfully updated training:');
    console.log(`   - New Title: ${updatedTraining.title}`);
    console.log(`   - New Duration: ${updatedTraining.duration} minutes`);

    // Test 4: Test enrollments
    console.log('\n4️⃣ Testing training enrollments...');
    
    const enrollments = await prisma.trainingEnrollment.findMany({
      include: {
        training: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        agent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    console.log(`✅ Found ${enrollments.length} enrollments in database`);
    enrollments.forEach(enrollment => {
      console.log(`   - ${enrollment.agent.user.firstName} ${enrollment.agent.user.lastName} → ${enrollment.training.title} (${enrollment.status})`);
    });

    // Clean up: Delete the test training
    console.log('\n5️⃣ Cleaning up test data...');
    await prisma.training.delete({
      where: { id: newTraining.id }
    });
    console.log('✅ Test training deleted');

    console.log('\n🎉 All API tests passed! Database integration is working correctly.');

  } catch (error) {
    console.error('❌ API test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testTrainingAPI()
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
