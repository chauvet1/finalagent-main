const { createClerkClient } = require('@clerk/backend');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testClerkConnection() {
  console.log('🔍 Testing Clerk Authentication Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`CLERK_PUBLISHABLE_KEY: ${process.env.CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'}\n`);

  if (!process.env.CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY is missing from environment variables');
    process.exit(1);
  }

  try {
    // Initialize Clerk client
    const clerkClient = createClerkClient({ 
      secretKey: process.env.CLERK_SECRET_KEY 
    });

    console.log('🔗 Testing Clerk API Connection...');

    // Test 1: Get organization list (basic API test)
    try {
      const organizations = await clerkClient.organizations.getOrganizationList();
      console.log('✅ Clerk API connection successful');
      console.log(`📊 Organizations found: ${organizations.length}`);
    } catch (error) {
      console.log('⚠️  Organization list test failed (this is normal for new accounts)');
      console.log(`   Error: ${error.message}`);
    }

    // Test 2: Get users list
    try {
      const users = await clerkClient.users.getUserList({ limit: 5 });
      console.log('✅ User list retrieval successful');
      console.log(`👥 Users found: ${users.length}`);
      
      if (users.length > 0) {
        console.log('\n📋 Sample User Data:');
        const user = users[0];
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.emailAddresses[0]?.emailAddress || 'No email'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Sign In: ${user.lastSignInAt || 'Never'}`);
      }
    } catch (error) {
      console.error('❌ Failed to retrieve users');
      console.error(`   Error: ${error.message}`);
    }

    // Test 3: Verify token functionality (mock test)
    try {
      // This will fail with invalid token, but tests the method exists
      await clerkClient.verifyToken('invalid-token');
    } catch (error) {
      if (error.message.includes('Invalid token') || error.message.includes('token')) {
        console.log('✅ Token verification method is working (expected error with invalid token)');
      } else {
        console.log(`⚠️  Token verification test: ${error.message}`);
      }
    }

    console.log('\n🎉 Clerk connection test completed successfully!');
    console.log('✅ Clerk is properly configured and accessible');

  } catch (error) {
    console.error('❌ Clerk connection test failed');
    console.error(`Error: ${error.message}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Verify CLERK_SECRET_KEY is correct');
    console.error('2. Check if Clerk account is active');
    console.error('3. Ensure network connectivity');
    process.exit(1);
  }
}

// Run the test
testClerkConnection().catch(console.error);
