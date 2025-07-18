/**
 * Test script to verify dashboard API endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';
const EMAIL_TOKEN = 'xsmafred@gmail.com'; // Using email as token for development

async function testDashboardAPI() {
  console.log('🧪 Testing Dashboard API Endpoints...\n');
  
  const headers = {
    'Authorization': `Bearer ${EMAIL_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test 1: Dashboard Stats
    console.log('1️⃣ Testing /api/client/dashboard/stats...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/client/dashboard/stats`, { headers });
      console.log('✅ Stats Response:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Stats Failed:', error.response?.data || error.message);
    }
    
    // Test 2: Dashboard Activity
    console.log('\n2️⃣ Testing /api/client/dashboard/activity...');
    try {
      const activityResponse = await axios.get(`${API_BASE_URL}/client/dashboard/activity`, { headers });
      console.log('✅ Activity Response:', JSON.stringify(activityResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Activity Failed:', error.response?.data || error.message);
    }
    
    // Test 3: Sites Status
    console.log('\n3️⃣ Testing /api/client/sites/status...');
    try {
      const sitesResponse = await axios.get(`${API_BASE_URL}/client/sites/status`, { headers });
      console.log('✅ Sites Response:', JSON.stringify(sitesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Sites Failed:', error.response?.data || error.message);
    }
    
    console.log('\n📋 Summary:');
    console.log('- All dashboard API endpoints tested');
    console.log('- Check the response structures above');
    console.log('- Frontend should now handle these structures correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDashboardAPI();
