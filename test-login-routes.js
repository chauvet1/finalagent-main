#!/usr/bin/env node

/**
 * Test script to verify login routes are accessible
 */

const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRoute(url, expectedContent = null) {
  try {
    const response = await axios.get(url, { 
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 200) {
      log(`✅ ${url} - Status: ${response.status}`, 'green');
      
      if (expectedContent && response.data.includes(expectedContent)) {
        log(`   Contains expected content: "${expectedContent}"`, 'green');
      } else if (expectedContent) {
        log(`   Missing expected content: "${expectedContent}"`, 'yellow');
      }
      
      return true;
    } else if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      log(`⚠️  ${url} - Redirects to: ${location}`, 'yellow');
      return false;
    } else {
      log(`❌ ${url} - Status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(`❌ ${url} - Connection refused (service not running)`, 'red');
    } else if (error.response && error.response.status >= 300 && error.response.status < 400) {
      const location = error.response.headers.location;
      log(`⚠️  ${url} - Redirects to: ${location}`, 'yellow');
    } else {
      log(`❌ ${url} - Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function runTests() {
  log('🧪 Testing Login Routes', 'blue');
  log('========================', 'blue');
  
  const tests = [
    {
      url: 'http://localhost:3000',
      description: 'Landing page',
      expectedContent: 'BahinLink'
    },
    {
      url: 'http://localhost:3000/admin/login',
      description: 'Admin login page',
      expectedContent: 'Admin Portal'
    },
    {
      url: 'http://localhost:3000/client/login',
      description: 'Client login page',
      expectedContent: 'Client Portal'
    },
    {
      url: 'http://localhost:3000/client/signup',
      description: 'Client signup page',
      expectedContent: 'Create Client Account'
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    log(`\nTesting: ${test.description}`, 'blue');
    const success = await testRoute(test.url, test.expectedContent);
    if (success) passed++;
  }

  log(`\n📊 Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed < total) {
    log('\n💡 Troubleshooting tips:', 'blue');
    log('1. Make sure the landing page is running: npm run start:landing', 'blue');
    log('2. Check browser console for JavaScript errors', 'blue');
    log('3. Verify Clerk configuration in .env file', 'blue');
    log('4. Check for redirect loops in the authentication logic', 'blue');
  }

  return passed === total;
}

if (require.main === module) {
  runTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      log(`Test script failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { runTests, testRoute };
