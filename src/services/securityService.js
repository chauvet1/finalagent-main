const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Comprehensive Security Service
 * Handles authentication, authorization, input validation, and security monitoring
 */
class SecurityService extends EventEmitter {
  constructor() {
    super();
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.generateSecureSecret();
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.failedAttempts = new Map();
    this.suspiciousActivities = [];
    this.securityEvents = [];
  }

  /**
   * Generate secure JWT tokens
   */
  generateTokens(user) {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: this.getUserPermissions(user.role),
        sessionId: crypto.randomUUID()
      };

      const accessToken = jwt.sign(payload, this.jwtSecret, {
        expiresIn: '15m',
        issuer: 'security-system',
        audience: 'security-app'
      });

      const refreshToken = jwt.sign(
        { userId: user.id, sessionId: payload.sessionId },
        this.jwtRefreshSecret,
        { expiresIn: '7d' }
      );

      this.logSecurityEvent('TOKEN_GENERATED', {
        userId: user.id,
        sessionId: payload.sessionId,
        timestamp: new Date()
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
        tokenType: 'Bearer'
      };
    } catch (error) {
      this.logSecurityEvent('TOKEN_GENERATION_FAILED', {
        error: error.message,
        timestamp: new Date()
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token, isRefreshToken = false) {
    try {
      const secret = isRefreshToken ? this.jwtRefreshSecret : this.jwtSecret;
      const decoded = jwt.verify(token, secret);
      
      this.logSecurityEvent('TOKEN_VERIFIED', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        timestamp: new Date()
      });

      return decoded;
    } catch (error) {
      this.logSecurityEvent('TOKEN_VERIFICATION_FAILED', {
        error: error.message,
        token: token.substring(0, 20) + '...',
        timestamp: new Date()
      });
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken, true);
      
      // In a real implementation, you'd fetch the user from database
      // For now, we'll create a minimal user object
      const user = {
        id: decoded.userId,
        email: 'user@example.com', // This should come from database
        role: 'USER' // This should come from database
      };

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Role-based access control
   */
  getUserPermissions(role) {
    const permissions = {
      SUPER_ADMIN: [
        'users:read', 'users:write', 'users:delete',
        'agents:read', 'agents:write', 'agents:delete',
        'clients:read', 'clients:write', 'clients:delete',
        'sites:read', 'sites:write', 'sites:delete',
        'reports:read', 'reports:write', 'reports:delete',
        'system:admin', 'security:admin'
      ],
      ADMIN: [
        'users:read', 'users:write',
        'agents:read', 'agents:write',
        'clients:read', 'clients:write',
        'sites:read', 'sites:write',
        'reports:read', 'reports:write'
      ],
      MANAGER: [
        'agents:read', 'agents:write',
        'sites:read', 'sites:write',
        'reports:read', 'reports:write'
      ],
      SUPERVISOR: [
        'agents:read',
        'sites:read',
        'reports:read', 'reports:write'
      ],
      AGENT: [
        'sites:read',
        'reports:read'
      ],
      CLIENT: [
        'sites:read',
        'reports:read'
      ],
      USER: [
        'profile:read', 'profile:write'
      ]
    };

    return permissions[role] || permissions.USER;
  }

  /**
   * Check if user has required permission
   */
  hasPermission(userPermissions, requiredPermission) {
    return userPermissions.includes(requiredPermission) || 
           userPermissions.includes('system:admin');
  }

  /**
   * Input validation and sanitization
   */
  validateInput(data, rules) {
    const errors = [];
    const sanitized = {};

    Object.keys(rules).forEach(field => {
      const value = data[field];
      const rule = rules[field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        return;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (rule.type === 'email' && !validator.isEmail(value)) {
          errors.push(`${field} must be a valid email`);
        }
        if (rule.type === 'url' && !validator.isURL(value)) {
          errors.push(`${field} must be a valid URL`);
        }
        if (rule.type === 'phone' && !validator.isMobilePhone(value)) {
          errors.push(`${field} must be a valid phone number`);
        }
        if (rule.type === 'uuid' && !validator.isUUID(value)) {
          errors.push(`${field} must be a valid UUID`);
        }

        // Length validation
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must be no more than ${rule.maxLength} characters`);
        }

        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }

        // Sanitization
        let sanitizedValue = value;
        if (rule.sanitize) {
          if (rule.sanitize.includes('escape')) {
            sanitizedValue = validator.escape(sanitizedValue);
          }
          if (rule.sanitize.includes('trim')) {
            sanitizedValue = sanitizedValue.trim();
          }
          if (rule.sanitize.includes('lowercase')) {
            sanitizedValue = sanitizedValue.toLowerCase();
          }
        }

        sanitized[field] = sanitizedValue;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Rate limiting configuration
   */
  createRateLimiter(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.round(options.windowMs / 1000)
        });
      }
    };

    return rateLimit({ ...defaultOptions, ...options });
  }

  /**
   * Security headers middleware
   */
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'wss:', 'https:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * Brute force protection
   */
  checkBruteForce(identifier) {
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: null };
    const now = new Date();
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    // Reset attempts if lockout period has passed
    if (attempts.lastAttempt && (now - attempts.lastAttempt) > lockoutDuration) {
      this.failedAttempts.delete(identifier);
      return { isLocked: false, remainingAttempts: maxAttempts };
    }

    // Check if account is locked
    if (attempts.count >= maxAttempts) {
      const timeRemaining = lockoutDuration - (now - attempts.lastAttempt);
      return {
        isLocked: true,
        timeRemaining: Math.ceil(timeRemaining / 1000 / 60), // minutes
        remainingAttempts: 0
      };
    }

    return {
      isLocked: false,
      remainingAttempts: maxAttempts - attempts.count
    };
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(identifier, details = {}) {
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: null };
    attempts.count++;
    attempts.lastAttempt = new Date();
    this.failedAttempts.set(identifier, attempts);

    this.logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
      identifier,
      attemptCount: attempts.count,
      ...details,
      timestamp: new Date()
    });

    // Alert on suspicious activity
    if (attempts.count >= 3) {
      this.emit('suspiciousActivity', {
        type: 'MULTIPLE_FAILED_LOGINS',
        identifier,
        count: attempts.count,
        details
      });
    }
  }

  /**
   * Clear failed attempts on successful login
   */
  clearFailedAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Data encryption/decryption
   */
  encrypt(text) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedData) {
    try {
      const algorithm = 'aes-256-gcm';
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Security event logging
   */
  logSecurityEvent(eventType, details) {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      timestamp: new Date(),
      details,
      severity: this.getEventSeverity(eventType)
    };

    this.securityEvents.push(event);
    
    // Keep only last 1000 events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }

    // Emit event for real-time monitoring
    this.emit('securityEvent', event);

    // Log to console for development
    console.log(`[SECURITY] ${eventType}:`, details);
  }

  /**
   * Get event severity level
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'TOKEN_GENERATED': 'INFO',
      'TOKEN_VERIFIED': 'INFO',
      'TOKEN_VERIFICATION_FAILED': 'WARNING',
      'TOKEN_GENERATION_FAILED': 'ERROR',
      'FAILED_LOGIN_ATTEMPT': 'WARNING',
      'RATE_LIMIT_EXCEEDED': 'WARNING',
      'SUSPICIOUS_ACTIVITY': 'HIGH',
      'SECURITY_BREACH': 'CRITICAL'
    };

    return severityMap[eventType] || 'INFO';
  }

  /**
   * Generate secure secrets
   */
  generateSecureSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Security monitoring and alerts
   */
  startSecurityMonitoring() {
    // Monitor for suspicious patterns
    setInterval(() => {
      this.analyzeSuspiciousActivity();
    }, 60000); // Every minute

    console.log('Security monitoring started');
  }

  analyzeSuspiciousActivity() {
    const recentEvents = this.securityEvents.filter(
      event => (new Date() - event.timestamp) < 300000 // Last 5 minutes
    );

    // Check for multiple failed logins from same IP
    const failedLogins = recentEvents.filter(event => 
      event.type === 'FAILED_LOGIN_ATTEMPT'
    );

    if (failedLogins.length > 10) {
      this.emit('securityAlert', {
        type: 'BRUTE_FORCE_ATTACK',
        severity: 'HIGH',
        details: {
          failedAttempts: failedLogins.length,
          timeframe: '5 minutes'
        }
      });
    }

    // Check for rate limit violations
    const rateLimitEvents = recentEvents.filter(event => 
      event.type === 'RATE_LIMIT_EXCEEDED'
    );

    if (rateLimitEvents.length > 5) {
      this.emit('securityAlert', {
        type: 'POTENTIAL_DOS_ATTACK',
        severity: 'HIGH',
        details: {
          violations: rateLimitEvents.length,
          timeframe: '5 minutes'
        }
      });
    }
  }

  /**
   * Get security dashboard data
   */
  getSecurityDashboard() {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(
      event => event.timestamp > last24Hours
    );

    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      activeFailedAttempts: this.failedAttempts.size,
      lastUpdated: now
    };
  }
}

module.exports = SecurityService;