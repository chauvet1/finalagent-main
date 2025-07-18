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

// GET /api/payments - Get all payments
router.get('/', [
  requireAuth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('clientId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const clientId = req.query.clientId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const offset = (page - 1) * limit;

    console.log('Payments endpoint hit - fetching real payment data');
    console.log('Query parameters:', { page, limit, status, clientId, startDate, endDate });

    // Build where clause for filtering
    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (clientId) whereClause.clientId = clientId;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    // Get payments from database
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        include: {
          client: {
            select: {
              name: true,
              contactEmail: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              amount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payments',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/payments/:id - Get payment by ID
router.get('/:id', [
  requireAuth,
  requireAdmin,
  param('id').isUUID(),
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    // Since we don't have a Payment model yet, return a 404
    // In a real implementation, this would query the database
    
    res.status(404).json({
      success: false,
      error: {
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found'
      }
    });
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payment'
      }
    });
  }
});

export default router;
