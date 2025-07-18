/**
 * Script to fix user role issues by syncing with Clerk and updating database
 * This script will help resolve the authentication and role management issues
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';

async function fixUserRole() {
  try {
    console.log('🔧 Starting user role fix process...');
    
    // First, let's sync all users from Clerk to ensure database is up to date
    console.log('📥 Syncing all users from Clerk...');
    
    try {
      const syncResponse = await axios.post(`${API_BASE_URL}/auth-test/sync-all-users`);
      console.log('✅ User sync completed:', syncResponse.data);
    } catch (syncError) {
      console.log('⚠️ Sync error (this might be expected if backend is not running):', syncError.message);
    }
    
    // List current users in database
    console.log('📋 Checking current users in database...');
    
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/users`);
      console.log('👥 Current users:', usersResponse.data);
    } catch (usersError) {
      console.log('⚠️ Could not fetch users:', usersError.message);
    }
    
    console.log('\n🎯 Manual Steps to Fix Role Issues:');
    console.log('1. Ensure the backend server is running (npm start from root directory)');
    console.log('2. Check your Clerk dashboard for your user ID');
    console.log('3. Use the sync endpoint to update your user role');
    console.log('4. Verify the role is correctly set in both Clerk and database');
    
    console.log('\n📝 API Endpoints Available:');
    console.log(`- Sync all users: POST ${API_BASE_URL}/auth-test/sync-all-users`);
    console.log(`- Sync specific user: POST ${API_BASE_URL}/auth-test/sync-user-by-clerk-id`);
    console.log(`- List users: GET ${API_BASE_URL}/users`);
    console.log(`- Update user role: PUT ${API_BASE_URL}/admin-users/{id}/role`);
    
  } catch (error) {
    console.error('❌ Error in fix process:', error.message);
    
    console.log('\n🔍 Troubleshooting Steps:');
    console.log('1. Make sure the backend server is running on port 8000');
    console.log('2. Check that your Clerk keys are properly configured');
    console.log('3. Verify database connection is working');
    console.log('4. Check that your user exists in Clerk dashboard');
  }
}

// Run the fix
fixUserRole();
