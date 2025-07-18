const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema...');

  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Connected to database. Found ${userCount} users.`);

    // Try to get users without firstName/lastName
    console.log('\n2️⃣ Testing user query without firstName/lastName...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        clerkId: true
      },
      take: 3
    });
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`);
    });

    // Check if we can access training table
    console.log('\n3️⃣ Testing training table access...');
    try {
      const trainingCount = await prisma.training.count();
      console.log(`✅ Training table accessible. Found ${trainingCount} trainings.`);
    } catch (error) {
      console.log('❌ Training table not accessible:', error.message);
    }

    // Try to create a simple training without creator relation
    console.log('\n4️⃣ Testing simple training creation...');
    const adminUser = users.find(u => u.role === 'ADMIN');
    
    if (!adminUser) {
      console.log('❌ No admin user found. Creating test with first available user.');
      const testUser = users[0];
      
      try {
        const simpleTraining = await prisma.training.create({
          data: {
            title: 'Simple Test Training',
            description: 'Test training without relations',
            type: 'TECHNICAL',
            category: 'Testing',
            duration: 60,
            createdBy: testUser.id
          }
        });
        
        console.log('✅ Simple training created:', simpleTraining.id);
        
        // Clean up
        await prisma.training.delete({
          where: { id: simpleTraining.id }
        });
        console.log('✅ Test training cleaned up.');
        
      } catch (error) {
        console.log('❌ Simple training creation failed:', error.message);
      }
    } else {
      console.log(`✅ Found admin user: ${adminUser.email}`);
      
      try {
        const simpleTraining = await prisma.training.create({
          data: {
            title: 'Admin Test Training',
            description: 'Test training with admin user',
            type: 'TECHNICAL',
            category: 'Testing',
            duration: 60,
            createdBy: adminUser.id
          }
        });
        
        console.log('✅ Admin training created:', simpleTraining.id);
        
        // Clean up
        await prisma.training.delete({
          where: { id: simpleTraining.id }
        });
        console.log('✅ Test training cleaned up.');
        
      } catch (error) {
        console.log('❌ Admin training creation failed:', error.message);
        console.log('Error details:', error);
      }
    }

    console.log('\n🎉 Database schema check completed!');

  } catch (error) {
    console.error('❌ Database schema check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSchema();
