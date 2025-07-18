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

// GET /api/clients - Get all clients
router.get('/', [
  requireAuth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('serviceLevel').optional().isString(),
  query('industry').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const serviceLevel = req.query.serviceLevel as string;
    const industry = req.query.industry as string;
    const offset = (page - 1) * limit;

    console.log('Clients endpoint hit - fetching real client data');
    console.log('Query parameters:', { page, limit, search, serviceLevel, industry });

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (serviceLevel && serviceLevel !== 'all') {
      where.serviceLevel = serviceLevel;
    }

    if (industry && industry !== 'all') {
      where.industry = industry;
    }

    // Get clients with pagination
    const [clients, total] = await Promise.all([
      prisma.clientProfile.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clientProfile.count({ where })
    ]);

    console.log('Database query successful. Found clients:', clients.length);

    res.json({
      success: true,
      data: {
        clients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch clients',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/clients/:id - Get client by ID
router.get('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.clientProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error: any) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch client'
      }
    });
  }
});

export default router;
