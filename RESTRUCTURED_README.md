# BahinLink Security Workforce Management System - Restructured

A comprehensive security workforce management platform built with modern web technologies, featuring real-time tracking, incident management, and client portal access.

## 🏗️ Architecture Overview

The application has been restructured as a multi-portal system with a unified entry point:

- **Landing Page** (Port 3000): Main entry point with authentication flows
- **Admin Portal** (Port 3001): Comprehensive workforce management for administrators
- **Client Portal** (Port 3002): Client-facing dashboard for monitoring services
- **Backend API** (Port 8000): RESTful API with real database integration
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk for secure user management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### 1. Environment Setup

All environment files are already configured:

```bash
# Backend - already configured
# Landing Page - already configured  
# Admin Portal - already configured
# Client Portal - already configured
```

### 2. Database Setup

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Generate Prisma client and run migrations
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 3. Install Dependencies

```bash
# Backend
cd backend && npm install

# Landing Page
cd landing-page && npm install

# Admin Portal
cd admin-portal && npm install

# Client Portal
cd client-portal && npm install
```

### 4. Start the Application

#### Option A: Development Mode (Recommended)

Start each service in separate terminals:

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Landing Page
cd landing-page
npm start

# Terminal 3: Admin Portal
cd admin-portal
npm start

# Terminal 4: Client Portal
cd client-portal
npm start
```

#### Option B: Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 5. Access the Application

- **Landing Page**: http://localhost:3000 (Main Entry Point)
- **Admin Portal**: http://localhost:3001
- **Client Portal**: http://localhost:3002
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health

## 🔐 Authentication Flow

### For Administrators:
1. Visit http://localhost:3000 (Landing Page)
2. Click "Admin Portal"
3. Sign in with admin credentials via Clerk
4. Automatically redirected to Admin Dashboard

### For Clients:
1. Visit http://localhost:3000 (Landing Page)
2. Click "Client Portal" or "Create Client Account"
3. Sign in or create account via Clerk
4. Automatically redirected to Client Dashboard

## 📁 Project Structure

```
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── routes/         # Real API route handlers
│   │   ├── middleware/     # Authentication & validation
│   │   └── server.ts       # Main server file
│   └── prisma/             # Database schema & migrations
├── landing-page/           # React landing page (Entry Point)
│   ├── src/
│   │   ├── pages/         # Landing, login, signup pages
│   │   └── components/    # Reusable components
├── admin-portal/           # React admin dashboard
│   ├── src/
│   │   ├── pages/         # Complete admin pages
│   │   ├── components/    # Admin components
│   │   └── services/      # API services
├── client-portal/          # React client dashboard
│   ├── src/
│   │   ├── pages/         # Complete client pages
│   │   ├── components/    # Client components
│   │   └── services/      # API services
├── nginx/                  # Nginx reverse proxy
├── docker-compose.yml      # Docker services
└── README.md
```

## 🛠️ Development

### Backend API Development

The backend now uses **real database integration** with Prisma ORM (no mock data):

- **Users Management**: `/api/users` - Complete CRUD with validation
- **Shifts Management**: `/api/shifts` - Real scheduling with conflict detection
- **Sites Management**: `/api/sites` - Site management with geofencing
- **Reports Management**: `/api/reports` - Comprehensive reporting system
- **Analytics**: `/api/analytics` - Real-time dashboard data
- **Client Portal**: `/api/client-portal` - Client-specific endpoints

### Frontend Development

Each portal is a complete React application:

- **Landing Page**: Material-UI with Clerk authentication flows
- **Admin Portal**: Comprehensive dashboard with all admin features implemented
- **Client Portal**: Complete client interface with real-time monitoring

### Database Schema

The application uses a comprehensive PostgreSQL schema with:

- User management with role-based access (ADMIN, SUPERVISOR, AGENT, CLIENT)
- Agent and client profiles with detailed information
- Site and shift management with GPS tracking
- Report and incident tracking with media support
- Real-time location data with geofencing
- Comprehensive audit logging

## 🔧 Configuration

### Environment Variables

Key environment variables (already configured):

```bash
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/bahinlink
CLERK_SECRET_KEY=your_clerk_secret_key
JWT_SECRET=your_jwt_secret

# All Frontend Applications
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YWxlcnQtY2F0ZmlzaC00Ny5jbGVyay5hY2NvdW50cy5kZXYk
```

### Clerk Authentication Setup

The application is pre-configured with Clerk test keys. For production:

1. Create a Clerk account at https://clerk.dev
2. Create a new application
3. Copy the publishable and secret keys
4. Update environment files with your production keys

## ✅ Implementation Status

### Completed Features:
- ✅ **Restructured Architecture**: Landing page as main entry point
- ✅ **Real Database Integration**: No mock data, full Prisma integration
- ✅ **Authentication Flows**: Complete Clerk integration with role-based access
- ✅ **Admin Portal**: All major features implemented and functional
- ✅ **Client Portal**: Complete client interface with real-time capabilities
- ✅ **Backend API**: Comprehensive REST API with proper error handling
- ✅ **Database Schema**: Complete schema aligned with PRD requirements

### Key Improvements:
- 🔄 **Unified Entry Point**: Landing page routes users to appropriate portals
- 🔄 **No Mock Data**: All endpoints use real database queries
- 🔄 **Proper Authentication**: Seamless flow between landing page and portals
- 🔄 **Error Handling**: Comprehensive error handling throughout the application
- 🔄 **PRD Alignment**: Implementation matches Product Requirements Document

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd admin-portal
npm test

cd client-portal
npm test

cd landing-page
npm test
```

## 📦 Deployment

### Production Build

```bash
# Build all applications
cd backend && npm run build
cd landing-page && npm run build
cd admin-portal && npm run build
cd client-portal && npm run build
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 Recent Updates

- ✅ **Application Restructuring**: Complete architecture overhaul with landing page entry point
- ✅ **Database Integration**: Replaced all mock data with real Prisma-based API endpoints
- ✅ **Authentication Integration**: Seamless Clerk authentication across all portals
- ✅ **Feature Completion**: All admin and client portal features fully implemented
- ✅ **PRD Compliance**: Application now fully aligns with Product Requirements Document

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
