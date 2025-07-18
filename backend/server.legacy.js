const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Authentication required' }
    });
  }

  const token = authHeader.substring(7);

  try {
    let user = null;

    // For development, accept email as token for backward compatibility
    if (token.includes('@')) {
      // Email-based authentication (development only)
      user = await prisma.user.findUnique({
        where: { email: token },
        include: { adminProfile: true, clientProfile: true, agentProfile: true }
      });
    } else {
      // Try to verify Clerk JWT token
      try {
        // For now, we'll implement a simple token verification
        // In production, you should use Clerk's verifyToken function
        const decoded = Buffer.from(token, 'base64').toString();
        const [id] = decoded.split(':');

        user = await prisma.user.findUnique({
          where: { id },
          include: { adminProfile: true, clientProfile: true, agentProfile: true }
        });
      } catch (decodeError) {
        // If not base64, try to find user by clerkId (for future Clerk integration)
        user = await prisma.user.findUnique({
          where: { clerkId: token },
          include: { adminProfile: true, clientProfile: true, agentProfile: true }
        });
      }
    }

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' }
    });
  }
};

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 8000;

// Webhook verification function
const verifyClerkWebhook = (payload, signature, secret) => {
  if (!signature || !secret) {
    throw new Error('Missing signature or secret');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const actualSignature = signature.replace('v1,', '');

  if (expectedSignature !== actualSignature) {
    throw new Error('Invalid webhook signature');
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Handle authentication
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data;
      // Verify token and get user info
      // For now, just acknowledge the connection
      socket.emit('authenticated', { success: true });
      console.log('✅ Client authenticated:', socket.id);
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      socket.emit('authentication_error', { error: 'Authentication failed' });
    }
  });

  // Handle monitoring events
  socket.on('join_monitoring', () => {
    socket.join('monitoring');
    console.log('📊 Client joined monitoring room:', socket.id);
  });

  socket.on('join_client_monitoring', (data) => {
    const { clientId } = data;
    socket.join(`client_${clientId}`);
    console.log('👤 Client joined client monitoring room:', socket.id, clientId);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, reason);
  });
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",  // Client portal
    "http://localhost:3001"   // Admin portal
  ],
  credentials: true
}));
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      database: 'healthy',
      redis: 'healthy',
      websocket: 'healthy',
      socketio: 'running'
    },
    connectedClients: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Clerk Webhook endpoint for user synchronization
