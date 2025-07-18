@echo off
title BahinLink System Startup

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    BahinLink System Startup                 ║
echo ║          Security Workforce Management Platform             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js is installed
echo.

echo 📦 Installing dependencies...
cd backend && call npm install
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

cd landing-page && call npm install
if errorlevel 1 (
    echo ❌ Failed to install landing-page dependencies
    pause
    exit /b 1
)
cd ..

cd admin-portal && call npm install
if errorlevel 1 (
    echo ❌ Failed to install admin-portal dependencies
    pause
    exit /b 1
)
cd ..

cd client-portal && call npm install
if errorlevel 1 (
    echo ❌ Failed to install client-portal dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo 🔧 Setting up database...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo 🚀 Starting BahinLink System...
echo.
echo 📍 Application URLs:
echo    • Landing Page:  http://localhost:3000
echo    • Admin Portal:  http://localhost:3001
echo    • Client Portal: http://localhost:3002
echo    • Backend API:   http://localhost:8000
echo.
echo 💡 Press Ctrl+C to stop all services
echo.

call npx concurrently --kill-others --names "BACKEND,LANDING,ADMIN,CLIENT" --prefix-colors "blue,green,yellow,magenta" "cd backend && npm run dev" "cd landing-page && npm start" "cd admin-portal && npm start" "cd client-portal && npm start"

echo.
echo 👋 BahinLink System stopped
pause
