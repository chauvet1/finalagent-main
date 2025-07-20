"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileUpload = exports.validateRateLimit = exports.sanitizeInput = exports.validatePagination = exports.validateIdParam = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validateRequest = exports.fileSchemas = exports.communicationSchemas = exports.reportSchemas = exports.incidentSchemas = exports.shiftSchemas = exports.locationSchemas = exports.userSchemas = exports.authSchemas = exports.commonSchemas = exports.ValidationError = void 0;
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("../utils/logger");
class ValidationError extends Error {
    constructor(message, details, statusCode = 400) {
        super(message);
        this.details = details;
        this.statusCode = statusCode;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
exports.commonSchemas = {
    id: joi_1.default.string().uuid().required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
    phone: joi_1.default.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
    coordinates: joi_1.default.object({
        latitude: joi_1.default.number().min(-90).max(90).required(),
        longitude: joi_1.default.number().min(-180).max(180).required()
    }),
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso().required(),
        endDate: joi_1.default.date().iso().min(joi_1.default.ref('startDate')).required()
    }),
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        sortBy: joi_1.default.string().optional(),
        sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc')
    })
};
exports.authSchemas = {
    login: joi_1.default.object({
        email: exports.commonSchemas.email,
        password: joi_1.default.string().required()
    }),
    register: joi_1.default.object({
        email: exports.commonSchemas.email,
        password: exports.commonSchemas.password,
        firstName: joi_1.default.string().min(2).max(50).required(),
        lastName: joi_1.default.string().min(2).max(50).required(),
        role: joi_1.default.string().valid('CLIENT', 'ADMIN', 'SUPERVISOR', 'AGENT').default('CLIENT')
    }),
    resetPassword: joi_1.default.object({
        email: exports.commonSchemas.email
    }),
    changePassword: joi_1.default.object({
        currentPassword: joi_1.default.string().required(),
        newPassword: exports.commonSchemas.password
    })
};
exports.userSchemas = {
    createUser: joi_1.default.object({
        email: exports.commonSchemas.email,
        firstName: joi_1.default.string().min(2).max(50).required(),
        lastName: joi_1.default.string().min(2).max(50).required(),
        role: joi_1.default.string().valid('CLIENT', 'ADMIN', 'SUPERVISOR', 'AGENT').required(),
        phone: exports.commonSchemas.phone.optional(),
        status: joi_1.default.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').default('ACTIVE')
    }),
    updateUser: joi_1.default.object({
        firstName: joi_1.default.string().min(2).max(50).optional(),
        lastName: joi_1.default.string().min(2).max(50).optional(),
        phone: exports.commonSchemas.phone.optional(),
        status: joi_1.default.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').optional()
    }),
    updateProfile: joi_1.default.object({
        firstName: joi_1.default.string().min(2).max(50).optional(),
        lastName: joi_1.default.string().min(2).max(50).optional(),
        phone: exports.commonSchemas.phone.optional()
    })
};
exports.locationSchemas = {
    locationUpdate: joi_1.default.object({
        latitude: joi_1.default.number().min(-90).max(90).required(),
        longitude: joi_1.default.number().min(-180).max(180).required(),
        accuracy: joi_1.default.number().min(0).optional(),
        timestamp: joi_1.default.date().iso().optional(),
        batteryLevel: joi_1.default.number().min(0).max(100).optional(),
        speed: joi_1.default.number().min(0).optional(),
        heading: joi_1.default.number().min(0).max(360).optional()
    }),
    geofenceValidation: joi_1.default.object({
        agentId: exports.commonSchemas.id,
        siteId: exports.commonSchemas.id,
        latitude: joi_1.default.number().min(-90).max(90).required(),
        longitude: joi_1.default.number().min(-180).max(180).required(),
        action: joi_1.default.string().valid('CHECKIN', 'CHECKOUT', 'PATROL').required()
    })
};
exports.shiftSchemas = {
    createShift: joi_1.default.object({
        agentId: exports.commonSchemas.id,
        siteId: exports.commonSchemas.id,
        startTime: joi_1.default.date().iso().required(),
        endTime: joi_1.default.date().iso().min(joi_1.default.ref('startTime')).required(),
        type: joi_1.default.string().max(100).optional(),
        notes: joi_1.default.string().max(500).optional()
    }),
    updateShift: joi_1.default.object({
        startTime: joi_1.default.date().iso().optional(),
        endTime: joi_1.default.date().iso().optional(),
        status: joi_1.default.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
        type: joi_1.default.string().max(100).optional(),
        notes: joi_1.default.string().max(500).optional()
    }),
    shiftQuery: joi_1.default.object({
        agentId: exports.commonSchemas.id.optional(),
        siteId: exports.commonSchemas.id.optional(),
        status: joi_1.default.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
        startDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional()
    }).concat(exports.commonSchemas.pagination)
};
exports.incidentSchemas = {
    createIncident: joi_1.default.object({
        title: joi_1.default.string().min(5).max(200).required(),
        description: joi_1.default.string().min(10).max(2000).required(),
        type: joi_1.default.string().valid('SECURITY_BREACH', 'THEFT', 'VANDALISM', 'MEDICAL_EMERGENCY', 'FIRE', 'TECHNICAL_ISSUE', 'SUSPICIOUS_ACTIVITY', 'ACCESS_VIOLATION', 'OTHER').required(),
        severity: joi_1.default.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('LOW'),
        siteId: exports.commonSchemas.id,
        location: joi_1.default.string().max(200).optional(),
        occurredAt: joi_1.default.date().iso().required(),
        evidence: joi_1.default.object().optional()
    }),
    updateIncident: joi_1.default.object({
        title: joi_1.default.string().min(5).max(200).optional(),
        description: joi_1.default.string().min(10).max(2000).optional(),
        severity: joi_1.default.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
        status: joi_1.default.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED').optional(),
        resolvedAt: joi_1.default.date().iso().optional(),
        evidence: joi_1.default.object().optional()
    }),
    incidentQuery: joi_1.default.object({
        status: joi_1.default.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED').optional(),
        severity: joi_1.default.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
        type: joi_1.default.string().optional(),
        siteId: exports.commonSchemas.id.optional(),
        startDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional()
    }).concat(exports.commonSchemas.pagination)
};
exports.reportSchemas = {
    createReport: joi_1.default.object({
        title: joi_1.default.string().min(5).max(200).required(),
        content: joi_1.default.string().min(10).max(5000).required(),
        type: joi_1.default.string().valid('DAILY', 'INCIDENT', 'SHIFT', 'MAINTENANCE', 'TRAINING', 'CUSTOM').required(),
        siteId: exports.commonSchemas.id.optional(),
        shiftId: exports.commonSchemas.id.optional(),
        incidentId: exports.commonSchemas.id.optional(),
        priority: joi_1.default.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL').default('NORMAL'),
        reportDate: joi_1.default.date().iso().required(),
        attachments: joi_1.default.object().optional()
    }),
    updateReport: joi_1.default.object({
        title: joi_1.default.string().min(5).max(200).optional(),
        content: joi_1.default.string().min(10).max(5000).optional(),
        status: joi_1.default.string().valid('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED').optional(),
        priority: joi_1.default.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL').optional(),
        attachments: joi_1.default.object().optional()
    })
};
exports.communicationSchemas = {
    sendMessage: joi_1.default.object({
        type: joi_1.default.string().valid('MESSAGE', 'ANNOUNCEMENT', 'ALERT', 'EMERGENCY', 'INSTRUCTION').default('MESSAGE'),
        subject: joi_1.default.string().max(200).optional(),
        content: joi_1.default.string().min(1).max(2000).required(),
        priority: joi_1.default.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY').default('NORMAL'),
        recipients: joi_1.default.array().items(exports.commonSchemas.id).min(1).required(),
        groupId: exports.commonSchemas.id.optional(),
        isUrgent: joi_1.default.boolean().default(false),
        expiresAt: joi_1.default.date().iso().optional(),
        attachments: joi_1.default.object().optional()
    }),
    createGroup: joi_1.default.object({
        name: joi_1.default.string().min(3).max(100).required(),
        description: joi_1.default.string().max(500).optional(),
        type: joi_1.default.string().valid('GENERAL', 'EMERGENCY', 'SITE_SPECIFIC', 'DEPARTMENT', 'PROJECT').default('GENERAL'),
        isPrivate: joi_1.default.boolean().default(false),
        members: joi_1.default.array().items(exports.commonSchemas.id).min(1).required()
    })
};
exports.fileSchemas = {
    uploadFile: joi_1.default.object({
        type: joi_1.default.string().valid('image', 'video', 'document', 'audio').required(),
        category: joi_1.default.string().valid('incident', 'report', 'profile', 'communication').required(),
        relatedEntityId: exports.commonSchemas.id.optional(),
        description: joi_1.default.string().max(200).optional()
    })
};
const validateRequest = (schema, target = 'body') => {
    return (req, res, next) => {
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
                logger_1.logger.warn('Request validation failed', {
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
            req[target] = value;
            next();
        }
        catch (error) {
            logger_1.logger.error('Validation middleware error', { error, path: req.path });
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
exports.validateRequest = validateRequest;
const validateBody = (schema) => (0, exports.validateRequest)(schema, 'body');
exports.validateBody = validateBody;
const validateQuery = (schema) => (0, exports.validateRequest)(schema, 'query');
exports.validateQuery = validateQuery;
const validateParams = (schema) => (0, exports.validateRequest)(schema, 'params');
exports.validateParams = validateParams;
exports.validateIdParam = (0, exports.validateParams)(joi_1.default.object({ id: exports.commonSchemas.id }));
exports.validatePagination = (0, exports.validateQuery)(exports.commonSchemas.pagination);
const sanitizeInput = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }
            else {
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
exports.sanitizeInput = sanitizeInput;
const validateRateLimit = (req, res, next) => {
    res.set({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
    });
    next();
};
exports.validateRateLimit = validateRateLimit;
const validateFileUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return next();
    }
    const validateFile = (file) => {
        if (file.size > 10 * 1024 * 1024) {
            throw new ValidationError('File size exceeds 10MB limit', []);
        }
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/mpeg', 'audio/wav', 'audio/ogg'
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new ValidationError('Invalid file type', []);
        }
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
            }
            else {
                Object.values(req.files).flat().forEach(validateFile);
            }
        }
        next();
    }
    catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_VALIDATION_ERROR',
                    message: error.message
                }
            });
        }
        logger_1.logger.error('File validation error', { error });
        return res.status(500).json({
            success: false,
            error: {
                code: 'FILE_VALIDATION_ERROR',
                message: 'File validation failed'
            }
        });
    }
};
exports.validateFileUpload = validateFileUpload;
exports.default = {
    validateRequest: exports.validateRequest,
    validateBody: exports.validateBody,
    validateQuery: exports.validateQuery,
    validateParams: exports.validateParams,
    validateIdParam: exports.validateIdParam,
    validatePagination: exports.validatePagination,
    sanitizeInput: exports.sanitizeInput,
    validateRateLimit: exports.validateRateLimit,
    validateFileUpload: exports.validateFileUpload,
    commonSchemas: exports.commonSchemas,
    authSchemas: exports.authSchemas,
    userSchemas: exports.userSchemas,
    locationSchemas: exports.locationSchemas,
    shiftSchemas: exports.shiftSchemas,
    incidentSchemas: exports.incidentSchemas,
    reportSchemas: exports.reportSchemas,
    communicationSchemas: exports.communicationSchemas,
    fileSchemas: exports.fileSchemas
};
//# sourceMappingURL=validation.js.map