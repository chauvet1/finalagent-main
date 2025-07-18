#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader() {
  console.clear();
  log('╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    BahinLink System Startup                 ║', 'cyan');
  log('║          Security Workforce Management Platform             ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
  log('');
}

function checkNodeModules(directory) {
  const nodeModulesPath = path.join(directory, 'node_modules');
  return fs.existsSync(nodeModulesPath);
}

function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    log(`${description}...`, 'yellow');
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} completed successfully`, 'green');
        resolve(output);
      } else {
        log(`❌ ${description} failed with code ${code}`, 'red');
        console.log(output);
        reject(new Error(`${description} failed`));
      }
    });
  });
}

async function setupProject() {
  logHeader();
  
  try {
    log('🔍 Checking project setup...', 'blue');
    
    // Check if all directories have node_modules
    const directories = ['backend', 'landing-page', 'admin-portal', 'client-portal'];
    const needsInstall = directories.filter(dir => !checkNodeModules(dir));
    
    if (needsInstall.length > 0) {
      log(`📦 Installing dependencies for: ${needsInstall.join(', ')}`, 'yellow');
      
      for (const dir of needsInstall) {
        await runCommand('npm', ['install', '--silent'], dir, `Installing ${dir} dependencies`);
      }
    } else {
      log('✅ All dependencies are already installed', 'green');
    }

    // Check if Prisma client is generated
    const prismaClientPath = path.join('node_modules', '@prisma', 'client');
    if (!fs.existsSync(prismaClientPath)) {
      log('🔧 Setting up database...', 'blue');
      await runCommand('npx', ['prisma', 'generate'], '.', 'Generating Prisma client');
    }

    log('');
    log('🚀 Starting BahinLink System...', 'green');
    log('');
    log('📍 Application URLs:', 'cyan');
    log('   • Landing Page:  http://localhost:3000', 'white');
    log('   • Admin Portal:  http://localhost:3001', 'white');
    log('   • Client Portal: http://localhost:3002', 'white');
    log('   • Backend API:   http://localhost:8000', 'white');
    log('');
    log('💡 Press Ctrl+C to stop all services', 'yellow');
    log('');

    // Start all services with concurrently
    const concurrentlyArgs = [
      '--kill-others',
      '--names', 'BACKEND,LANDING,ADMIN,CLIENT',
      '--prefix-colors', 'blue,green,yellow,magenta',
      '--prefix', '[{name}]',
      '--timestamp-format', 'HH:mm:ss',
      'npm run dev:backend',
      'npm run dev:landing',
      'npm run dev:admin',
      'npm run dev:client'
    ];

    const concurrently = spawn('npx', ['concurrently', ...concurrentlyArgs], {
      stdio: 'inherit',
      shell: true
    });

    concurrently.on('close', (code) => {
      log('');
      log('👋 BahinLink System stopped', 'yellow');
      process.exit(code);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      log('');
      log('🛑 Stopping all services...', 'yellow');
      concurrently.kill('SIGINT');
    });

  } catch (error) {
    log('');
    log(`❌ Setup failed: ${error.message}`, 'red');
    log('');
    log('🔧 Troubleshooting tips:', 'yellow');
    log('   • Make sure Node.js 18+ is installed', 'white');
    log('   • Run "npm install" in the root directory', 'white');
    log('   • Check that all environment files are configured', 'white');
    log('   • Ensure PostgreSQL is running (if using local database)', 'white');
    process.exit(1);
  }
}

// Run the setup
setupProject();
