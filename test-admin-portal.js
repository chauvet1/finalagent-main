/**
 * Test script to check admin portal accessibility
 */

const axios = require('axios');

async function testAdminPortal() {
  console.log('🔍 Testing Admin Portal Accessibility...\n');
  
  try {
    // Test 1: Check if admin portal is responding
    console.log('1️⃣ Testing admin portal root (http://localhost:3001)...');
    try {
      const response = await axios.get('http://localhost:3001', { timeout: 5000 });
      console.log('✅ Admin portal is responding:', response.status);
    } catch (error) {
      console.log('❌ Admin portal failed:', error.code || error.message);
    }
    
    // Test 2: Check admin dashboard
    console.log('\n2️⃣ Testing admin dashboard (http://localhost:3001/dashboard)...');
    try {
      const response = await axios.get('http://localhost:3001/dashboard', { timeout: 5000 });
      console.log('✅ Admin dashboard is responding:', response.status);
    } catch (error) {
      console.log('❌ Admin dashboard failed:', error.code || error.message);
    }
    
    // Test 3: Check client portal
    console.log('\n3️⃣ Testing client portal (http://localhost:3000)...');
    try {
      const response = await axios.get('http://localhost:3000', { timeout: 5000 });
      console.log('✅ Client portal is responding:', response.status);
    } catch (error) {
      console.log('❌ Client portal failed:', error.code || error.message);
    }
    
    console.log('\n📋 Analysis:');
    console.log('- If admin portal is responding, the redirect should work');
    console.log('- If admin portal is not responding, that explains the redirect issue');
    console.log('- Check browser network tab to see if redirect is attempted');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAdminPortal();
