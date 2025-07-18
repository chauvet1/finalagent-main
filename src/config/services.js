/**
 * Service Configuration
 * Centralized configuration for all production-ready services
 */

const config = {
  // Real-time Data Service Configuration
  realTimeData: {
    // External API configurations
    weather: {
      apiKey: process.env.WEATHER_API_KEY || 'demo_key',
      baseUrl: 'https://api.openweathermap.org/data/2.5',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    traffic: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY || 'demo_key',
      baseUrl: 'https://maps.googleapis.com/maps/api',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    security: {
      apiKey: process.env.SECURITY_API_KEY || 'demo_key',
      baseUrl: process.env.SECURITY_API_URL || 'https://api.security-provider.com',
      timeout: 10000,
      retryAttempts: 2,
      retryDelay: 2000
    },
    market: {
      apiKey: process.env.MARKET_DATA_API_KEY || 'demo_key',
      baseUrl: 'https://api.marketdata.com/v1',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    crypto: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    // Update intervals (in milliseconds)
    updateIntervals: {
      weather: 10 * 60 * 1000, // 10 minutes
      traffic: 5 * 60 * 1000,  // 5 minutes
      security: 2 * 60 * 1000, // 2 minutes
      market: 15 * 60 * 1000,  // 15 minutes
      crypto: 5 * 60 * 1000,   // 5 minutes
      system: 30 * 1000       // 30 seconds
    },
    // Cache settings
    cache: {
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
      maxSize: 1000,      // Maximum cache entries
      checkPeriod: 60 * 1000 // Check for expired entries every minute
    }
  },

  // Performance Service Configuration
  performance: {
    // Memory cache settings
    memoryCache: {
      maxSize: 500,
      ttl: 5 * 60 * 1000, // 5 minutes
      checkPeriod: 60 * 1000
    },
    // Redis cache settings
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0,
      keyPrefix: 'agent_system:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    },
    // Query optimization settings
    queryOptimization: {
      slowQueryThreshold: 1000, // 1 second
      enableQueryLogging: process.env.NODE_ENV !== 'production',
      maxQueryTime: 30000, // 30 seconds
      connectionPoolSize: 10
    },
    // Monitoring intervals
    monitoring: {
      systemMetrics: 30 * 1000,    // 30 seconds
      slowQueries: 60 * 1000,      // 1 minute
      responseTime: 10 * 1000,     // 10 seconds
      memoryUsage: 30 * 1000       // 30 seconds
    }
  },

  // Security Service Configuration
  security: {
    // JWT settings
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'agent-system',
      audience: process.env.JWT_AUDIENCE || 'agent-system-users'
    },
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,         // Limit each IP to 100 requests per windowMs
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false
    },
    // Brute force protection
    bruteForce: {
      freeRetries: 5,
      minWait: 5 * 60 * 1000,   // 5 minutes
      maxWait: 15 * 60 * 1000,  // 15 minutes
      lifetime: 24 * 60 * 60 * 1000, // 24 hours
      failCallback: null
    },
    // Encryption settings
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      saltLength: 32
    },
    // Password hashing
    bcrypt: {
      saltRounds: 12
    },
    // Input validation
    validation: {
      maxStringLength: 10000,
      maxArrayLength: 1000,
      maxObjectDepth: 10
    }
  },

  // Monitoring Service Configuration
  monitoring: {
    // Logging configuration
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'json',
      maxFiles: 5,
      maxSize: '20m',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      filename: 'logs/agent-system-%DATE%.log',
      errorFilename: 'logs/agent-system-error-%DATE%.log'
    },
    // Health check configuration
    healthCheck: {
      interval: 30 * 1000,      // 30 seconds
      timeout: 5 * 1000,        // 5 seconds
      retries: 3,
      gracefulShutdownTimeout: 10 * 1000, // 10 seconds
      checks: {
        database: true,
        redis: true,
        memory: true,
        disk: true,
        externalApis: true
      },
      thresholds: {
        memory: 85,    // 85% memory usage
        disk: 90,      // 90% disk usage
        cpu: 80,       // 80% CPU usage
        responseTime: 2000 // 2 seconds
      }
    },
    // Alerting configuration
    alerting: {
      enabled: process.env.ALERTING_ENABLED === 'true',
      channels: {
        slack: {
          enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: 'Agent System Monitor'
        },
        email: {
          enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
          smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          },
          from: process.env.ALERT_EMAIL_FROM || 'alerts@agent-system.com',
          to: process.env.ALERT_EMAIL_TO ? process.env.ALERT_EMAIL_TO.split(',') : []
        },
        pagerduty: {
          enabled: process.env.PAGERDUTY_ALERTS_ENABLED === 'true',
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
          severity: 'error'
        }
      },
      rules: {
        errorRate: {
          threshold: 5,        // 5% error rate
          window: 5 * 60 * 1000, // 5 minutes
          severity: 'warning'
        },
        responseTime: {
          threshold: 2000,     // 2 seconds
          window: 5 * 60 * 1000, // 5 minutes
          severity: 'warning'
        },
        memoryUsage: {
          threshold: 85,       // 85%
          window: 2 * 60 * 1000, // 2 minutes
          severity: 'critical'
        },
        diskUsage: {
          threshold: 90,       // 90%
          window: 5 * 60 * 1000, // 5 minutes
          severity: 'critical'
        },
        databaseConnections: {
          threshold: 80,       // 80% of max connections
          window: 2 * 60 * 1000, // 2 minutes
          severity: 'warning'
        }
      }
    },
    // Metrics collection
    metrics: {
      enabled: true,
      interval: 30 * 1000,     // 30 seconds
      retention: 7 * 24 * 60 * 60 * 1000, // 7 days
      aggregation: {
        enabled: true,
        intervals: ['1m', '5m', '15m', '1h', '1d']
      }
    }
  },

  // Business Intelligence Configuration
  businessIntelligence: {
    // Cache settings for BI queries
    cache: {
      ttl: 5 * 60 * 1000,      // 5 minutes
      maxSize: 200,            // Maximum cached reports
      keyPrefix: 'bi_cache:'
    },
    // Report generation settings
    reports: {
      maxDataPoints: 10000,    // Maximum data points per report
      timeout: 30 * 1000,      // 30 seconds timeout
      concurrency: 5,          // Maximum concurrent report generations
      retryAttempts: 2
    },
    // Forecasting settings
    forecasting: {
      enabled: true,
      algorithms: ['linear', 'exponential', 'seasonal'],
      defaultPeriods: 30,      // 30 days forecast
      minDataPoints: 10,       // Minimum data points for forecasting
      confidenceInterval: 0.95 // 95% confidence interval
    },
    // Data quality settings
    dataQuality: {
      outlierDetection: true,
      missingDataThreshold: 0.1, // 10% missing data threshold
      dataFreshnessThreshold: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Database Configuration
  database: {
    // Connection pool settings
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    // Query settings
    query: {
      timeout: 30000,          // 30 seconds
      maxRows: 10000,          // Maximum rows per query
      enableLogging: process.env.NODE_ENV !== 'production'
    },
    // Backup settings
    backup: {
      enabled: process.env.DB_BACKUP_ENABLED === 'true',
      schedule: '0 2 * * *',   // Daily at 2 AM
      retention: 30,           // Keep 30 days of backups
      compression: true
    }
  },

  // Environment-specific overrides
  environments: {
    development: {
      realTimeData: {
        updateIntervals: {
          weather: 30 * 60 * 1000,  // 30 minutes in dev
          traffic: 15 * 60 * 1000,  // 15 minutes in dev
          security: 10 * 60 * 1000  // 10 minutes in dev
        }
      },
      monitoring: {
        logging: {
          level: 'debug'
        },
        healthCheck: {
          interval: 60 * 1000      // 1 minute in dev
        }
      }
    },
    test: {
      realTimeData: {
        updateIntervals: {
          weather: 60 * 60 * 1000,  // 1 hour in test
          traffic: 60 * 60 * 1000,  // 1 hour in test
          security: 60 * 60 * 1000  // 1 hour in test
        }
      },
      monitoring: {
        logging: {
          level: 'error'
        },
        alerting: {
          enabled: false
        }
      }
    },
    production: {
      security: {
        rateLimit: {
          maxRequests: 50          // Stricter rate limiting in production
        }
      },
      monitoring: {
        logging: {
          level: 'warn'
        },
        alerting: {
          enabled: true
        }
      }
    }
  }
};

/**
 * Get configuration with environment-specific overrides
 */
function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = { ...config };
  
  // Apply environment-specific overrides
  if (config.environments[env]) {
    return mergeDeep(baseConfig, config.environments[env]);
  }
  
  return baseConfig;
}

/**
 * Deep merge utility function
 */
function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is an object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Validate required environment variables
 */
function validateConfig() {
  const requiredEnvVars = {
    production: [
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_HOST'
    ],
    development: [],
    test: []
  };
  
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || [];
  
  const missing = required.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for ${env}: ${missing.join(', ')}`);
  }
}

// Validate configuration on module load
validateConfig();

module.exports = {
  getConfig,
  validateConfig,
  config: getConfig()
};