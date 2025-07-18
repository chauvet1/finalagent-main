const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTrainingCreate() {
  console.log('🔍 Debugging Training Creation...');

  try {
    // Test 1: Check if we can connect to the database
    console.log('1️⃣ Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Found ${userCount} users.`);

    // Test 2: Check if we have admin users
    console.log('\n2️⃣ Checking for admin users...');
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    console.log(`✅ Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.id})`);
    });

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found. Cannot test training creation.');
      return;
    }

    // Test 3: Check if training table exists and is accessible
    console.log('\n3️⃣ Testing training table access...');
    const existingTrainings = await prisma.training.findMany({
      take: 5
    });
    console.log(`✅ Training table accessible. Found ${existingTrainings.length} existing trainings.`);

    // Test 4: Try to create a training with the exact same data as the frontend
    console.log('\n4️⃣ Testing training creation with frontend data...');
    const adminUser = adminUsers[0];
    
    const trainingData = {
      title: 'Debug Test Training',
      description: 'This is a debug test training',
      type: 'TECHNICAL',
      category: 'Debug Testing',
      duration: 60,
      isRequired: false,
      validityPeriod: 365,
      prerequisites: [],
      createdBy: adminUser.id
    };

    console.log('Creating training with data:', JSON.stringify(trainingData, null, 2));

    const newTraining = await prisma.training.create({
      data: trainingData,
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

    console.log('✅ Training created successfully!');
    console.log('Created training:', {
      id: newTraining.id,
      title: newTraining.title,
      type: newTraining.type,
      creator: newTraining.creator,
      enrollments: newTraining._count.enrollments
    });

    // Test 5: Clean up - delete the test training
    console.log('\n5️⃣ Cleaning up test training...');
    await prisma.training.delete({
      where: { id: newTraining.id }
    });
    console.log('✅ Test training deleted.');

    console.log('\n🎉 All database operations successful! The issue is not with the database.');

  } catch (error) {
    console.error('❌ Database operation failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

debugTrainingCreate();
