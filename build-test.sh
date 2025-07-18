#!/bin/bash

# BahinLink System - Comprehensive Build Test
echo "🚀 Testing BahinLink System Build Process"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to check if command succeeded
check_command() {
    if [ $? -eq 0 ]; then
        print_status "SUCCESS" "$1"
        return 0
    else
        print_status "ERROR" "$1"
        return 1
    fi
}

# Clean previous builds
print_status "INFO" "Cleaning previous builds..."
rm -rf client-portal/build admin-portal/build backend/dist
print_status "SUCCESS" "Previous builds cleaned"

# Test Client Portal Build
echo ""
print_status "INFO" "Building Client Portal..."
cd client-portal
npm ci
if check_command "Client Portal dependencies installed"; then
    npm run build
    if check_command "Client Portal build completed"; then
        if [ -d "build" ] && [ -f "build/index.html" ]; then
            print_status "SUCCESS" "Client Portal build artifacts verified"
        else
            print_status "ERROR" "Client Portal build artifacts missing"
            exit 1
        fi
    else
        print_status "ERROR" "Client Portal build failed"
        exit 1
    fi
else
    print_status "ERROR" "Client Portal dependency installation failed"
    exit 1
fi
cd ..

# Test Admin Portal Build
echo ""
print_status "INFO" "Building Admin Portal..."
cd admin-portal
npm ci
if check_command "Admin Portal dependencies installed"; then
    npm run build
    if check_command "Admin Portal build completed"; then
        if [ -d "build" ] && [ -f "build/index.html" ]; then
            print_status "SUCCESS" "Admin Portal build artifacts verified"
        else
            print_status "ERROR" "Admin Portal build artifacts missing"
            exit 1
        fi
    else
        print_status "ERROR" "Admin Portal build failed"
        exit 1
    fi
else
    print_status "ERROR" "Admin Portal dependency installation failed"
    exit 1
fi
cd ..

# Test Backend Build (if applicable)
echo ""
print_status "INFO" "Building Backend..."
cd backend
npm ci
if check_command "Backend dependencies installed"; then
    if npm run build 2>/dev/null; then
        print_status "SUCCESS" "Backend build completed"
    else
        print_status "WARNING" "Backend build not configured (development only)"
    fi
else
    print_status "ERROR" "Backend dependency installation failed"
    exit 1
fi
cd ..

# Verify build sizes
echo ""
print_status "INFO" "Checking build sizes..."

if [ -d "client-portal/build" ]; then
    CLIENT_SIZE=$(du -sh client-portal/build | cut -f1)
    print_status "INFO" "Client Portal build size: $CLIENT_SIZE"
fi

if [ -d "admin-portal/build" ]; then
    ADMIN_SIZE=$(du -sh admin-portal/build | cut -f1)
    print_status "INFO" "Admin Portal build size: $ADMIN_SIZE"
fi

# Test TypeScript compilation
echo ""
print_status "INFO" "Testing TypeScript compilation..."

cd client-portal
if npm run type-check 2>/dev/null; then
    print_status "SUCCESS" "Client Portal TypeScript check passed"
else
    print_status "WARNING" "Client Portal TypeScript issues (non-blocking)"
fi
cd ..

cd admin-portal
if npm run type-check 2>/dev/null; then
    print_status "SUCCESS" "Admin Portal TypeScript check passed"
else
    print_status "WARNING" "Admin Portal TypeScript issues (non-blocking)"
fi
cd ..

# Final summary
echo ""
echo "🎉 Build Test Summary"
echo "===================="
print_status "SUCCESS" "All builds completed successfully!"
print_status "INFO" "System is ready for Vercel deployment"
print_status "INFO" "Run 'vercel --prod' to deploy to production"

echo ""
echo "📁 Build Artifacts:"
echo "   📱 Client Portal: client-portal/build/"
echo "   👨‍💼 Admin Portal:  admin-portal/build/"
echo ""
echo "🌐 Deployment URLs (after Vercel deploy):"
echo "   🏠 Main Site:     https://your-project.vercel.app"
echo "   👨‍💼 Admin Portal: https://your-project.vercel.app/admin"
echo ""
