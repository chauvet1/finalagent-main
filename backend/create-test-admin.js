const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function createTestAdmin() {
  console.log('🔧 Creating test admin user...\n');

  try {
    // Test admin user data
    const adminData = {
      email: 'admin@bahinlink.com',
      firstName: 'Admin',
      lastName: 'User',
      accessLevel: 'ADMIN'
    };

    console.log('📋 Creating admin user with the following details:');
    console.log(`Email: ${adminData.email}`);
    console.log(`Name: ${adminData.firstName} ${adminData.lastName}`);
    console.log(`Access Level: ${adminData.accessLevel}`);

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: adminData.email }
    });

    if (existingUser) {
      console.log('⚠️  User already exists in database. Updating to admin role...');
      
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email: adminData.email },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });

      // Create or update admin profile
      const existingAdminProfile = await prisma.adminProfile.findUnique({
        where: { userId: updatedUser.id }
      });

      if (existingAdminProfile) {
        await prisma.adminProfile.update({
          where: { userId: updatedUser.id },
          data: {
            accessLevel: adminData.accessLevel,
            permissions: getPermissionsForAccessLevel(adminData.accessLevel)
          }
        });
      } else {
        await prisma.adminProfile.create({
          data: {
            userId: updatedUser.id,
            accessLevel: adminData.accessLevel,
            permissions: getPermissionsForAccessLevel(adminData.accessLevel)
          }
        });
      }

      console.log('✅ Existing user updated to admin successfully!');
      console.log(`User ID: ${updatedUser.id}`);
      
    } else {
      // Create new user directly in database
      console.log('📝 Creating new admin user in database...');
      
      const newUser = await prisma.user.create({
        data: {
          clerkId: `manual-admin-${Date.now()}`, // Temporary clerk ID
          email: adminData.email,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          username: adminData.email.split('@')[0],
          role: 'ADMIN',
          status: 'ACTIVE',
          phone: null
        }
      });

      // Create admin profile
      await prisma.adminProfile.create({
        data: {
          userId: newUser.id,
          accessLevel: adminData.accessLevel,
          permissions: getPermissionsForAccessLevel(adminData.accessLevel)
        }
      });

      console.log('✅ Admin user created successfully in database!');
      console.log(`User ID: ${newUser.id}`);
      console.log(`Clerk ID: ${newUser.clerkId} (manual)`);
    }

    // Create a test client user as well
    console.log('\n📝 Creating test client user...');
    
    const clientData = {
      email: 'client@bahinlink.com',
      firstName: 'Test',
      lastName: 'Client'
    };

    const existingClient = await prisma.user.findUnique({
      where: { email: clientData.email }
    });

    if (!existingClient) {
      const newClient = await prisma.user.create({
        data: {
          clerkId: `manual-client-${Date.now()}`,
          email: clientData.email,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          username: clientData.email.split('@')[0],
          role: 'CLIENT',
          status: 'ACTIVE',
          phone: null
        }
      });

      // Create client profile
      await prisma.clientProfile.create({
        data: {
          userId: newClient.id,
          companyName: 'Test Company',
          contactPerson: `${clientData.firstName} ${clientData.lastName}`
        }
      });

      console.log('✅ Test client user created successfully!');
      console.log(`Client ID: ${newClient.id}`);
    } else {
      console.log('⚠️  Test client user already exists');
    }

    console.log('\n🎉 Test users setup completed!');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: admin@bahinlink.com');
    console.log('Client: client@bahinlink.com');
    console.log('\n📝 Next Steps:');
    console.log('1. Users can access their respective portals');
    console.log('2. Authentication will be handled by Clerk');
    console.log('3. User data will sync automatically');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getPermissionsForAccessLevel(accessLevel) {
  const permissions = {
    'STANDARD': [
      'users.read',
      'reports.read',
      'sites.read',
      'shifts.read'
    ],
    'ELEVATED': [
      'users.read', 'users.write',
      'reports.read', 'reports.write',
      'sites.read', 'sites.write',
      'shifts.read', 'shifts.write'
    ],
    'ADMIN': [
      'users.read', 'users.write', 'users.delete',
      'reports.read', 'reports.write', 'reports.delete',
      'sites.read', 'sites.write', 'sites.delete',
      'shifts.read', 'shifts.write', 'shifts.delete',
      'analytics.read',
      'admin.read'
    ],
    'SUPER_ADMIN': [
      'users.read', 'users.write', 'users.delete',
      'reports.read', 'reports.write', 'reports.delete',
      'sites.read', 'sites.write', 'sites.delete',
      'shifts.read', 'shifts.write', 'shifts.delete',
      'analytics.read', 'analytics.write',
      'admin.read', 'admin.write', 'admin.delete',
      'system.read', 'system.write'
    ]
  };

  return permissions[accessLevel] || permissions['STANDARD'];
}

// Run the script
createTestAdmin().catch(console.error);
