const { PrismaClient } = require('@prisma/client');
const { createClerkClient } = require('@clerk/backend');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminUser() {
  console.log('🔧 BahinLink Admin User Creation Tool\n');

  try {
    // Collect admin user information
    const email = await askQuestion('Enter admin email: ');
    const firstName = await askQuestion('Enter first name: ');
    const lastName = await askQuestion('Enter last name: ');
    const password = await askQuestion('Enter password (min 8 characters): ');
    
    console.log('\nAccess Level Options:');
    console.log('1. STANDARD - Basic admin access');
    console.log('2. FULL - Full system access');
    console.log('3. SUPER - Super admin access');
    
    const accessLevelChoice = await askQuestion('Choose access level (1-3): ');
    const accessLevelMap = {
      '1': 'STANDARD',
      '2': 'FULL', 
      '3': 'SUPER'
    };
    const accessLevel = accessLevelMap[accessLevelChoice] || 'STANDARD';

    console.log('\n📋 Creating admin user with the following details:');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Access Level: ${accessLevel}`);
    
    const confirm = await askQuestion('\nProceed with creation? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Admin user creation cancelled.');
      process.exit(0);
    }

    console.log('\n🔄 Creating admin user...');

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      console.log('⚠️  User already exists in database. Updating to admin role...');
      
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email: email },
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
            accessLevel: accessLevel,
            permissions: getPermissionsForAccessLevel(accessLevel)
          }
        });
      } else {
        await prisma.adminProfile.create({
          data: {
            userId: updatedUser.id,
            accessLevel: accessLevel,
            permissions: getPermissionsForAccessLevel(accessLevel)
          }
        });
      }

      console.log('✅ Existing user updated to admin successfully!');
      console.log(`User ID: ${updatedUser.id}`);
      
    } else {
      // Create new user directly in database (bypass Clerk for manual admin creation)
      console.log('📝 Creating new admin user in database...');
      
      const newUser = await prisma.user.create({
        data: {
          clerkId: `manual-admin-${Date.now()}`, // Temporary clerk ID
          email: email,
          firstName: firstName,
          lastName: lastName,
          username: email.split('@')[0],
          role: 'ADMIN',
          status: 'ACTIVE',
          phone: null
        }
      });

      // Create admin profile
      await prisma.adminProfile.create({
        data: {
          userId: newUser.id,
          accessLevel: accessLevel,
          permissions: getPermissionsForAccessLevel(accessLevel)
        }
      });

      console.log('✅ Admin user created successfully in database!');
      console.log(`User ID: ${newUser.id}`);
      console.log(`Clerk ID: ${newUser.clerkId} (manual)`);
      
      console.log('\n⚠️  IMPORTANT NOTES:');
      console.log('1. This user was created directly in the database');
      console.log('2. To enable full authentication, create the user in Clerk as well');
      console.log('3. Or update the clerkId field when the user signs up through Clerk');
    }

    console.log('\n🎉 Admin user setup completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. The admin user can now access the admin portal at /admin');
    console.log('2. They will need to sign in through Clerk authentication');
    console.log('3. The system will automatically sync their role and permissions');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check database connection');
    console.error('2. Verify Prisma schema is up to date');
    console.error('3. Ensure all required fields are provided');
  } finally {
    await prisma.$disconnect();
    rl.close();
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
    'FULL': [
      'users.read', 'users.write', 'users.delete',
      'reports.read', 'reports.write', 'reports.delete',
      'sites.read', 'sites.write', 'sites.delete',
      'shifts.read', 'shifts.write', 'shifts.delete',
      'analytics.read',
      'admin.read'
    ],
    'SUPER': [
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

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Goodbye!');
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});

// Run the script
createAdminUser().catch(console.error);
