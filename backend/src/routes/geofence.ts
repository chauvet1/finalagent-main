import express from 'express';
import { query, body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

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

// GET /api/geofence-zones - Get all geofence zones
router.get('/geofence-zones', [
  requireAuth,
  requireAdmin,
  query('siteId').optional().isUUID(),
  query('active').optional().isBoolean(),
], handleValidationErrors, async (req, res) => {
  try {
    const siteId = req.query.siteId as string;
    const active = req.query.active === 'true';

    const where: any = {};
    if (siteId) {
      where.siteId = siteId;
    }
    if (active !== undefined) {
      where.status = active ? 'ACTIVE' : 'INACTIVE';
    }

    const zones = await prisma.geofence.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    res.json({
      success: true,
      data: zones,
      total: zones.length
    });
  } catch (error) {
    console.error('Error fetching geofence zones:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch geofence zones'
      }
    });
  }
});

// GET /api/geofence-violations - Get geofence violations
router.get('/geofence-violations', [
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('siteId').optional().isUUID(),
  query('agentId').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const siteId = req.query.siteId as string;
    const agentId = req.query.agentId as string;

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (siteId) {
      where.siteId = siteId;
    }
    if (agentId) {
      where.agentId = agentId;
    }

    const violations = await prisma.geofenceViolation.findMany({
      where,
      include: {
        agent: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        geofence: {
          include: {
            site: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { occurredAt: 'desc' }
    }).catch(() => []);

    res.json({
      success: true,
      data: violations,
      total: violations.length
    });
  } catch (error) {
    console.error('Error fetching geofence violations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch geofence violations'
      }
    });
  }
});

// GET /api/geofence-validations - Get geofence validations
router.get('/geofence-validations', [
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('siteId').optional().isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const siteId = req.query.siteId as string;

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (siteId) {
      where.siteId = siteId;
    }

    const validations = await prisma.geofenceValidation.findMany({
      where,
      include: {
        agent: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        geofence: {
          include: {
            site: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { validatedAt: 'desc' }
    }).catch(() => []);

    res.json({
      success: true,
      data: validations,
      total: validations.length
    });
  } catch (error) {
    console.error('Error fetching geofence validations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch geofence validations'
      }
    });
  }
});

export default router;
