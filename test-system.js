#!/usr/bin/env node

/**
 * BahinLink System Health Check Script
 * Tests all components of the multi-port architecture
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVICES = {
  backend: { port: 8000, name: 'Backend API', path: '/api/health' },
  landing: { port: 3000, name: 'Landing Page', path: '/' },
  admin: { port: 3001, name: 'Admin Portal', path: '/dashboard' },
  client: { port: 3002, name: 'Client Portal', path: '/dashboard' }
};

const TIMEOUT = 5000; // 5 seconds

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test if a service is running
async function testService(service, port) {
  try {
    const url = `http://localhost:${port}${service.path}`;
    const response = await axios.get(url, { 
      timeout: TIMEOUT,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });
    
    if (response.status >= 200 && response.status < 400) {
      logSuccess(`${service.name} is running on port ${port}`);
      return true;
    } else {
      logWarning(`${service.name} responded with status ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError(`${service.name} is not running on port ${port}`);
    } else if (error.code === 'ENOTFOUND') {
      logError(`Cannot resolve localhost for ${service.name}`);
    } else {
      logError(`${service.name} error: ${error.message}`);
    }
    return false;
  }
}

// Test redirect functionality
async function testRedirects() {
  logHeader('Testing Landing Page Redirects');
  
  const redirectTests = [
    { path: '/admin/dashboard', expectedRedirect: 'localhost:3001' },
    { path: '/client/dashboard', expectedRedirect: 'localhost:3002' },
    { path: '/admin/login', expectedRedirect: null }, // Should not redirect
    { path: '/client/login', expectedRedirect: null }  // Should not redirect
  ];

  for (const test of redirectTests) {
    try {
      const url = `http://localhost:3000${test.path}`;
      const response = await axios.get(url, { 
        timeout: TIMEOUT,
        maxRedirects: 0,
        validateStatus: (status) => status < 400
      });
      
      if (test.expectedRedirect) {
        logWarning(`${test.path} did not redirect as expected`);
      } else {
        logSuccess(`${test.path} loaded correctly (no redirect)`);
      }
    } catch (error) {
      if (error.response && error.response.status >= 300 && error.response.status < 400) {
        const location = error.response.headers.location;
        if (test.expectedRedirect && location && location.includes(test.expectedRedirect)) {
          logSuccess(`${test.path} correctly redirects to ${location}`);
        } else if (test.expectedRedirect) {
          logError(`${test.path} redirects to ${location}, expected ${test.expectedRedirect}`);
        } else {
          logWarning(`${test.path} unexpectedly redirects to ${location}`);
        }
      } else {
        logError(`${test.path} test failed: ${error.message}`);
      }
    }
  }
}

// Check environment files
function checkEnvironmentFiles() {
  logHeader('Checking Environment Configuration');
  
  const envFiles = [
    'landing-page/.env',
    'admin-portal/.env',
    'client-portal/.env',
    'backend/.env'
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      logSuccess(`${envFile} exists`);
      
      // Check for required variables
      const content = fs.readFileSync(envFile, 'utf8');
      const requiredVars = {
        'landing-page/.env': ['REACT_APP_CLERK_PUBLISHABLE_KEY'],
        'admin-portal/.env': ['REACT_APP_API_URL', 'REACT_APP_CLERK_PUBLISHABLE_KEY'],
        'client-portal/.env': ['REACT_APP_API_URL', 'REACT_APP_CLERK_PUBLISHABLE_KEY'],
        'backend/.env': ['DATABASE_URL']
      };

      const required = requiredVars[envFile] || [];
      for (const varName of required) {
        if (content.includes(varName)) {
          logSuccess(`  ${varName} is configured`);
        } else {
          logWarning(`  ${varName} is missing`);
        }
      }
    } else {
      logError(`${envFile} is missing`);
    }
  }
}

// Check package.json files
function checkPackageFiles() {
  logHeader('Checking Package Configuration');
  
  const packages = [
    'package.json',
    'landing-page/package.json',
    'admin-portal/package.json',
    'client-portal/package.json',
    'backend/package.json'
  ];

  for (const pkg of packages) {
    if (fs.existsSync(pkg)) {
      logSuccess(`${pkg} exists`);
      
      try {
        const content = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (content.scripts && content.scripts.start) {
          logSuccess(`  ${pkg} has start script`);
        } else {
          logWarning(`  ${pkg} missing start script`);
        }
      } catch (error) {
        logError(`  ${pkg} is invalid JSON`);
      }
    } else {
      logError(`${pkg} is missing`);
    }
  }
}

// Main test function
async function runTests() {
  log('🚀 BahinLink System Health Check', 'bright');
  log('Testing multi-port architecture...', 'cyan');

  // Check files first
  checkPackageFiles();
  checkEnvironmentFiles();

  // Test services
  logHeader('Testing Service Availability');
  
  const results = {};
  for (const [key, service] of Object.entries(SERVICES)) {
    results[key] = await testService(service, service.port);
  }

  // Test redirects if landing page is running
  if (results.landing) {
    await testRedirects();
  } else {
    logWarning('Skipping redirect tests - landing page not running');
  }

  // Summary
  logHeader('Test Summary');
  
  const totalServices = Object.keys(SERVICES).length;
  const runningServices = Object.values(results).filter(Boolean).length;
  
  if (runningServices === totalServices) {
    logSuccess(`All ${totalServices} services are running correctly!`);
    logInfo('System is ready for use.');
  } else {
    logWarning(`${runningServices}/${totalServices} services are running`);
    logInfo('Some services may need to be started manually.');
  }

  // Instructions
  logHeader('Next Steps');
  
  if (runningServices === 0) {
    logInfo('To start all services, run: npm start');
  } else if (runningServices < totalServices) {
    logInfo('To start missing services individually:');
    for (const [key, isRunning] of Object.entries(results)) {
      if (!isRunning) {
        logInfo(`  npm run start:${key}`);
      }
    }
  }

  logInfo('\nAccess URLs:');
  logInfo('  Landing Page: http://localhost:3000');
  logInfo('  Admin Portal: http://localhost:3000/admin/dashboard');
  logInfo('  Client Portal: http://localhost:3000/client/dashboard');
  logInfo('  Backend API: http://localhost:8000/api/health');

  return runningServices === totalServices;
}

// Run the tests
if (require.main === module) {
  runTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Test script failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runTests, testService, SERVICES };
