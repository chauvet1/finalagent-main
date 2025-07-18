const Redis = require('redis');
const NodeCache = require('node-cache');
const { EventEmitter } = require('events');
const os = require('os');
const cluster = require('cluster');

/**
 * Performance Optimization Service
 * Handles caching, database optimization, and performance monitoring
 */
class PerformanceService extends EventEmitter {
  constructor() {
    super();
    this.memoryCache = new NodeCache({ 
      stdTTL: 600, // 10 minutes default
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // Better performance
    });
    
    this.redisClient = null;
    this.performanceMetrics = {
      requests: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      dbQueryTime: []
    };
    
    this.queryOptimizations = new Map();
    this.slowQueries = [];
    this.isMonitoring = false;
    
    this.initializeRedis();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              console.log('Redis server connection refused');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        await this.redisClient.connect();
        console.log('Redis connected successfully');
        
        this.redisClient.on('error', (err) => {
          console.error('Redis error:', err);
          this.emit('cacheError', err);
        });
      }
    } catch (error) {
      console.warn('Redis not available, using memory cache only:', error.message);
    }
  }

  /**
   * Multi-level caching strategy
   */
  async get(key, options = {}) {
    const { useRedis = true, ttl = 600 } = options;
    
    try {
      // Level 1: Memory cache (fastest)
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        this.performanceMetrics.cacheHits++;
        this.emit('cacheHit', { level: 'memory', key });
        return memoryResult;
      }

      // Level 2: Redis cache (fast)
      if (useRedis && this.redisClient) {
        const redisResult = await this.redisClient.get(key);
        if (redisResult !== null) {
          const parsed = JSON.parse(redisResult);
          // Store in memory cache for faster future access
          this.memoryCache.set(key, parsed, Math.min(ttl, 300)); // Max 5 min in memory
          this.performanceMetrics.cacheHits++;
          this.emit('cacheHit', { level: 'redis', key });
          return parsed;
        }
      }

      this.performanceMetrics.cacheMisses++;
      this.emit('cacheMiss', { key });
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.performanceMetrics.cacheMisses++;
      return null;
    }
  }

  /**
   * Set data in cache with multi-level strategy
   */
  async set(key, value, options = {}) {
    const { useRedis = true, ttl = 600, memoryTtl = 300 } = options;
    
    try {
      // Always store in memory cache
      this.memoryCache.set(key, value, Math.min(memoryTtl, ttl));

      // Store in Redis if available
      if (useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      }

      this.emit('cacheSet', { key, ttl });
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete from all cache levels
   */
  async delete(key) {
    try {
      this.memoryCache.del(key);
      
      if (this.redisClient) {
        await this.redisClient.del(key);
      }

      this.emit('cacheDelete', { key });
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    try {
      this.memoryCache.flushAll();
      
      if (this.redisClient) {
        await this.redisClient.flushAll();
      }

      this.emit('cacheClear');
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Database query optimization
   */
  async optimizeQuery(queryFn, cacheKey, options = {}) {
    const { ttl = 600, forceRefresh = false } = options;
    const startTime = Date.now();

    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = await this.get(cacheKey, { ttl });
        if (cached !== null) {
          return cached;
        }
      }

      // Execute query
      const result = await queryFn();
      const queryTime = Date.now() - startTime;

      // Track query performance
      this.performanceMetrics.dbQueries++;
      this.performanceMetrics.dbQueryTime.push(queryTime);

      // Log slow queries
      if (queryTime > 1000) { // Queries taking more than 1 second
        this.slowQueries.push({
          cacheKey,
          queryTime,
          timestamp: new Date(),
          query: queryFn.toString().substring(0, 200)
        });
        
        this.emit('slowQuery', { cacheKey, queryTime });
      }

      // Cache the result
      await this.set(cacheKey, result, { ttl });

      return result;
    } catch (error) {
      console.error('Query optimization error:', error);
      throw error;
    }
  }

  /**
   * Batch processing for multiple queries
   */
  async batchProcess(operations, options = {}) {
    const { concurrency = 5, timeout = 30000 } = options;
    const results = [];
    const errors = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await Promise.race([
            operation(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), timeout)
            )
          ]);
          return { index: i + index, result, success: true };
        } catch (error) {
          return { index: i + index, error: error.message, success: false };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results[result.value.index] = result.value.result;
          } else {
            errors.push(result.value);
          }
        } else {
          errors.push({ error: result.reason.message, success: false });
        }
      });
    }

    return { results, errors };
  }

  /**
   * Request/Response performance middleware
   */
  createPerformanceMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      this.performanceMetrics.requests++;
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        this.performanceMetrics.responseTime.push(responseTime);
        
        // Keep only last 1000 response times
        if (this.performanceMetrics.responseTime.length > 1000) {
          this.performanceMetrics.responseTime.shift();
        }
        
        // Log slow requests
        if (responseTime > 2000) { // Requests taking more than 2 seconds
          this.emit('slowRequest', {
            method: req.method,
            url: req.url,
            responseTime,
            timestamp: new Date()
          });
        }
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Memory optimization
   */
  optimizeMemory() {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Clear old performance metrics
      const maxMetrics = 1000;
      if (this.performanceMetrics.responseTime.length > maxMetrics) {
        this.performanceMetrics.responseTime = 
          this.performanceMetrics.responseTime.slice(-maxMetrics);
      }
      if (this.performanceMetrics.dbQueryTime.length > maxMetrics) {
        this.performanceMetrics.dbQueryTime = 
          this.performanceMetrics.dbQueryTime.slice(-maxMetrics);
      }

      // Clear old slow queries
      const maxSlowQueries = 100;
      if (this.slowQueries.length > maxSlowQueries) {
        this.slowQueries = this.slowQueries.slice(-maxSlowQueries);
      }

      this.emit('memoryOptimized');
    } catch (error) {
      console.error('Memory optimization error:', error);
    }
  }

  /**
   * Performance monitoring
   */
  startPerformanceMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Optimize memory every 5 minutes
    setInterval(() => {
      this.optimizeMemory();
    }, 300000);

    // Generate performance report every hour
    setInterval(() => {
      this.generatePerformanceReport();
    }, 3600000);

    console.log('Performance monitoring started');
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.performanceMetrics.memoryUsage.push({
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        timestamp: new Date()
      });

      // CPU usage
      const cpus = os.cpus();
      const totalCpu = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
        const idle = cpu.times.idle;
        return acc + (100 - (100 * idle / total));
      }, 0);
      
      this.performanceMetrics.cpuUsage.push({
        usage: totalCpu / cpus.length,
        timestamp: new Date()
      });

      // Keep only last 100 metrics
      if (this.performanceMetrics.memoryUsage.length > 100) {
        this.performanceMetrics.memoryUsage.shift();
      }
      if (this.performanceMetrics.cpuUsage.length > 100) {
        this.performanceMetrics.cpuUsage.shift();
      }

      this.emit('metricsCollected', {
        memory: memUsage,
        cpu: totalCpu / cpus.length
      });
    } catch (error) {
      console.error('Metrics collection error:', error);
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    try {
      const now = new Date();
      const report = {
        timestamp: now,
        requests: {
          total: this.performanceMetrics.requests,
          averageResponseTime: this.calculateAverage(this.performanceMetrics.responseTime),
          slowRequests: this.performanceMetrics.responseTime.filter(time => time > 2000).length
        },
        cache: {
          hits: this.performanceMetrics.cacheHits,
          misses: this.performanceMetrics.cacheMisses,
          hitRate: this.performanceMetrics.cacheHits / 
                   (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100
        },
        database: {
          queries: this.performanceMetrics.dbQueries,
          averageQueryTime: this.calculateAverage(this.performanceMetrics.dbQueryTime),
          slowQueries: this.slowQueries.length
        },
        system: {
          memoryUsage: this.getLatestMetric('memoryUsage'),
          cpuUsage: this.getLatestMetric('cpuUsage'),
          uptime: process.uptime()
        }
      };

      this.emit('performanceReport', report);
      console.log('Performance Report:', JSON.stringify(report, null, 2));
      
      return report;
    } catch (error) {
      console.error('Performance report generation error:', error);
      return null;
    }
  }

  /**
   * Helper methods
   */
  calculateAverage(array) {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  getLatestMetric(metricType) {
    const metrics = this.performanceMetrics[metricType];
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  /**
   * Performance recommendations
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    // Cache hit rate recommendations
    const cacheHitRate = this.performanceMetrics.cacheHits / 
                        (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100;
    
    if (cacheHitRate < 70) {
      recommendations.push({
        type: 'CACHE_OPTIMIZATION',
        priority: 'HIGH',
        message: `Cache hit rate is ${cacheHitRate.toFixed(1)}%. Consider increasing cache TTL or optimizing cache keys.`
      });
    }

    // Response time recommendations
    const avgResponseTime = this.calculateAverage(this.performanceMetrics.responseTime);
    if (avgResponseTime > 1000) {
      recommendations.push({
        type: 'RESPONSE_TIME',
        priority: 'HIGH',
        message: `Average response time is ${avgResponseTime.toFixed(0)}ms. Consider optimizing database queries or adding more caching.`
      });
    }

    // Memory usage recommendations
    const latestMemory = this.getLatestMetric('memoryUsage');
    if (latestMemory && latestMemory.heapUsed > 500 * 1024 * 1024) { // 500MB
      recommendations.push({
        type: 'MEMORY_USAGE',
        priority: 'MEDIUM',
        message: `High memory usage detected (${(latestMemory.heapUsed / 1024 / 1024).toFixed(0)}MB). Consider memory optimization.`
      });
    }

    // Slow queries recommendations
    if (this.slowQueries.length > 10) {
      recommendations.push({
        type: 'DATABASE_OPTIMIZATION',
        priority: 'HIGH',
        message: `${this.slowQueries.length} slow queries detected. Consider adding database indexes or optimizing queries.`
      });
    }

    return recommendations;
  }

  /**
   * Get performance dashboard data
   */
  getPerformanceDashboard() {
    return {
      metrics: this.performanceMetrics,
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      recommendations: this.getPerformanceRecommendations(),
      cacheStats: {
        memoryKeys: this.memoryCache.keys().length,
        redisConnected: this.redisClient ? true : false
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.isMonitoring = false;
      
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      this.memoryCache.flushAll();
      this.removeAllListeners();
      
      console.log('Performance service cleaned up');
    } catch (error) {
      console.error('Performance service cleanup error:', error);
    }
  }
}

module.exports = PerformanceService;