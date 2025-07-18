# BahinLink Unified Web Project Setup

This project uses Nginx as a reverse proxy to unify all services under a single `localhost` domain with different sub-paths.

## Services Overview

- **Backend API**: Running on port 8000
- **Admin Portal**: Running on port 3001
- **Client Portal**: Running on port 3002

## URL Routing

With Nginx configured, you can access all services through:

- `http://localhost/` → Backend API (port 8000)
- `http://localhost/admin/` → Admin Portal (port 3001)
- `http://localhost/client/` → Client Portal (port 3002)
- `http://localhost/api/` → Backend API endpoints (port 8000)
- `http://localhost/health` → Backend health check

## Quick Start

### 1. Start All Services

```bash
npm start
```

This command will concurrently start:
- Backend on port 8000
- Admin Portal on port 3001
- Client Portal on port 3002

### 2. Start Nginx (Optional)

If you want to use the unified routing:

#### On Windows:
```bash
# Install Nginx if not already installed
# Download from: https://nginx.org/en/download.html

# Start Nginx with custom config
nginx -c "C:\Users\hauss\Pictures\agent\finalagent-main\nginx.conf"
```

#### On Linux/macOS:
```bash
# Install Nginx if not already installed
sudo apt-get install nginx  # Ubuntu/Debian
brew install nginx          # macOS

# Start Nginx with custom config
sudo nginx -c /path/to/your/project/nginx.conf
```

### 3. Access the Applications

- **Direct Access** (without Nginx):
  - Backend: http://localhost:8000
  - Admin Portal: http://localhost:3001
  - Client Portal: http://localhost:3002

- **Unified Access** (with Nginx):
  - Backend: http://localhost/
  - Admin Portal: http://localhost/admin/
  - Client Portal: http://localhost/client/

## Development Notes

- All services support hot reloading during development
- WebSocket connections are properly proxied for React dev servers
- CORS is configured for API endpoints
- Rate limiting is applied to prevent abuse

## Troubleshooting

### Port Conflicts
If you encounter port conflicts:
1. Check what's running on the ports: `netstat -ano | findstr :PORT_NUMBER`
2. Kill conflicting processes: `taskkill /PID <process_id> /F`
3. Restart the services: `npm start`

### Nginx Issues
- Ensure Nginx is installed and accessible
- Check the nginx.conf file path is correct
- Verify all upstream services are running before starting Nginx
- Check Nginx error logs for detailed error information

### Service Startup Issues
- Ensure all dependencies are installed: `npm install`
- Check individual service logs in the console output
- Verify Node.js version compatibility (>=18.0.0)

## Configuration Files

- `package.json`: Root package with concurrent startup scripts
- `nginx.conf`: Nginx reverse proxy configuration
- `backend/.env`: Backend environment variables
- `admin-portal/.env`: Admin portal environment variables
- `client-portal/.env`: Client portal environment variables