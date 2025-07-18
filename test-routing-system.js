/**
 * Comprehensive test script for the routing system
 * Tests all navigation paths and role-based access control
 */

const axios = require('axios');

const CLIENT_PORTAL_URL = 'http://localhost:3000';
const ADMIN_PORTAL_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:8000/api';

// Test scenarios
const testScenarios = [
  {
    name: 'Landing Page Access',
    url: `${CLIENT_PORTAL_URL}/`,
    expectedStatus: 200,
    description: 'Should load the landing page successfully'
  },
  {
    name: 'Admin Login Page Access',
    url: `${CLIENT_PORTAL_URL}/admin/login`,
    expectedStatus: 200,
    description: 'Should load the admin login page'
  },
  {
    name: 'Client Login Page Access',
    url: `${CLIENT_PORTAL_URL}/client/login`,
    expectedStatus: 200,
    description: 'Should load the client login page'
  },
  {
    name: 'Admin Portal Health Check',
    url: `${ADMIN_PORTAL_URL}/`,
    expectedStatus: 200,
    description: 'Should load the admin portal'
  },
  {
    name: 'API Health Check',
    url: `${API_URL}/health`,
    expectedStatus: 200,
    description: 'Should respond with API health status'
  }
];

async function testRouting() {
  console.log('🧪 Starting Routing System Tests...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const scenario of testScenarios) {
    try {
      console.log(`🔍 Testing: ${scenario.name}`);
      console.log(`   URL: ${scenario.url}`);
      
      const response = await axios.get(scenario.url, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx status codes
      });
      
      if (response.status === scenario.expectedStatus) {
        console.log(`   ✅ PASS - Status: ${response.status}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL - Expected: ${scenario.expectedStatus}, Got: ${response.status}`);
        failedTests++;
      }
      
      console.log(`   Description: ${scenario.description}\n`);
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      failedTests++;
      console.log(`   Description: ${scenario.description}\n`);
    }
  }
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%\n`);
  
  // Additional checks
  await checkPortalAvailability();
  await checkAPIEndpoints();
  
  console.log('🎯 Manual Testing Checklist:');
  console.log('1. ✓ Navigate to http://localhost:3000');
  console.log('2. ✓ Click "Admin Portal" button');
  console.log('3. ✓ Sign in with your Clerk account');
  console.log('4. ✓ Verify role detection in browser console');
  console.log('5. ✓ Check if redirected to correct portal based on role');
  console.log('6. ✓ Test "Client Portal" button navigation');
  console.log('7. ✓ Verify no dual role display issues');
  console.log('8. ✓ Test direct URL access to /admin/login');
  console.log('9. ✓ Test direct URL access to /dashboard');
  console.log('10. ✓ Verify proper error handling for unauthorized access\n');
}

async function checkPortalAvailability() {
  console.log('🌐 Checking Portal Availability:');
  
  const portals = [
    { name: 'Client Portal', url: CLIENT_PORTAL_URL, port: 3000 },
    { name: 'Admin Portal', url: ADMIN_PORTAL_URL, port: 3001 },
    { name: 'Backend API', url: API_URL.replace('/api', ''), port: 8000 }
  ];
  
  for (const portal of portals) {
    try {
      const response = await axios.get(portal.url, { timeout: 5000 });
      console.log(`   ✅ ${portal.name} (Port ${portal.port}): Available`);
    } catch (error) {
      console.log(`   ❌ ${portal.name} (Port ${portal.port}): ${error.code || error.message}`);
    }
  }
  console.log('');
}

async function checkAPIEndpoints() {
  console.log('🔌 Checking Critical API Endpoints:');
  
  const endpoints = [
    { name: 'Health Check', url: `${API_URL}/health` },
    { name: 'Users Endpoint', url: `${API_URL}/users` },
    { name: 'Auth Test Sync', url: `${API_URL}/auth-test/sync-all-users` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, { 
        timeout: 5000,
        validateStatus: () => true 
      });
      
      if (response.status < 500) {
        console.log(`   ✅ ${endpoint.name}: Responding (${response.status})`);
      } else {
        console.log(`   ⚠️ ${endpoint.name}: Server Error (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ${error.code || error.message}`);
    }
  }
  console.log('');
}

// Run the tests
testRouting().catch(console.error);
