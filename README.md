# Agent System - Production-Ready Implementation

A comprehensive agent management system built with Node.js, featuring real-time data integration, advanced analytics, and production-grade monitoring.

## 🏗️ System Architecture

BahinLink is a full-stack security management solution consisting of:

- **Backend API**: Node.js/TypeScript with Express.js and Prisma ORM
- **Admin Portal**: React/TypeScript with Material-UI for administrative operations
- **Client Portal**: React/TypeScript for client access and monitoring
- **Mobile App**: React Native for field agents
- **Database**: PostgreSQL with Redis caching
- **Infrastructure**: Docker containerization with Nginx reverse proxy

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features

- **Real-time GPS Tracking**: Live location monitoring with geofencing
- **Digital Reporting**: Photo/video-enabled incident and patrol reports
- **Shift Management**: Automated scheduling and attendance tracking
- **Mobile-First Design**: Android app with offline capabilities
- **Role-Based Access**: Admin, Supervisor, Agent, and Client portals
- **Real-time Communication**: In-app messaging and notifications
- **GDPR Compliant**: Built-in privacy and data protection features

## 🏗️ Architecture

- **Backend**: Node.js with Express.js and Prisma ORM
- **Database**: PostgreSQL with PostGIS for geospatial operations
- **Cache**: Redis for session management and caching
- **Mobile**: React Native for Android (iOS planned)
- **Web Portal**: React.js for administrative interface
- **Real-time**: Socket.IO for live updates

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Docker and Docker Compose (recommended)

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bahinlink
   ```

2. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec api npm run db:migrate
   ```

4. **Seed the database**
   ```bash
   docker-compose exec api npm run db:seed
   ```

5. **Access the application**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up PostgreSQL database**
   ```bash
   createdb bahinlink
   psql bahinlink < scripts/init-db.sql
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

6. **Seed the database**
   ```bash
   npm run db:seed
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔐 Default Credentials

After seeding the database, you can use these credentials:

- **Admin**: admin@bahinlink.com / Admin123!@#
- **Supervisor**: supervisor@bahinlink.com / Supervisor123!
- **Agents**: agent1@bahinlink.com to agent5@bahinlink.com / Agent[N]23!

## 📚 API Documentation

The API documentation is available at `/api-docs` when running in development mode. It includes:

- Authentication endpoints
- User management
- GPS tracking and location services
- Shift and attendance management
- Reporting system
- Real-time communication

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## 🚀 Deployment

### Production Docker Build

```bash
# Build production image
docker build -t bahinlink-api:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Key environment variables for production:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/bahinlink
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secret-jwt-key
AWS_S3_BUCKET=your-s3-bucket
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## 📁 Project Structure

```
bahinlink/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── server.js        # Main application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seed.js          # Database seeding
├── mobile/              # React Native mobile app
├── web/                 # React.js web portal
├── tests/               # Test files
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── docker-compose.yml   # Docker configuration
```

## 🔧 Development

### Database Operations

```bash
# Create new migration
npm run db:migrate

# Reset database
npm run db:reset

# View database in Prisma Studio
npm run db:studio

# Push schema changes (development only)
npm run db:push
```

### Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api-docs`

## 🗺️ Roadmap

- [ ] iOS mobile application
- [ ] Advanced analytics and reporting
- [ ] Integration with third-party security systems
- [ ] AI-powered workforce optimization
- [ ] Multi-language support
- [ ] Advanced geofencing features

## 📊 Status

- ✅ Phase 1: Project Setup & Database Foundation
- 🚧 Phase 2: Backend API Core
- ⏳ Phase 3: GPS Tracking & Location Services
- ⏳ Phase 4: Scheduling & Shift Management
- ⏳ Phase 5: Reporting System
- ⏳ Phase 6: Real-time Communication
- ⏳ Phase 7: Mobile Application
- ⏳ Phase 8: Web Portal
- ⏳ Phase 9: Security Implementation
- ⏳ Phase 10: Testing & Quality Assurance
- ⏳ Phase 11: Infrastructure & Deployment
- ⏳ Phase 12: Documentation & Launch
