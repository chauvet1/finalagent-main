import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

// Validation error class
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: any[],
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Common validation schemas
export const commonSchemas = {
  id: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
  }),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Authentication validation schemas
export const authSchemas = {
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required()
  }),
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('CLIENT', 'ADMIN', 'SUPERVISOR', 'AGENT').default('CLIENT')
  }),
  resetPassword: Joi.object({
    email: commonSchemas.email
  }),
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password
  })
};

// User management validation schemas
export const userSchemas = {
  createUser: Joi.object({
    email: commonSchemas.email,
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('CLIENT', 'ADMIN', 'SUPERVISOR', 'AGENT').required(),
    phone: commonSchemas.phone.optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').default('ACTIVE')
  }),
  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: commonSchemas.phone.optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').optional()
  }),
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: commonSchemas.phone.optional()
  })
};

// Location and tracking validation schemas
export const locationSchemas = {
  locationUpdate: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().min(0).optional(),
    timestamp: Joi.date().iso().optional(),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    speed: Joi.number().min(0).optional(),
    heading: Joi.number().min(0).max(360).optional()
  }),
  geofenceValidation: Joi.object({
    agentId: commonSchemas.id,
    siteId: commonSchemas.id,
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    action: Joi.string().valid('CHECKIN', 'CHECKOUT', 'PATROL').required()
  })
};

// Shift management validation schemas
export const shiftSchemas = {
  createShift: Joi.object({
    agentId: commonSchemas.id,
    siteId: commonSchemas.id,
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().min(Joi.ref('startTime')).required(),
    type: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional()
  }),
  updateShift: Joi.object({
    startTime: Joi.date().iso().optional(),
    endTime: Joi.date().iso().optional(),
    status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
    type: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional()
  }),
  shiftQuery: Joi.object({
    agentId: commonSchemas.id.optional(),
    siteId: commonSchemas.id.optional(),
    status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  }).concat(commonSchemas.pagination)
};

// Incident management validation schemas
export const incidentSchemas = {
  createIncident: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    type: Joi.string().valid(
      'SECURITY_BREACH', 'THEFT', 'VANDALISM', 'MEDICAL_EMERGENCY', 
      'FIRE', 'TECHNICAL_ISSUE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_VIOLATION', 'OTHER'
    ).required(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('LOW'),
    siteId: commonSchemas.id,
    location: Joi.string().max(200).optional(),
    occurredAt: Joi.date().iso().required(),
    evidence: Joi.object().optional()
  }),
  updateIncident: Joi.object({
    title: Joi.string().min(5).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED').optional(),
    resolvedAt: Joi.date().iso().optional(),
    evidence: Joi.object().optional()
  }),
  incidentQuery: Joi.object({
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED').optional(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
    type: Joi.string().optional(),
    siteId: commonSchemas.id.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  }).concat(commonSchemas.pagination)
};

// Report validation schemas
export const reportSchemas = {
  createReport: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    content: Joi.string().min(10).max(5000).required(),
    type: Joi.string().valid('DAILY', 'INCIDENT', 'SHIFT', 'MAINTENANCE', 'TRAINING', 'CUSTOM').required(),
    siteId: commonSchemas.id.optional(),
    shiftId: commonSchemas.id.optional(),
    incidentId: commonSchemas.id.optional(),
    priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL').default('NORMAL'),
    reportDate: Joi.date().iso().required(),
    attachments: Joi.object().optional()
  }),
  updateReport: Joi.object({
    title: Joi.string().min(5).max(200).optional(),
    content: Joi.string().min(10).max(5000).optional(),
    status: Joi.string().valid('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED').optional(),
    priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL').optional(),
    attachments: Joi.object().optional()
  })
};

// Communication validation schemas
export const communicationSchemas = {
  sendMessage: Joi.object({
    type: Joi.string().valid('MESSAGE', 'ANNOUNCEMENT', 'ALERT', 'EMERGENCY', 'INSTRUCTION').default('MESSAGE'),
    subject: Joi.string().max(200).optional(),
    content: Joi.string().min(1).max(2000).required(),
    priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY').default('NORMAL'),
    recipients: Joi.array().items(commonSchemas.id).min(1).required(),
    groupId: commonSchemas.id.optional(),
    isUrgent: Joi.boolean().default(false),
    expiresAt: Joi.date().iso().optional(),
    attachments: Joi.object().optional()
  }),
  createGroup: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().valid('GENERAL', 'EMERGENCY', 'SITE_SPECIFIC', 'DEPARTMENT', 'PROJECT').default('GENERAL'),
    isPrivate: Joi.boolean().default(false),
    members: Joi.array().items(commonSchemas.id).min(1).required()
  })
};

// File upload validation schemas
export const fileSchemas = {
  uploadFile: Joi.object({
    type: Joi.string().valid('image', 'video', 'document', 'audio').required(),
    category: Joi.string().valid('incident', 'report', 'profile', 'communication').required(),
    relatedEntityId: commonSchemas.id.optional(),
    description: Joi.string().max(200).optional()
  })
};

// Generic validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target];
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: detail.type,
          value: detail.context?.value
        }));

        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors,
          data: dataToValidate
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validationErrors
          }
        });
      }

      // Replace the original data with validated and sanitized data
      req[target] = value;
      next();
    } catch (error) {
      logger.error('Validation middleware error', { error, path: req.path });
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'Internal validation error'
        }
      });
    }
  };
};

// Specific validation middleware functions
export const validateBody = (schema: Joi.ObjectSchema) => validateRequest(schema, 'body');
export const validateQuery = (schema: Joi.ObjectSchema) => validateRequest(schema, 'query');
export const validateParams = (schema: Joi.ObjectSchema) => validateRequest(schema, 'params');

// Combined validation for common patterns
export const validateIdParam = validateParams(Joi.object({ id: commonSchemas.id }));
export const validatePagination = validateQuery(commonSchemas.pagination);

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Add rate limiting headers
  res.set({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
  });
  
  next();
};

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return next();
  }

  const validateFile = (file: any) => {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError('File size exceeds 10MB limit', []);
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError('Invalid file type', []);
    }

    // Check filename
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
      throw new ValidationError('Invalid filename characters', []);
    }
  };

  try {
    if (req.file) {
      validateFile(req.file);
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(validateFile);
      } else {
        Object.values(req.files).flat().forEach(validateFile);
      }
    }

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_VALIDATION_ERROR',
          message: error.message
        }
      });
    }

    logger.error('File validation error', { error });
    return res.status(500).json({
      success: false,
      error: {
        code: 'FILE_VALIDATION_ERROR',
        message: 'File validation failed'
      }
    });
  }
};

export default {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  validateIdParam,
  validatePagination,
  sanitizeInput,
  validateRateLimit,
  validateFileUpload,
  commonSchemas,
  authSchemas,
  userSchemas,
  locationSchemas,
  shiftSchemas,
  incidentSchemas,
  reportSchemas,
  communicationSchemas,
  fileSchemas
};