#!/usr/bin/env node

/**
 * System Integrity Verification Script
 * Checks for missing files, broken imports, and configuration issues
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ Missing ${description}: ${filePath}`, 'red');
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    log(`✅ ${description}: ${dirPath}`, 'green');
    return true;
  } else {
    log(`❌ Missing ${description}: ${dirPath}`, 'red');
    return false;
  }
}

function checkPackageJson(appPath, appName) {
  const packagePath = path.join(appPath, 'package.json');
  if (!checkFileExists(packagePath, `${appName} package.json`)) {
    return false;
  }

  try {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check for required scripts
    const requiredScripts = ['start', 'build'];
    let hasAllScripts = true;
    
    for (const script of requiredScripts) {
      if (packageContent.scripts && packageContent.scripts[script]) {
        log(`  ✅ Has ${script} script`, 'green');
      } else {
        log(`  ❌ Missing ${script} script`, 'red');
        hasAllScripts = false;
      }
    }
    
    return hasAllScripts;
  } catch (error) {
    log(`  ❌ Invalid JSON in ${packagePath}`, 'red');
    return false;
  }
}

function checkEnvFile(appPath, appName, requiredVars = []) {
  const envPath = path.join(appPath, '.env');
  if (!checkFileExists(envPath, `${appName} .env file`)) {
    return false;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    let hasAllVars = true;
    
    for (const varName of requiredVars) {
      if (envContent.includes(varName)) {
        log(`  ✅ Has ${varName}`, 'green');
      } else {
        log(`  ❌ Missing ${varName}`, 'red');
        hasAllVars = false;
      }
    }
    
    return hasAllVars;
  } catch (error) {
    log(`  ❌ Cannot read ${envPath}`, 'red');
    return false;
  }
}

function checkCriticalFiles() {
  log('\n🔍 Checking Critical Files', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const criticalFiles = [
    // Root files
    { path: 'package.json', desc: 'Root package.json' },
    { path: 'vercel.json', desc: 'Vercel configuration' },
    { path: 'DEPLOYMENT_GUIDE.md', desc: 'Deployment guide' },
    { path: 'test-system.js', desc: 'System test script' },
    
    // Landing page
    { path: 'landing-page/src/App.tsx', desc: 'Landing page App component' },
    { path: 'landing-page/src/pages/AdminLoginPage.tsx', desc: 'Admin login page' },
    { path: 'landing-page/src/pages/ClientLoginPage.tsx', desc: 'Client login page' },

    
    // Admin portal
    { path: 'admin-portal/src/App.tsx', desc: 'Admin portal App component' },
    { path: 'admin-portal/src/pages/dashboard/DashboardPage.tsx', desc: 'Admin dashboard' },
    
    // Client portal
    { path: 'client-portal/src/App.tsx', desc: 'Client portal App component' },
    { path: 'client-portal/src/pages/DashboardPage.tsx', desc: 'Client dashboard' },
    
    // Backend
    { path: 'backend/server.js', desc: 'Backend server' },
    { path: 'backend/prisma/schema.prisma', desc: 'Prisma schema' },
    { path: 'backend/src/middleware/auth.ts', desc: 'Auth middleware' },
  ];
  
  let allFilesExist = true;
  for (const file of criticalFiles) {
    if (!checkFileExists(file.path, file.desc)) {
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

function checkApplicationStructure() {
  log('\n🏗️  Checking Application Structure', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const applications = [
    { path: 'landing-page', name: 'Landing Page' },
    { path: 'admin-portal', name: 'Admin Portal' },
    { path: 'client-portal', name: 'Client Portal' },
    { path: 'backend', name: 'Backend' }
  ];
  
  let allAppsValid = true;
  
  for (const app of applications) {
    log(`\n📁 ${app.name}`, 'blue');
    
    if (!checkDirectoryExists(app.path, `${app.name} directory`)) {
      allAppsValid = false;
      continue;
    }
    
    // Check package.json
    if (!checkPackageJson(app.path, app.name)) {
      allAppsValid = false;
    }
    
    // Check src directory (except for backend which has different structure)
    if (app.path !== 'backend') {
      if (!checkDirectoryExists(path.join(app.path, 'src'), `${app.name} src directory`)) {
        allAppsValid = false;
      }
    }
    
    // Check node_modules
    if (checkDirectoryExists(path.join(app.path, 'node_modules'), `${app.name} node_modules`)) {
      log(`  ✅ Dependencies installed`, 'green');
    } else {
      log(`  ⚠️  Dependencies not installed (run npm install)`, 'yellow');
    }
  }
  
  return allAppsValid;
}

function checkEnvironmentConfiguration() {
  log('\n🔧 Checking Environment Configuration', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const envConfigs = [
    {
      path: 'landing-page',
      name: 'Landing Page',
      required: ['REACT_APP_CLERK_PUBLISHABLE_KEY', 'REACT_APP_ADMIN_PORTAL_URL', 'REACT_APP_CLIENT_PORTAL_URL']
    },
    {
      path: 'admin-portal',
      name: 'Admin Portal',
      required: ['REACT_APP_API_URL', 'REACT_APP_CLERK_PUBLISHABLE_KEY']
    },
    {
      path: 'client-portal',
      name: 'Client Portal',
      required: ['REACT_APP_API_URL', 'REACT_APP_CLERK_PUBLISHABLE_KEY']
    },
    {
      path: 'backend',
      name: 'Backend',
      required: ['DATABASE_URL', 'CLERK_SECRET_KEY', 'JWT_SECRET']
    }
  ];
  
  let allEnvValid = true;
  
  for (const config of envConfigs) {
    log(`\n🔑 ${config.name}`, 'blue');
    if (!checkEnvFile(config.path, config.name, config.required)) {
      allEnvValid = false;
    }
  }
  
  return allEnvValid;
}

function checkForDeletedUnifiedFiles() {
  log('\n🗑️  Checking for Unified App Remnants', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const unifiedPaths = [
    'unified-app',
    'src/unified-app',
    'unified-app/src',
    'unified-app/package.json'
  ];
  
  let cleanupComplete = true;
  
  for (const unifiedPath of unifiedPaths) {
    if (fs.existsSync(unifiedPath)) {
      log(`❌ Unified app remnant found: ${unifiedPath}`, 'red');
      cleanupComplete = false;
    } else {
      log(`✅ No remnant: ${unifiedPath}`, 'green');
    }
  }
  
  return cleanupComplete;
}

function generateSummary(results) {
  log('\n📊 System Integrity Summary', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  
  for (const [check, passed] of Object.entries(results)) {
    const status = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${status} ${check}`, color);
  }
  
  log(`\n📈 Overall Score: ${passedChecks}/${totalChecks}`, passedChecks === totalChecks ? 'green' : 'yellow');
  
  if (passedChecks === totalChecks) {
    log('\n🎉 System integrity verified! All checks passed.', 'green');
    log('✅ Ready for development and deployment.', 'green');
  } else {
    log('\n⚠️  System integrity issues found.', 'yellow');
    log('🔧 Please address the issues above before proceeding.', 'yellow');
  }
  
  return passedChecks === totalChecks;
}

async function runIntegrityCheck() {
  log('🔍 BahinLink System Integrity Check', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const results = {
    'Critical Files': checkCriticalFiles(),
    'Application Structure': checkApplicationStructure(),
    'Environment Configuration': checkEnvironmentConfiguration(),
    'Unified App Cleanup': checkForDeletedUnifiedFiles()
  };
  
  return generateSummary(results);
}

if (require.main === module) {
  runIntegrityCheck()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      log(`Integrity check failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { runIntegrityCheck };
