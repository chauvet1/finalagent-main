import express from 'express';
import { PrismaClient } from '@prisma/client';
import { query, validationResult } from 'express-validator';
import { requireAuth, requireClient } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to handle validation errors
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  next();
};

// GET /api/client/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', requireAuth, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    // For development, we'll use the user's email to find their client record
    // In production, this would be properly linked through user.clientId
    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        // Create a default client for development
        const defaultClient = await prisma.client.create({
          data: {
            name: 'Demo Client',
            contactEmail: user.email,
            contactPhone: '555-0123',
            address: {
              street: '123 Demo Street',
              city: 'Demo City',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            }
          }
        });
        clientId = defaultClient.id;
      } else {
        clientId = client.id;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get client's sites
    const sites = await prisma.site.findMany({
      where: {
        clientId: clientId
      },
      select: {
        id: true,
        name: true,
        status: true
      }
    });

    const siteIds = sites.map(site => site.id);

    // Get active shifts for client's sites
    const activeShifts = await prisma.shift.count({
      where: {
        siteId: { in: siteIds },
        status: 'IN_PROGRESS'
      }
    });

    // Get today's incidents
    const incidentsToday = await prisma.incident.count({
      where: {
        siteId: { in: siteIds },
        occurredAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get pending service requests
    const pendingRequests = await prisma.clientRequest.count({
      where: {
        clientId: clientId,
        status: {
          in: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS']
        }
      }
    });

    // Get total agents assigned to client sites
    const totalAgents = await prisma.agentProfile.count({
      where: {
        currentSiteId: { in: siteIds }
      }
    });

    res.json({
      success: true,
      data: {
        activeSites: sites.filter(site => site.status === 'ACTIVE').length,
        totalSites: sites.length,
        activeShifts,
        incidentsToday,
        pendingRequests,
        totalAgents
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard statistics'
      }
    });
  }
});

// GET /api/client/dashboard/activity - Get recent activity
router.get('/dashboard/activity', requireAuth, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }

    // Get client's sites
    const sites = await prisma.site.findMany({
      where: {
        clientId: clientId
      },
      select: { id: true }
    });

    const siteIds = sites.map(site => site.id);

    // Get recent reports
    const recentReports = await prisma.report.findMany({
      where: {
        siteId: { in: siteIds }
      },
      include: {
        author: {
          select: {
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get recent incidents
    const recentIncidents = await prisma.incident.findMany({
      where: {
        siteId: { in: siteIds }
      },
      include: {
        reportedBy: {
          select: {
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
      },
      orderBy: {
        occurredAt: 'desc'
      },
      take: 10
    });

    // Get recent attendance records
    const recentAttendance = await prisma.attendance.findMany({
      where: {
        siteId: { in: siteIds }
      },
      include: {
        agent: {
          select: {
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
      },
      orderBy: {
        clockInTime: 'desc'
      },
      take: 10
    });

    res.json({
      success: true,
      data: {
        recentReports: recentReports.map(report => ({
          id: report.id,
          type: report.type,
          title: report.title,
          status: report.status,
          agentName: `${report.author.user.firstName} ${report.author.user.lastName}`,
          siteName: report.site?.name || 'Unknown Site',
          createdAt: report.createdAt
        })),
        recentIncidents: recentIncidents.map(incident => ({
          id: incident.id,
          type: incident.type,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          reportedBy: incident.reportedBy ? `${incident.reportedBy.user.firstName} ${incident.reportedBy.user.lastName}` : 'System',
          siteName: incident.site.name,
          occurredAt: incident.occurredAt
        })),
        recentAttendance: recentAttendance.map(attendance => ({
          id: attendance.id,
          agentName: `${attendance.agent.user.firstName} ${attendance.agent.user.lastName}`,
          siteName: attendance.site?.name || 'Unknown Site',
          clockInTime: attendance.clockInTime,
          clockOutTime: attendance.clockOutTime,
          status: attendance.status
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard activity'
      }
    });
  }
});

// GET /api/client/sites/status - Get sites status
router.get('/sites/status', requireAuth, async (req, res) => {
  try {
    // Get client ID from authenticated user
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    let clientId = user.clientId;
    
    if (!clientId) {
      // Try to find client by email for development
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { contactEmail: user.email },
            { users: { some: { email: user.email } } }
          ]
        }
      });
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found for user'
          }
        });
      }
      clientId = client.id;
    }

    const sites = await prisma.site.findMany({
      where: {
        clientId: clientId
      },
      include: {
        shifts: {
          where: {
            status: 'IN_PROGRESS'
          },
          include: {
            agent: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            incidents: {
              where: {
                status: 'OPEN'
              }
            },
            reports: {
              where: {
                createdAt: {
                  gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        sites: sites.map(site => ({
          id: site.id,
          name: site.name,
          address: site.address,
          status: site.status,
          securityLevel: site.securityLevel,
          activeShifts: site.shifts.length,
          activeAgents: site.shifts.map(shift => ({
            id: (shift.agent.user.firstName || '') + (shift.agent.user.lastName || ''),
            name: `${shift.agent.user.firstName || ''} ${shift.agent.user.lastName || ''}`.trim() || 'Unknown Agent',
            shiftStart: shift.startTime,
            shiftEnd: shift.endTime
          })),
          openIncidents: site._count.incidents,
          recentReports: site._count.reports,
          coordinates: site.coordinates
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching sites status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch sites status'
      }
    });
  }
});

export default router;
