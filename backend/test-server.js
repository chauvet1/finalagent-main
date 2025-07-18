const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8000;

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test endpoints that the frontend is calling
app.get('/api/client/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      activeSites: 3,
      totalSites: 5,
      activeShifts: 2,
      incidentsToday: 1,
      pendingRequests: 0,
      totalAgents: 8
    }
  });
});

app.get('/api/client/dashboard/activity', (req, res) => {
  res.json({
    success: true,
    data: {
      recentReports: [
        {
          id: '1',
          type: 'DAILY',
          title: 'Daily Security Report',
          status: 'SUBMITTED',
          agentName: 'John Doe',
          siteName: 'Main Office',
          createdAt: new Date().toISOString()
        }
      ],
      recentIncidents: [
        {
          id: '1',
          type: 'SUSPICIOUS_ACTIVITY',
          title: 'Suspicious Person Reported',
          severity: 'MEDIUM',
          status: 'RESOLVED',
          reportedBy: 'Jane Smith',
          siteName: 'Main Office',
          occurredAt: new Date().toISOString()
        }
      ],
      recentAttendance: [
        {
          id: '1',
          agentName: 'John Doe',
          siteName: 'Main Office',
          clockInTime: new Date().toISOString(),
          clockOutTime: null,
          status: 'ACTIVE'
        }
      ]
    }
  });
});

app.get('/api/client/sites/status', (req, res) => {
  res.json({
    success: true,
    data: {
      sites: [
        {
          id: '1',
          name: 'Main Office',
          address: '123 Business St, City',
          status: 'ACTIVE',
          securityLevel: 'MEDIUM',
          activeShifts: 1,
          activeAgents: [
            {
              id: 'johndoe',
              name: 'John Doe',
              shiftStart: new Date().toISOString(),
              shiftEnd: null
            }
          ],
          openIncidents: 0,
          recentReports: 2,
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        {
          id: '2',
          name: 'Warehouse',
          address: '456 Industrial Ave, City',
          status: 'ACTIVE',
          securityLevel: 'HIGH',
          activeShifts: 1,
          activeAgents: [
            {
              id: 'janesmith',
              name: 'Jane Smith',
              shiftStart: new Date().toISOString(),
              shiftEnd: null
            }
          ],
          openIncidents: 1,
          recentReports: 1,
          coordinates: { lat: 40.7589, lng: -73.9851 }
        }
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test Backend API is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
});
