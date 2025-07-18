# BahinLink Unified System - Quick Start Guide

## 🚀 One-Command Startup

The BahinLink system is now unified! You can start the entire application with a single command.

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (or Docker for database)

### Quick Start

1. **Install dependencies for all services:**
```bash
npm run install:all
```

2. **Setup database:**
```bash
npm run db:setup
```

3. **Start the entire system:**
```bash
npm start
```

This will start all four services simultaneously:
- **Backend API** (Port 8000)
- **Landing Page** (Port 3000) - Main Entry Point
- **Admin Portal** (Port 3001)
- **Client Portal** (Port 3002)

### Alternative: Manual Startup

If you prefer to start services individually:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Landing Page
cd landing-page && npm start

# Terminal 3: Admin Portal
cd admin-portal && npm start

# Terminal 4: Client Portal
cd client-portal && npm start
```

## 🌐 Access Points

Once all services are running:

- **🏠 Main Entry Point**: http://localhost:3000
  - Start here! The landing page routes users to appropriate portals
  - Admin login redirects to Admin Portal
  - Client login/signup redirects to Client Portal

- **👨‍💼 Admin Portal**: http://localhost:3001
  - Complete workforce management
  - Real-time operations monitoring
  - Client and site management

- **👤 Client Portal**: http://localhost:3002
  - Client dashboard and monitoring
  - Service requests and incident reporting
  - Real-time agent tracking

- **🔧 Backend API**: http://localhost:8000
  - RESTful API with real database integration
  - Health check: http://localhost:8000/health

## 🔧 Available Commands

### Unified Commands
```bash
npm start              # Start entire system
npm run dev            # Start in development mode
npm run build          # Build all applications
npm test               # Run all tests
npm run clean          # Clean all node_modules and builds
```

### Setup Commands
```bash
npm run install:all    # Install dependencies for all services
npm run db:setup       # Setup database (generate + migrate)
npm run db:seed        # Seed database with sample data
```

### Individual Service Commands
```bash
npm run start:backend  # Start only backend
npm run start:landing  # Start only landing page
npm run start:admin    # Start only admin portal
npm run start:client   # Start only client portal
```

### Build Commands
```bash
npm run build:all      # Build all applications
npm run build:backend  # Build only backend
npm run build:landing  # Build only landing page
npm run build:admin    # Build only admin portal
npm run build:client   # Build only client portal
```

## 🔐 Authentication

The system uses Clerk authentication with pre-configured test keys:

- **Test Admin**: Use any email with admin role
- **Test Client**: Use any email with client role
- **Development**: All authentication flows work out of the box

## 🗄️ Database

The system uses PostgreSQL with Prisma ORM:

- **Real Data**: No mock data - all endpoints use actual database
- **Migrations**: Automatic schema management
- **Seeding**: Sample data for testing

## 🐳 Docker Support

You can also run the system with Docker:

```bash
docker-compose up --build
```

## 🛠️ Development

### Project Structure
```
├── backend/           # Node.js/Express API
├── landing-page/      # React landing page (entry point)
├── admin-portal/      # React admin dashboard
├── client-portal/     # React client interface
├── prisma/           # Database schema and migrations
└── scripts/          # Utility scripts
```

### Key Features
- ✅ Unified entry point via landing page
- ✅ Real database integration (no mock data)
- ✅ Clerk authentication across all portals
- ✅ Material-UI consistent design
- ✅ Real-time capabilities with Socket.IO
- ✅ Comprehensive error handling

## 🔄 Workflow

1. **User visits**: http://localhost:3000 (Landing Page)
2. **Authentication**: User chooses Admin or Client login
3. **Redirection**: Automatic redirect to appropriate portal
4. **Portal Access**: Full functionality in respective portal
5. **API Integration**: All data from real backend API

## 🆘 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's running on ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002
netstat -ano | findstr :8000
```

**Database issues:**
```bash
# Reset database
npm run db:reset

# Regenerate Prisma client
npm run db:generate
```

**Dependency issues:**
```bash
# Clean and reinstall
npm run clean
npm run install:all
```

### Getting Help

1. Check the logs in each terminal window
2. Verify all environment files are configured
3. Ensure PostgreSQL is running
4. Check that all ports are available

## 🎯 Next Steps

1. **Production Setup**: Update Clerk keys for production
2. **Database**: Configure production PostgreSQL
3. **Deployment**: Use Docker Compose for production
4. **Monitoring**: Set up logging and monitoring
5. **Testing**: Run comprehensive test suites

---

**🎉 You're all set! The unified BahinLink system is ready to use.**