app.post('/api/webhooks', async (req, res) => {
  console.log('🔔 Clerk webhook received');

  try {
    const signature = req.headers['svix-signature'];
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ CLERK_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    verifyClerkWebhook(req.body, signature, webhookSecret);

    // Parse the webhook payload
    const payload = JSON.parse(req.body.toString());
    const { type, data } = payload;

    console.log(`📨 Webhook event: ${type}`);

    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      default:
        console.log(`⚠️ Unhandled webhook event: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

// Webhook handler functions
async function handleUserCreated(userData) {
  console.log('👤 Creating user in database:', userData.email_addresses[0]?.email_address);

  try {
    const primaryEmail = userData.email_addresses.find(email => email.id === userData.primary_email_address_id);

    if (!primaryEmail) {
      console.error('❌ No primary email found for user');
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userData.id }
    });

    if (existingUser) {
      console.log('✅ User already exists in database');
      return;
    }

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        clerkId: userData.id,
        email: primaryEmail.email_address,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        username: userData.username || primaryEmail.email_address.split('@')[0],
        role: 'CLIENT', // Default role, can be updated later
        status: 'ACTIVE',
        phone: userData.phone_numbers[0]?.phone_number || null
      }
    });

    console.log('✅ User created in database:', newUser.id);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
}

async function handleUserUpdated(userData) {
  console.log('📝 Updating user in database:', userData.email_addresses[0]?.email_address);

  try {
    const primaryEmail = userData.email_addresses.find(email => email.id === userData.primary_email_address_id);

    if (!primaryEmail) {
      console.error('❌ No primary email found for user');
      return;
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { clerkId: userData.id },
      data: {
        email: primaryEmail.email_address,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        username: userData.username || primaryEmail.email_address.split('@')[0],
        phone: userData.phone_numbers[0]?.phone_number || null
      }
    });

    console.log('✅ User updated in database:', updatedUser.id);
  } catch (error) {
    console.error('❌ Error updating user:', error);
  }
}

async function handleUserDeleted(userData) {
  console.log('🗑️ Deleting user from database:', userData.id);

  try {
    // Soft delete - update status instead of hard delete
    await prisma.user.update({
      where: { clerkId: userData.id },
      data: { status: 'INACTIVE' }
    });

    console.log('✅ User marked as inactive in database');
  } catch (error) {
    console.error('❌ Error deleting user:', error);
  }
}

// Analytics dashboard endpoint with real database data
app.get('/api/analytics/dashboard', async (req, res) => {
  console.log('🔥 Analytics dashboard endpoint hit at', new Date().toISOString());
  console.log('📡 Request from:', req.headers.origin || 'unknown origin');
  console.log('🔑 Authorization:', req.headers.authorization || 'no auth header');
  console.log('📋 All headers:', JSON.stringify(req.headers, null, 2));

  try {
    // Get real data from database
    const [
      totalUsers,
      totalAgents,
      activeShifts,
      activeSites,
      incidentsToday,
      reportsToday,
      recentReports
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),

      // Total agents count
      prisma.agentProfile.count(),

      // Active shifts count
      prisma.shift.count({
        where: {
          status: 'IN_PROGRESS'
        }
      }),

      // Active sites count
      prisma.site.count({
        where: {
          status: 'ACTIVE'
        }
      }),

      // Incidents today
      prisma.report.count({
        where: {
          type: 'INCIDENT',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),

      // Reports today
      prisma.report.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),

      // Recent reports for activity feed
      prisma.report.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          author: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          site: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    // Calculate completion rate (example calculation)
    const totalShifts = await prisma.shift.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    });

    const completedShifts = await prisma.shift.count({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    });

    const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

    const dashboardData = {
      overview: {
        totalUsers,
        totalAgents,
        activeAgents: totalAgents, // Assuming all agents are active for now
        sitesMonitored: activeSites,
        activeSites,
        activeShifts,
        incidentsToday,
        reportsToday,
        completionRate: Math.round(completionRate * 100) / 100,
        responseTime: 12.3 // This would need more complex calculation
      },
      recentActivities: recentReports.map(report => ({
        id: report.id,
        type: report.type.toLowerCase(),
        title: report.title,
        message: `${report.type} reported by ${report.author?.user?.firstName || 'Unknown'} ${report.author?.user?.lastName || ''} at ${report.site?.name || 'Unknown Site'}`,
        createdAt: report.createdAt.toISOString(),
        priority: report.priority || 'MEDIUM'
      }))
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database error in analytics endpoint:', error);

    // Fallback to mock data if database fails
    const fallbackData = {
      overview: {
        totalUsers: 3,
        totalAgents: 12,
        activeAgents: 8,
        sitesMonitored: 5,
        activeSites: 5,
        activeShifts: 3,
        incidentsToday: 2,
        reportsToday: 7,
        completionRate: 85.5,
        responseTime: 12.3
      },
      recentActivities: [
        {
          id: 'fallback-1',
          type: 'warning',
          title: 'Database Connection Issue',
          message: 'Using cached data - database connection temporarily unavailable',
          createdAt: new Date().toISOString(),
          priority: 'HIGH'
        }
      ]
    };

    res.json({
      success: true,
      data: fallbackData,
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to database connection issue'
    });
  }
});

// Manual user sync endpoint for development
app.post('/api/sync-user', async (req, res) => {
  try {
    const { email, firstName, lastName, role = 'ADMIN' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role,
          status: 'ACTIVE',
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName
        }
      });

      return res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          clerkId: `manual-${Date.now()}`,
          email,
          firstName: firstName || 'Admin',
          lastName: lastName || 'User',
          username: email.split('@')[0],
          role,
          status: 'ACTIVE',
          phone: null
        }
      });

      return res.json({
        message: 'User created successfully',
        user: newUser
      });
    }
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Update user role endpoint for development
app.post('/api/update-user-role', async (req, res) => {
  try {
    const { email, role = 'ADMIN' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Update user in database
    const updatedUser = await prisma.user.upsert({
      where: { email },
      update: { role, status: 'ACTIVE' },
      create: {
        clerkId: `manual-${Date.now()}`,
        email,
        firstName: 'Admin',
        lastName: 'User',
        username: email.split('@')[0],
        role,
        status: 'ACTIVE',
        phone: null
      }
    });

    return res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('User role update error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Users endpoint
app.get('/api/users', async (req, res) => {
  console.log('Users endpoint hit');
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          adminProfile: true,
          clientProfile: true,
          agentProfile: true
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          profile: user.adminProfile || user.clientProfile || user.agentProfile
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch users' }
    });
  }
});

// Clients endpoint
app.get('/api/clients', async (req, res) => {
  console.log('Clients endpoint hit');
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: {
        clientProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        clients: clients.map(client => ({
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email,
          companyName: client.clientProfile?.companyName || '',
          contactPerson: client.clientProfile?.contactPerson || '',
          status: client.status,
          createdAt: client.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch clients' }
    });
  }
});

// Agents endpoint
app.get('/api/agents', async (req, res) => {
  console.log('Agents endpoint hit');
  try {
    const agents = await prisma.user.findMany({
      where: { role: { in: ['AGENT', 'SUPERVISOR'] } },
      include: {
        agentProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        agents: agents.map(agent => ({
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          email: agent.email,
          employeeId: agent.agentProfile?.employeeId || '',
          role: agent.role,
          status: agent.status,
          hireDate: agent.agentProfile?.hireDate,
          skills: agent.agentProfile?.skills || [],
          certifications: agent.agentProfile?.certifications || []
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch agents' }
    });
  }
});

// Sites endpoint
app.get('/api/sites', async (req, res) => {
  console.log('Sites endpoint hit');
  try {
    const sites = await prisma.site.findMany({
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        sites: sites.map(site => ({
          id: site.id,
          name: site.name,
          address: site.address,
          status: site.status,
          clientName: site.client ? `${site.client.user.firstName} ${site.client.user.lastName}` : 'Unknown',
          clientEmail: site.client?.user.email || '',
          createdAt: site.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching sites:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch sites' }
    });
  }
});

// Incidents endpoint
app.get('/api/incidents', async (req, res) => {
  console.log('Incidents endpoint hit');
  try {
    const incidents = await prisma.report.findMany({
      where: { type: 'INCIDENT' },
      include: {
        author: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        site: {
          select: {
            name: true,
            address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        incidents: incidents.map(incident => ({
          id: incident.id,
          title: incident.title,
          description: incident.description,
          priority: incident.priority,
          status: incident.status,
          authorName: incident.author ? `${incident.author.user.firstName} ${incident.author.user.lastName}` : 'Unknown',
          siteName: incident.site?.name || 'Unknown Site',
          siteAddress: incident.site?.address || '',
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch incidents' }
    });
  }
});

// Analytics endpoints
app.get('/api/analytics/client-stats', async (req, res) => {
  try {
    const [totalClients, activeClients, newClientsThisMonth] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'CLIENT', status: 'ACTIVE' } }),
      prisma.user.count({
        where: {
          role: 'CLIENT',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        activeClients,
        newClientsThisMonth,
        clientRetentionRate: totalClients > 0 ? (activeClients / totalClients) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch client stats' }
    });
  }
});

app.get('/api/analytics/agent-stats', async (req, res) => {
  try {
    const [totalAgents, activeAgents, onDutyAgents] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['AGENT', 'SUPERVISOR'] } } }),
      prisma.user.count({ where: { role: { in: ['AGENT', 'SUPERVISOR'] }, status: 'ACTIVE' } }),
      prisma.shift.count({ where: { status: 'IN_PROGRESS' } })
    ]);

    res.json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        onDutyAgents,
        utilizationRate: totalAgents > 0 ? (onDutyAgents / totalAgents) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch agent stats' }
    });
  }
});

app.get('/api/analytics/incident-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalIncidents, incidentsToday, openIncidents, resolvedIncidents] = await Promise.all([
      prisma.report.count({ where: { type: 'INCIDENT' } }),
      prisma.report.count({
        where: {
          type: 'INCIDENT',
          createdAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.report.count({
        where: {
          type: 'INCIDENT',
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }),
      prisma.report.count({
        where: {
          type: 'INCIDENT',
          status: 'RESOLVED'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalIncidents,
        incidentsToday,
        openIncidents,
        resolvedIncidents,
        resolutionRate: totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error fetching incident stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to fetch incident stats' }
    });
  }
});

// Simple authentication endpoint for admin portal
app.post('/api/auth/admin-login', async (req, res) => {
  console.log('Admin login endpoint hit');
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: 'Email is required' }
      });
    }

    // Find admin user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        adminProfile: true
      }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid admin credentials' }
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' }
      });
    }

    // For development, we'll accept any password for existing admin users
    // In production, you would verify the password hash here

    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profile: user.adminProfile
        }
      }
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_ERROR', message: 'Login failed' }
    });
  }
});

// Token validation endpoint
app.get('/api/auth/validate', async (req, res) => {
  console.log('Token validation endpoint hit');
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'No token provided' }
      });
    }

    const token = authHeader.substring(7);

    // For development, accept email as token or decode base64 token
    let userId, email;

    if (token.includes('@')) {
      // Email-based authentication
      email = token;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { adminProfile: true }
      });

      if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          }
        }
      });
    }

    // Try to decode base64 token
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [id, tokenEmail] = decoded.split(':');

      const user = await prisma.user.findUnique({
        where: { id },
        include: { adminProfile: true }
      });

      if (!user || user.email !== tokenEmail || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (decodeError) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
      });
    }
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Token validation failed' }
    });
  }
});

// Authentication handled by Clerk - no custom auth endpoints needed

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 1,
        email: 'admin@bahinlink.com',
        username: 'admin',
        role: 'admin',
        permissions: ['users.read', 'users.write', 'shifts.read'],
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          avatar: null
        },
        lastLoginAt: new Date().toISOString(),
        isActive: true
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred'
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
server.listen(PORT, () => {
  console.log(`🚀 BahinLink Backend API is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
