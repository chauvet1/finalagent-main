const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api';

async function testEndpoint(name, url) {
  try {
    console.log(`\n🔄 Testing ${name}...`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ ${name}: SUCCESS`);
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Data count: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
      if (data.totalAgents) console.log(`   - Total agents: ${data.totalAgents}`);
      if (data.totalSites) console.log(`   - Total sites: ${data.totalSites}`);
      return true;
    } else {
      console.log(`❌ ${name}: FAILED`);
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Error: ${data.error?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing API Endpoints...\n');
  
  const tests = [
    ['Agent Locations', `${API_BASE}/locations/agents/current`],
    ['Tracking Stats', `${API_BASE}/analytics/tracking-stats`],
    ['Sites for Tracking', `${API_BASE}/sites/tracking`],
    ['Active Agents', `${API_BASE}/agents/active`],
    ['Health Check', `${API_BASE}/../health`]
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [name, url] of tests) {
    const success = await testEndpoint(name, url);
    if (success) passed++;
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log('🎉 All API endpoints are working correctly!');
  } else {
    console.log('⚠️  Some endpoints need attention.');
  }
}

runTests().catch(console.error);
