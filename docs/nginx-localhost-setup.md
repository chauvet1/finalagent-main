# Nginx Localhost Development Setup Guide

This guide provides a comprehensive setup for unifying your BahinLink web project under a single `localhost` domain using Nginx as a reverse proxy.

## Overview

The Nginx configuration routes traffic as follows:
- `http://localhost/` → Backend API (port 8000)
- `http://localhost/admin/` → Admin Portal (port 3001)
- `http://localhost/client/` → Client Portal (port 3003)
- `http://localhost/api/` → Backend API endpoints (port 8000)

## Quick Start

### Automated Setup (Recommended)

1. **Run the setup script**:
   ```powershell
   # Install Nginx configuration
   .\scripts\setup-nginx-localhost.ps1 -Install
   
   # Copy environment files
   copy backend\.env.localhost backend\.env
   copy admin-portal\.env.localhost admin-portal\.env
   copy client-portal\.env.localhost client-portal\.env
   ```

2. **Start services**:
   ```powershell
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Admin Portal
   cd admin-portal
   npm start
   
   # Terminal 3: Client Portal
   cd client-portal
   set PORT=3003 && npm start
   
   # Terminal 4: Start Nginx
   .\scripts\setup-nginx-localhost.ps1 -Start
   ```

3. **Test the setup**:
   ```powershell
   .\scripts\test-localhost-endpoints.ps1
   ```

### Manual Setup

1. **Install Nginx** (if not already installed)
2. **Copy the configuration file**:
   ```bash
   cp nginx/localhost-dev.conf /path/to/nginx/conf/nginx.conf
   ```
3. **Start services in order** (see automated setup above)
4. **Test the setup**:
   - Admin Portal: http://localhost/admin/
   - Client Portal: http://localhost/client/
   - API Health: http://localhost/api/health

## Prerequisites

1. **Nginx installed on Windows**
   - Download from: https://nginx.org/en/download.html
   - Extract to `C:\nginx` or your preferred location

2. **All services running on correct ports:**
   - Backend: Port 8000
   - Admin Portal: Port 3001
   - Client Portal: Port 3003

## Installation Steps

### 1. Install Nginx (if not already installed)

```powershell
# Download and extract Nginx
# Or use Chocolatey
choco install nginx
```

### 2. Configure Nginx

1. **Backup existing configuration:**
   ```powershell
   copy C:\nginx\conf\nginx.conf C:\nginx\conf\nginx.conf.backup
   ```

2. **Replace the main nginx.conf:**
   ```powershell
   copy nginx\localhost-dev.conf C:\nginx\conf\nginx.conf
   ```

   Or manually update `C:\nginx\conf\nginx.conf` with the content from `nginx/localhost-dev.conf`

### 3. Start Services in Correct Order

1. **Start Backend (Port 8000):**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Start Admin Portal (Port 3001):**
   ```powershell
   cd admin-portal
   npm start
   ```

3. **Start Client Portal (Port 3003):**
   ```powershell
   cd client-portal
   $env:PORT=3003; npm start
   ```

4. **Start Nginx:**
   ```powershell
   cd C:\nginx
   .\nginx.exe
   ```

### 4. Verify Setup

Test each endpoint:

```powershell
# Test backend API
Invoke-WebRequest -Uri "http://localhost/api/health" -Method GET

# Test admin portal
Invoke-WebRequest -Uri "http://localhost/admin/" -Method GET

# Test client portal
Invoke-WebRequest -Uri "http://localhost/client/" -Method GET

# Test dashboard API
Invoke-WebRequest -Uri "http://localhost/api/analytics/dashboard" -Method GET
```

## Configuration Details

### Backend API Configuration

- **Port:** 8000 (updated from 3000)
- **CORS:** Configured to allow requests from localhost
- **Endpoints:** All `/api/*` requests are proxied to the backend

### Admin Portal Configuration

- **Port:** 3001
- **Base URL:** Updated to use `http://localhost/api`
- **Proxy:** Removed from package.json (Nginx handles routing)
- **React Router:** Supported with fallback handling

### Client Portal Configuration

- **Port:** 3003
- **Base URL:** Updated to use `http://localhost/api`
- **Proxy:** Removed from package.json (Nginx handles routing)
- **React Router:** Supported with fallback handling

## Nginx Configuration Features

### 1. Upstream Servers
```nginx
upstream backend_dev {
    server localhost:8000;
    keepalive 32;
}

upstream admin_portal_dev {
    server localhost:3001;
    keepalive 32;
}

upstream client_portal_dev {
    server localhost:3003;
    keepalive 32;
}
```

### 2. API Routing
- All `/api/*` requests are proxied to the backend
- CORS headers are properly configured
- WebSocket support for real-time features
- Proper timeout and buffer settings

### 3. SPA Support
- React Router support with fallback handling
- Static asset serving with caching
- Error page handling

### 4. Security Headers
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```powershell
   # Check what's running on ports
   netstat -ano | findstr :80
   netstat -ano | findstr :8000
   netstat -ano | findstr :3001
   netstat -ano | findstr :3003
   ```

