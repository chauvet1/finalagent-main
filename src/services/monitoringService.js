const winston = require('winston');
const { EventEmitter } = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

/**
 * Comprehensive Monitoring and Logging Service
 * Provides structured logging, health checks, alerting, and system monitoring
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.logger = this.createLogger();
    this.healthChecks = new Map();
    this.alerts = [];
    this.metrics = {
      errors: 0,
      warnings: 0,
      requests: 0,
      uptime: process.uptime(),
      startTime: new Date()
    };
    this.alertRules = new Map();
    this.isMonitoring = false;
    
    this.initializeHealthChecks();
    this.setupAlertRules();
  }

  /**
   * Create structured logger with multiple transports
   */
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta,
          service: 'security-system',
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid,
          hostname: os.hostname()
        });
      })
    );

    const transports = [
      // Console transport for development
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: 'logs/app.log',
        level: 'info',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }),
      
      // Error file transport
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ];

    // Add external logging service in production
    if (process.env.NODE_ENV === 'production' && process.env.EXTERNAL_LOG_URL) {
      transports.push(
        new winston.transports.Http({
          host: process.env.EXTERNAL_LOG_HOST,
          port: process.env.EXTERNAL_LOG_PORT,
          path: process.env.EXTERNAL_LOG_PATH,
          format: logFormat
        })
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Structured logging methods
   */
  log(level, message, meta = {}) {
    this.logger.log(level, message, {
      ...meta,
      correlationId: meta.correlationId || this.generateCorrelationId(),
      userId: meta.userId,
      sessionId: meta.sessionId,
      requestId: meta.requestId
    });

    // Update metrics
    if (level === 'error') this.metrics.errors++;
    if (level === 'warn') this.metrics.warnings++;

    // Emit event for real-time monitoring
    this.emit('logEntry', { level, message, meta });
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    };
    this.log('error', message, errorMeta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Health check system
   */
  registerHealthCheck(name, checkFunction, options = {}) {
    const { interval = 60000, timeout = 5000, critical = false } = options;
    
    this.healthChecks.set(name, {
      name,
      checkFunction,
      interval,
      timeout,
      critical,
      lastCheck: null,
      status: 'unknown',
      error: null,
      responseTime: null
    });

    this.info('Health check registered', { healthCheck: name, interval, critical });
  }

  async runHealthCheck(name) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        healthCheck.checkFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      healthCheck.lastCheck = new Date();
      healthCheck.status = 'healthy';
      healthCheck.error = null;
      healthCheck.responseTime = responseTime;

      this.debug('Health check passed', { 
        healthCheck: name, 
        responseTime,
        result 
      });

      return { status: 'healthy', responseTime, result };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      healthCheck.lastCheck = new Date();
      healthCheck.status = 'unhealthy';
      healthCheck.error = error.message;
      healthCheck.responseTime = responseTime;

      this.error('Health check failed', error, { 
        healthCheck: name, 
        responseTime,
        critical: healthCheck.critical 
      });

      // Trigger alert for critical health checks
      if (healthCheck.critical) {
        this.triggerAlert('HEALTH_CHECK_FAILED', {
          healthCheck: name,
          error: error.message,
          critical: true
        });
      }

      return { status: 'unhealthy', responseTime, error: error.message };
    }
  }

  async runAllHealthChecks() {
    const results = {};
    const promises = Array.from(this.healthChecks.keys()).map(async (name) => {
      try {
        results[name] = await this.runHealthCheck(name);
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Initialize default health checks
   */
  initializeHealthChecks() {
    // Database health check
    this.registerHealthCheck('database', async () => {
      // This would check database connectivity
      // For now, return a simple check
      return { connected: true, responseTime: Math.random() * 100 };
    }, { critical: true, interval: 30000 });

    // Memory health check
    this.registerHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (usagePercent > 90) {
        throw new Error(`High memory usage: ${usagePercent.toFixed(1)}%`);
      }
      
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        usagePercent: usagePercent.toFixed(1),
        systemMemory: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem
        }
      };
    }, { critical: false, interval: 60000 });

    // Disk space health check
    this.registerHealthCheck('diskSpace', async () => {
      try {
        const stats = await fs.stat('.');
        // This is a simplified check - in production you'd check actual disk usage
        return { available: true, path: process.cwd() };
      } catch (error) {
        throw new Error(`Disk access error: ${error.message}`);
      }
    }, { critical: true, interval: 300000 }); // 5 minutes

    // External API health check
    this.registerHealthCheck('externalAPIs', async () => {
      // Check external dependencies
      const checks = [];
      
      // Example: Check if external weather API is accessible
      if (process.env.WEATHER_API_KEY) {
        checks.push(this.checkExternalAPI('https://api.openweathermap.org/data/2.5/weather?q=London&appid=' + process.env.WEATHER_API_KEY));
      }
      
      const results = await Promise.allSettled(checks);
      const failures = results.filter(r => r.status === 'rejected');
      
      if (failures.length > 0) {
        throw new Error(`${failures.length} external API(s) failed`);
      }
      
      return { externalAPIs: results.length, allHealthy: true };
    }, { critical: false, interval: 180000 }); // 3 minutes
  }

  async checkExternalAPI(url) {
    const response = await fetch(url, { 
      method: 'HEAD', 
      timeout: 5000 
    });
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return { url, status: response.status };
  }

  /**
   * Alert system
   */
  setupAlertRules() {
    // Error rate alert
    this.alertRules.set('error_rate', {
      name: 'High Error Rate',
      condition: () => {
        const errorRate = this.metrics.errors / Math.max(this.metrics.requests, 1);
        return errorRate > 0.05; // 5% error rate
      },
      severity: 'HIGH',
      cooldown: 300000 // 5 minutes
    });

    // Memory usage alert
    this.alertRules.set('memory_usage', {
      name: 'High Memory Usage',
      condition: () => {
        const memUsage = process.memoryUsage();
        const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        return usagePercent > 85;
      },
      severity: 'MEDIUM',
      cooldown: 600000 // 10 minutes
    });

    // Response time alert
    this.alertRules.set('response_time', {
      name: 'Slow Response Time',
      condition: () => {
        // This would check average response time from performance service
        return false; // Placeholder
      },
      severity: 'MEDIUM',
      cooldown: 300000 // 5 minutes
    });
  }

  triggerAlert(type, details = {}) {
    const alert = {
      id: this.generateCorrelationId(),
      type,
      severity: details.severity || 'MEDIUM',
      message: details.message || `Alert triggered: ${type}`,
      details,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    this.error('Alert triggered', null, alert);
    this.emit('alert', alert);

    // Send to external alerting systems
    this.sendExternalAlert(alert);

    return alert;
  }

  async sendExternalAlert(alert) {
    try {
      // Slack webhook
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(alert);
      }

      // Email alert
      if (process.env.ALERT_EMAIL) {
        await this.sendEmailAlert(alert);
      }

      // PagerDuty integration
      if (process.env.PAGERDUTY_API_KEY && alert.severity === 'HIGH') {
        await this.sendPagerDutyAlert(alert);
      }
    } catch (error) {
      this.error('Failed to send external alert', error, { alertId: alert.id });
    }
  }

  async sendSlackAlert(alert) {
    const payload = {
      text: `🚨 ${alert.type}: ${alert.message}`,
      attachments: [{
        color: alert.severity === 'HIGH' ? 'danger' : 'warning',
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: true },
          { title: 'Details', value: JSON.stringify(alert.details, null, 2), short: false }
        ]
      }]
    };

    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack alert failed: ${response.status}`);
    }
  }

  async sendEmailAlert(alert) {
    // Email implementation would go here
    // Using a service like SendGrid, AWS SES, etc.
    this.debug('Email alert would be sent', { alert });
  }

  async sendPagerDutyAlert(alert) {
    // PagerDuty implementation would go here
    this.debug('PagerDuty alert would be sent', { alert });
  }

  /**
   * System monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;

    // Run health checks periodically
    this.healthChecks.forEach((healthCheck, name) => {
      setInterval(() => {
        this.runHealthCheck(name).catch(error => {
          this.error('Health check execution failed', error, { healthCheck: name });
        });
      }, healthCheck.interval);
    });

    // Check alert rules periodically
    setInterval(() => {
      this.checkAlertRules();
    }, 60000); // Every minute

    // System metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    // Log rotation and cleanup
    setInterval(() => {
      this.performMaintenance();
    }, 3600000); // Every hour

    this.info('Monitoring service started', {
      healthChecks: this.healthChecks.size,
      alertRules: this.alertRules.size
    });
  }

  checkAlertRules() {
    this.alertRules.forEach((rule, name) => {
      try {
        if (rule.condition()) {
          // Check cooldown
          const lastAlert = this.alerts.find(a => 
            a.type === name && 
            (Date.now() - a.timestamp.getTime()) < rule.cooldown
          );

          if (!lastAlert) {
            this.triggerAlert(name, {
              severity: rule.severity,
              message: rule.name,
              rule: name
            });
          }
        }
      } catch (error) {
        this.error('Alert rule check failed', error, { rule: name });
      }
    });
  }

  collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        eventLoopDelay: this.measureEventLoopDelay(),
        activeHandles: process._getActiveHandles().length,
        activeRequests: process._getActiveRequests().length
      };

      this.emit('systemMetrics', metrics);
      this.debug('System metrics collected', metrics);
    } catch (error) {
      this.error('System metrics collection failed', error);
    }
  }

  measureEventLoopDelay() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      this.emit('eventLoopDelay', delay);
    });
  }

  performMaintenance() {
    try {
      // Clean up old alerts
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.alerts = this.alerts.filter(alert => alert.timestamp > oneWeekAgo);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      this.info('Maintenance completed', {
        alertsRetained: this.alerts.length,
        memoryUsage: process.memoryUsage()
      });
    } catch (error) {
      this.error('Maintenance failed', error);
    }
  }

  /**
   * Monitoring dashboard data
   */
  getMonitoringDashboard() {
    const healthStatus = {};
    this.healthChecks.forEach((check, name) => {
      healthStatus[name] = {
        status: check.status,
        lastCheck: check.lastCheck,
        responseTime: check.responseTime,
        error: check.error
      };
    });

    const recentAlerts = this.alerts
      .filter(alert => (Date.now() - alert.timestamp.getTime()) < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      status: this.getOverallStatus(),
      uptime: process.uptime(),
      startTime: this.metrics.startTime,
      healthChecks: healthStatus,
      alerts: {
        total: this.alerts.length,
        recent: recentAlerts.slice(0, 10),
        unacknowledged: this.alerts.filter(a => !a.acknowledged).length
      },
      metrics: {
        errors: this.metrics.errors,
        warnings: this.metrics.warnings,
        requests: this.metrics.requests
      },
      system: {
        memory: process.memoryUsage(),
        platform: os.platform(),
        nodeVersion: process.version,
        pid: process.pid
      }
    };
  }

  getOverallStatus() {
    const criticalChecks = Array.from(this.healthChecks.values())
      .filter(check => check.critical);
    
    const unhealthyCritical = criticalChecks
      .filter(check => check.status === 'unhealthy');
    
    if (unhealthyCritical.length > 0) {
      return 'CRITICAL';
    }
    
    const unhealthyChecks = Array.from(this.healthChecks.values())
      .filter(check => check.status === 'unhealthy');
    
    if (unhealthyChecks.length > 0) {
      return 'WARNING';
    }
    
    return 'HEALTHY';
  }

  /**
   * Utility methods
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      this.info('Alert acknowledged', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Request tracking middleware
   */
  createRequestTrackingMiddleware() {
    return (req, res, next) => {
      const requestId = this.generateCorrelationId();
      const startTime = Date.now();
      
      req.requestId = requestId;
      req.startTime = startTime;
      
      this.metrics.requests++;
      
      this.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = Date.now() - startTime;
        
        this.info('Request completed', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length')
        });
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.isMonitoring = false;
    this.removeAllListeners();
    this.info('Monitoring service stopped');
  }
}

module.exports = MonitoringService;