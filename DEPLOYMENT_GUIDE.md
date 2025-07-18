# BahinLink Multi-Port Deployment Guide

## 🏗️ **Architecture Overview**

The BahinLink system uses a **multi-port architecture** that can be deployed both locally and on Vercel under a single domain:

### **Local Development (Multi-Port)**
- **🏠 Landing Page**: http://localhost:3000 (Main Entry Point)
- **👨‍💼 Admin Portal**: http://localhost:3001 (Admin Dashboard)
- **👤 Client Portal**: http://localhost:3002 (Client Dashboard)
- **🔧 Backend API**: http://localhost:8000 (API Server)

### **Production (Vercel - Single Domain)**
- **🏠 Landing Page**: https://your-domain.vercel.app/
- **👨‍💼 Admin Portal**: https://your-domain.vercel.app/admin/*
- **👤 Client Portal**: https://your-domain.vercel.app/client/*
- **🔧 Backend API**: https://your-domain.vercel.app/api/*

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
npm run install:all
```

### **2. Start All Services**
```bash
npm start
```

This will start all four services simultaneously:
- 🔵 **BACKEND** (Port 8000)
- 🟢 **LANDING** (Port 3000)
- 🟡 **ADMIN** (Port 3001)
- 🟣 **CLIENT** (Port 3002)

### **3. Access the System**
- Visit: http://localhost:3000
- Click "Admin Portal" or "Client Portal" to access respective dashboards
- Or directly access:
  - http://localhost:3000/admin/dashboard → redirects to http://localhost:3001/dashboard
  - http://localhost:3000/client/dashboard → redirects to http://localhost:3002/dashboard

## 🔧 **Environment Configuration**

### **Required Environment Variables**

Each application needs these environment variables:

#### **Landing Page (.env)**
```env
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YWxlcnQtY2F0ZmlzaC00Ny5jbGVyay5hY2NvdW50cy5kZXYk
REACT_APP_ADMIN_PORTAL_URL=http://localhost:3001
REACT_APP_CLIENT_PORTAL_URL=http://localhost:3002
```

#### **Admin Portal (.env)**
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YWxlcnQtY2F0ZmlzaC00Ny5jbGVyay5hY2NvdW50cy5kZXYk
REACT_APP_WS_URL=http://localhost:8000
```

#### **Client Portal (.env)**
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YWxlcnQtY2F0ZmlzaC00Ny5jbGVyay5hY2NvdW50cy5kZXYk
```

#### **Backend (.env)**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/bahinlink"
JWT_SECRET=your-jwt-secret
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
```

## 🌐 **Vercel Deployment**

### **1. Prepare for Deployment**
```bash
# Build all applications
npm run build:all

# Test builds locally
npm run start:production
```

### **2. Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### **3. Configure Environment Variables in Vercel**
In your Vercel dashboard, add these environment variables:

```env
REACT_APP_API_URL=https://your-domain.vercel.app/api
REACT_APP_ADMIN_PORTAL_URL=https://your-domain.vercel.app/admin
REACT_APP_CLIENT_PORTAL_URL=https://your-domain.vercel.app/client
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_your-production-clerk-key
```

## 🧪 **Testing the System**

### **1. Test Landing Page Routing**
```bash
# Test redirects
curl -I http://localhost:3000/admin/dashboard
# Should redirect to http://localhost:3001/dashboard

curl -I http://localhost:3000/client/dashboard  
# Should redirect to http://localhost:3002/dashboard
```

### **2. Test Authentication**
1. Visit http://localhost:3000
2. Click "Admin Portal" → Should show admin login
3. Click "Client Portal" → Should show client login
4. Sign in with test credentials
5. Verify dashboard loads without white screens

### **3. Test API Connectivity**
```bash
# Test backend health
curl http://localhost:8000/api/health

# Test admin API (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/admin/dashboard

# Test client API (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/client-portal/dashboard
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. White Screen on Admin/Client Portal**
- Check browser console for Clerk errors
- Verify REACT_APP_CLERK_PUBLISHABLE_KEY is set
- Ensure all dependencies are installed: `npm run install:all`

#### **2. Redirect Not Working**
- Check landing page environment variables
- Verify REACT_APP_ADMIN_PORTAL_URL and REACT_APP_CLIENT_PORTAL_URL
- Clear browser cache

#### **3. API Connection Failed**
- Verify backend is running on port 8000
- Check REACT_APP_API_URL in admin/client portals
- Test backend health endpoint

#### **4. Clerk Authentication Errors**
- Verify Clerk publishable key is correct
- Check Clerk dashboard for domain configuration
- Ensure all applications use the same Clerk key

### **Debug Commands**
```bash
# Check if all services are running
npm run status

# Start individual services for debugging
npm run start:backend
npm run start:landing
npm run start:admin
npm run start:client

# View logs
npm run logs:backend
npm run logs:admin
npm run logs:client
```

## 📊 **System Health Check**

### **Verification Checklist**
- [ ] All four services start without errors
- [ ] Landing page loads at http://localhost:3000
- [ ] Admin portal accessible via redirect or direct URL
- [ ] Client portal accessible via redirect or direct URL
- [ ] Authentication works for both admin and client
- [ ] API endpoints respond correctly
- [ ] Real-time features work (WebSocket connections)
- [ ] No white screens or console errors

### **Performance Monitoring**
- Monitor memory usage of all four Node.js processes
- Check API response times
- Verify WebSocket connection stability
- Monitor Clerk authentication performance

## 🔐 **Security Considerations**

### **Production Security**
- Use HTTPS for all endpoints
- Configure proper CORS settings
- Use production Clerk keys
- Enable rate limiting on API endpoints
- Implement proper error handling
- Use environment-specific database credentials

### **Authentication Security**
- Clerk handles secure authentication
- JWT tokens are managed by Clerk
- Role-based access control implemented
- Session management handled automatically

## 📈 **Scaling Considerations**

### **Horizontal Scaling**
- Each service can be scaled independently
- Use load balancers for high traffic
- Consider containerization with Docker
- Implement health checks for each service

### **Database Scaling**
- Use connection pooling
- Implement read replicas
- Consider database sharding for large datasets
- Monitor query performance

---

## 🎯 **Success Criteria**

The system is successfully deployed when:
1. ✅ All services start and run without errors
2. ✅ Users can access admin dashboard via http://localhost:3000/admin/dashboard
3. ✅ Users can access client dashboard via http://localhost:3000/client/dashboard
4. ✅ Authentication works seamlessly across all portals
5. ✅ API integration provides real data (no mock data)
6. ✅ Real-time features function correctly
7. ✅ System is ready for Vercel deployment under single domain