2. **Nginx not starting:**
   ```powershell
   # Check Nginx configuration
   cd C:\nginx
   .\nginx.exe -t
   ```

3. **Services not accessible:**
   ```powershell
   # Test individual services
   Invoke-WebRequest -Uri "http://localhost:8000/api/health"
   Invoke-WebRequest -Uri "http://localhost:3001"
   Invoke-WebRequest -Uri "http://localhost:3003"
   ```

### Nginx Commands

```powershell
# Start Nginx
cd C:\nginx
.\nginx.exe

# Stop Nginx
.\nginx.exe -s stop

# Reload configuration
.\nginx.exe -s reload

# Test configuration
.\nginx.exe -t
```

## Development Workflow

1. **Start all services** in the correct order
2. **Access applications** through unified URLs:
   - Admin Portal: `http://localhost/admin/`
   - Client Portal: `http://localhost/client/`
   - API Documentation: `http://localhost/api/health`

3. **Development benefits:**
   - Single domain for all services
   - No CORS issues between frontend and backend
   - Consistent URL structure
   - Easy to share and test

## Production Considerations

For production deployment:

1. **SSL/TLS Configuration:**
   - Add SSL certificates
   - Redirect HTTP to HTTPS
   - Update security headers

2. **Performance Optimization:**
   - Enable gzip compression
   - Configure caching strategies
   - Load balancing for multiple instances

3. **Security Enhancements:**
   - Rate limiting
   - IP whitelisting
   - Enhanced security headers

## API Endpoint Mapping

### Backend API Endpoints (Port 8000)
- `GET /api/health` - Health check
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/users` - User management
- `GET /api/shifts` - Shift management
- `GET /api/sites` - Site management
- `GET /api/reports` - Reports
- `POST /api/auth/*` - Authentication

### Admin Portal Routes (Port 3001)
- `/admin/` - Main dashboard
- `/admin/users` - User management
- `/admin/agents` - Agent management
- `/admin/shifts` - Shift scheduling
- `/admin/reports` - Reporting
- `/admin/settings` - System settings

### Client Portal Routes (Port 3003)
- `/client/` - Client dashboard
- `/client/sites` - Site management
- `/client/requests` - Service requests
- `/client/reports` - Client reports
- `/client/settings` - Client settings

## Environment Variables

Update your `.env` files:

### Backend (.env)
```env
PORT=8000
CORS_ORIGIN=http://localhost
NODE_ENV=development
```

### Admin Portal (.env)
```env
REACT_APP_API_URL=http://localhost/api
PORT=3001
```

### Client Portal (.env)
```env
REACT_APP_API_URL=http://localhost/api
PORT=3003
```

## Automation Scripts

### Setup Script (`scripts/setup-nginx-localhost.ps1`)

Comprehensive PowerShell script for managing the localhost setup:

```powershell
# Install Nginx configuration
.\scripts\setup-nginx-localhost.ps1 -Install

# Start all services
.\scripts\setup-nginx-localhost.ps1 -Start

# Stop Nginx
.\scripts\setup-nginx-localhost.ps1 -Stop

# Check service status
.\scripts\setup-nginx-localhost.ps1 -Status

# Show help
.\scripts\setup-nginx-localhost.ps1
```

### Testing Script (`scripts/test-localhost-endpoints.ps1`)

Comprehensive endpoint testing with performance analysis:

```powershell
# Run all tests
.\scripts\test-localhost-endpoints.ps1

# Verbose output
.\scripts\test-localhost-endpoints.ps1 -Verbose

# Custom base URL
.\scripts\test-localhost-endpoints.ps1 -BaseUrl "http://localhost:8080"
```

## Environment Configurations

Pre-configured environment files for each service:

- `backend/.env.localhost` - Backend configuration
- `admin-portal/.env.localhost` - Admin portal configuration  
- `client-portal/.env.localhost` - Client portal configuration

Copy these to `.env` files in respective directories:

```powershell
copy backend\.env.localhost backend\.env
copy admin-portal\.env.localhost admin-portal\.env
copy client-portal\.env.localhost client-portal\.env
```

## Testing the Setup

### Automated Testing

Use the comprehensive testing script:

```powershell
.\scripts\test-localhost-endpoints.ps1
```

This script tests:
- Nginx health checks
- All API endpoints
- React app loading
- CORS configuration
- WebSocket endpoints
- Performance metrics

### Manual Testing

Run the comprehensive test script:

```powershell
# Test all endpoints
$endpoints = @(
    "http://localhost/health",
    "http://localhost/api/health",
    "http://localhost/api/analytics/dashboard",
    "http://localhost/admin/",
    "http://localhost/client/"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -TimeoutSec 10
        Write-Host "✓ $endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "✗ $endpoint - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

```bash
# Test all endpoints
curl http://localhost/health
curl http://localhost/api/health
curl http://localhost/api/analytics/dashboard
curl http://localhost/admin/
curl http://localhost/client/

# Test CORS
curl -H "Origin: http://localhost" http://localhost/api/health
```

This setup provides a unified development environment that closely mirrors production deployment patterns while maintaining the flexibility needed for local development.