# BahinLink Unified Domain Setup

This document provides comprehensive instructions for configuring BahinLink with a unified domain setup that routes correctly in both development and production environments.

## 🌐 Domain Architecture

### Development Environment
- **Landing Page**: `localhost:3000` → `localhost/`
- **Admin Panel**: `localhost:3001` → `localhost/admin/dashboard`
- **Client Portal**: `localhost:3003` → `localhost/client/dashboard`
- **Backend API**: `localhost:8000` → `localhost/api/*`

### Production Environment
- **Landing Page**: `domain.com/`
- **Admin Panel**: `domain.com/admin/dashboard`
- **Client Portal**: `domain.com/client/dashboard`
- **Backend API**: `domain.com/api/*`

## 🚀 Quick Start

### Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start All Services**
   ```bash
   npm run start:all
   ```
   This will start:
   - Landing Page on port 3000
   - Admin Portal on port 3001
   - Client Portal on port 3003
   - Backend API on port 8000

3. **Configure Nginx (Optional for Development)**
   ```bash
   # Install Nginx (Windows)
   # Download from https://nginx.org/en/download.html
   
   # Copy the nginx.conf to your Nginx installation
   cp nginx.conf /path/to/nginx/conf/nginx.conf
   
   # Start Nginx
   nginx
   ```

4. **Access the Application**
   - With Nginx: `http://localhost`
   - Direct access:
     - Landing: `http://localhost:3000`
     - Admin: `http://localhost:3001`
     - Client: `http://localhost:3003`

### Production Deployment

1. **Build All Applications**
   ```bash
   # Build with correct public paths
   cd admin-portal && npm run build
   cd ../client-portal && npm run build
   cd ../landing-page && npm run build
   ```

2. **Deploy to Your Server**
   - Copy built files to your web server
   - Configure Nginx using `nginx-production.conf`
   - Update domain name in the configuration

## 📁 Project Structure

```
bahinlink/
├── admin-portal/          # Admin Panel (React SPA)
├── client-portal/         # Client Portal (React SPA)
├── landing-page/          # Landing Page (React SPA)
├── backend/              # Node.js API Server
├── nginx.conf            # Development Nginx config
├── nginx-production.conf # Production Nginx config
└── package.json          # Root package with start scripts
```

## 🔧 Configuration Details

### React Router Configuration

Each React application is configured with the appropriate `basename` for sub-path routing:

**Admin Portal** (`admin-portal/src/index.tsx`):
```tsx
<BrowserRouter basename="/admin">
```

**Client Portal** (`client-portal/src/App.tsx`):
```tsx
<Router basename="/client">
```

**Landing Page** (`landing-page/src/index.tsx`):
```tsx
<BrowserRouter> // No basename - serves root path
```

### Build Configuration

Each application builds with the correct `PUBLIC_URL` for static asset serving:

**Admin Portal**:
```json
"build": "cross-env PUBLIC_URL=/admin GENERATE_SOURCEMAP=false react-scripts build"
```

**Client Portal**:
```json
"build": "PUBLIC_URL=/client react-scripts build"
```

### Nginx Configuration

The Nginx configuration handles:
- **Reverse Proxy**: Routes requests to appropriate backend services
- **SPA Fallback**: Handles client-side routing for React applications
- **Static Assets**: Serves built assets with correct paths
- **WebSocket Support**: Proxies WebSocket connections for real-time features
- **Security Headers**: Adds security headers for production
- **Gzip Compression**: Compresses responses for better performance

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. 404 Errors on Sub-routes
**Problem**: Accessing `/admin/dashboard` directly returns 404
**Solution**: Ensure Nginx `try_files` directive includes fallback to `index.html`
```nginx
try_files $uri $uri/ /index.html;
```

#### 2. Static Assets Not Loading
**Problem**: CSS/JS files return 404 in production
**Solution**: Verify `PUBLIC_URL` is set correctly in build scripts
```bash
# Check built files have correct paths
ls -la admin-portal/build/static/
```

#### 3. API Calls Failing
**Problem**: API requests return CORS errors
**Solution**: Ensure backend CORS configuration allows the domain
```javascript
// backend/src/middleware/cors.js
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3003',
  'https://yourdomain.com'
];
```

#### 4. WebSocket Connection Issues
**Problem**: Real-time features not working
**Solution**: Check Nginx WebSocket proxy configuration
```nginx
location /sockjs-node {
    proxy_pass http://admin_portal;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Development Tips

1. **Hot Reload**: Each service supports hot reload in development
2. **Environment Variables**: Use `.env` files for service-specific configuration
3. **Port Conflicts**: Ensure no other services are using ports 3000, 3001, 3003, 8000
4. **Browser Cache**: Clear browser cache when testing routing changes

### Production Deployment Checklist

- [ ] All applications build successfully with correct `PUBLIC_URL`
- [ ] Nginx configuration updated with production domain
- [ ] SSL certificates configured (recommended)
- [ ] Environment variables set for production
- [ ] Database connections configured
- [ ] API endpoints updated for production domain
- [ ] CORS configuration includes production domain
- [ ] Security headers configured in Nginx
- [ ] Gzip compression enabled
- [ ] Rate limiting configured

## 📚 Additional Resources

- [React Router Documentation](https://reactrouter.com/)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [WebSocket Proxy Configuration](https://nginx.org/en/docs/http/websocket.html)

## 🔒 Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Security Headers**: Configure CSP, HSTS, and other security headers
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Authentication**: Ensure proper authentication on all protected routes
5. **CORS**: Configure CORS restrictively for production

## 📞 Support

For issues or questions regarding the unified domain setup:
1. Check the troubleshooting section above
2. Review Nginx error logs: `tail -f /var/log/nginx/error.log`
3. Check application logs for each service
4. Verify network connectivity between services

---

**Note**: This configuration supports both development and production environments with minimal changes required between deployments.