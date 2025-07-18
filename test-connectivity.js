#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:8000';
const CLIENT_PORTAL_URL = 'http://localhost:3000';
const ADMIN_PORTAL_URL = 'http://localhost:3002';

// Test functions
async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend Health:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Backend Health Failed:', error.message);
    return false;
  }
}

async function testBackendAPI() {
  console.log('🔍 Testing Backend API...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    console.log('✅ Backend API:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Backend API Failed:', error.message);
    return false;
  }
}

async function testBackendDatabase() {
  console.log('🔍 Testing Backend Database...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/test-db`, { timeout: 10000 });
    console.log('✅ Backend Database:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Backend Database Failed:', error.message);
    return false;
  }
}

async function testPortalConnectivity(portalName, portalUrl) {
  console.log(`🔍 Testing ${portalName} Portal...`);
  try {
    const response = await axios.get(portalUrl, { 
      timeout: 5000,
      headers: { 'Accept': 'text/html' }
    });
    console.log(`✅ ${portalName} Portal: Available (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.log(`❌ ${portalName} Portal Failed:`, error.message);
    return false;
  }
}

async function testCORS() {
  console.log('🔍 Testing CORS Configuration...');
  try {
    const response = await axios.options(`${BACKEND_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      },
      timeout: 5000
    });
    console.log('✅ CORS: Configured correctly');
    return true;
  } catch (error) {
    console.log('❌ CORS Failed:', error.message);
    return false;
  }
}

async function runConnectivityTests() {
  console.log('🚀 Starting BahinLink System Connectivity Tests\n');
  
  const results = {
    backendHealth: await testBackendHealth(),
    backendAPI: await testBackendAPI(),
    backendDatabase: await testBackendDatabase(),
    clientPortal: await testPortalConnectivity('Client', CLIENT_PORTAL_URL),
    adminPortal: await testPortalConnectivity('Admin', ADMIN_PORTAL_URL),
    cors: await testCORS()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} - ${testName}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All connectivity tests passed! System is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please check the services and try again.');
  }
  
  return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
  runConnectivityTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runConnectivityTests };
