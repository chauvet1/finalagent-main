# BahinLink Unified Localhost Setup

## Overview

This setup unifies the entire BahinLink web project under a single `localhost` domain using Nginx as a reverse proxy. All services are accessible through different sub-paths, providing a production-like environment for development.

## Architecture

```
http://localhost/
├── /admin/          → Admin Portal (port 3001)
├── /client/         → Client Portal (port 3003)
├── /api/            → Backend API (port 8000)
├── /socket.io/      → WebSocket connections
└── /uploads/        → Static file uploads
```

## Quick Start

### 1. Automated Setup (Recommended)

```powershell
# Install Nginx configuration
.\scripts\setup-nginx-localhost.ps1 -Install

# Copy environment configurations
copy backend\.env.localhost backend\.env
copy admin-portal\.env.localhost admin-portal\.env
copy client-portal\.env.localhost client-portal\.env
```

### 2. Start Services

```powershell
# Terminal 1: Backend API
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

### 3. Verify Setup

```powershell
# Run comprehensive tests
.\scripts\test-localhost-endpoints.ps1

# Check service status
.\scripts\setup-nginx-localhost.ps1 -Status
```

## Access URLs

Once everything is running:

- **Admin Portal**: http://localhost/admin/
- **Client Portal**: http://localhost/client/
- **API Health**: http://localhost/api/health
- **Dashboard API**: http://localhost/api/analytics/dashboard

## Key Features

### ✅ Unified Domain
- Single `localhost` entry point
- Production-like routing
- Simplified development workflow

### ✅ Automated Scripts
- **Setup Script**: `scripts/setup-nginx-localhost.ps1`
- **Testing Script**: `scripts/test-localhost-endpoints.ps1`
- **Environment Configs**: Pre-configured `.env` files

### ✅ Production-Ready Configuration
- CORS handling
- Security headers
- Static file caching
- Rate limiting
- Compression (gzip)

### ✅ Comprehensive Testing
- API endpoint validation
- React app loading tests
- Performance monitoring
- CORS verification
- WebSocket testing

## File Structure

```
finalagent-main/
├── nginx/
│   └── localhost-dev.conf          # Nginx configuration
├── scripts/
│   ├── setup-nginx-localhost.ps1   # Setup automation
│   └── test-localhost-endpoints.ps1 # Testing automation
├── backend/
│   ├── .env.localhost              # Backend environment
│   └── src/server.ts               # Updated for port 8000
├── admin-portal/
│   ├── .env.localhost              # Admin environment
│   ├── package.json                # Proxy removed
│   └── src/services/api.ts         # Updated API URL
├── client-portal/
│   ├── .env.localhost              # Client environment
│   ├── package.json                # Proxy removed
│   └── src/services/api.ts         # Updated API URL
└── docs/
    └── nginx-localhost-setup.md    # Detailed documentation
```

## Configuration Changes Made

### Backend (`backend/src/server.ts`)
- ✅ Changed default port from 3000 to 8000
- ✅ Added CORS origin for `http://localhost`

### Admin Portal (`admin-portal/`)
- ✅ Updated API base URL to `http://localhost/api`
- ✅ Removed proxy configuration from `package.json`
- ✅ Added environment configuration

### Client Portal (`client-portal/`)
- ✅ Updated API base URL to `http://localhost/api`
- ✅ Removed proxy configuration from `package.json`
- ✅ Added environment configuration
- ✅ Fixed dashboard API endpoint mismatch

### Nginx Configuration
- ✅ Created unified reverse proxy setup
- ✅ Configured sub-path routing
- ✅ Added security headers and CORS
- ✅ Enabled compression and caching

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```powershell
   # Check what's using ports
   netstat -ano | findstr :80
   netstat -ano | findstr :8000
   netstat -ano | findstr :3001
   netstat -ano | findstr :3003
   ```

2. **Nginx not starting**:
   ```powershell
   # Test configuration
   nginx -t
   
   # Check logs
   type C:\nginx\logs\error.log
   ```

3. **API endpoints not working**:
   ```powershell
   # Test backend directly
   curl http://localhost:8000/api/health
   
   # Test through Nginx
   curl http://localhost/api/health
   ```

### Service Status Check

```powershell
# Quick status check
.\scripts\setup-nginx-localhost.ps1 -Status

# Detailed endpoint testing
.\scripts\test-localhost-endpoints.ps1 -Verbose
```

## Development Workflow

1. **Daily startup**:
   ```powershell
   .\scripts\setup-nginx-localhost.ps1 -Start
   ```

2. **Code changes**: No additional steps needed - all services hot-reload

3. **Testing**: 
   ```powershell
   .\scripts\test-localhost-endpoints.ps1
   ```

4. **Shutdown**:
   ```powershell
   .\scripts\setup-nginx-localhost.ps1 -Stop
   ```

## Production Considerations

This setup closely mirrors production deployment:

- **Reverse proxy pattern**: Same as production load balancers
- **Sub-path routing**: Matches production URL structure
- **CORS configuration**: Production-ready headers
- **Security headers**: Industry standard security
- **Static file serving**: Optimized caching rules

## Next Steps

1. **Database Integration**: Update connection strings in environment files
2. **Authentication**: Configure Clerk or other auth providers
3. **SSL/HTTPS**: Add SSL certificates for production-like HTTPS
4. **Monitoring**: Integrate logging and monitoring solutions
5. **CI/CD**: Adapt build processes for unified deployment

## Support

For issues or questions:

1. Check the detailed documentation: `docs/nginx-localhost-setup.md`
2. Run the diagnostic script: `scripts/test-localhost-endpoints.ps1 -Verbose`
3. Review service logs in respective directories
4. Verify environment configurations match your setup

---

**Status**: ✅ Ready for Development

**Last Updated**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

**Version**: 1.0.0