/**
 * Professional Performance Monitoring and Request Tracking
 */

import logger from '../../logger.js';

/**
 * Performance metrics storage
 */
const performanceMetrics = {
  requestCounts: new Map(),
  responseTimes: [],
  errorCounts: new Map(),
  slowRequests: [],
  lastReset: Date.now()
};

/**
 * Generate unique request ID
 */
export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request ID middleware
 */
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  // Track request count
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  performanceMetrics.requestCounts.set(
    endpoint,
    (performanceMetrics.requestCounts.get(endpoint) || 0) + 1
  );
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const endMemory = process.memoryUsage();
    
    // Store response time
    performanceMetrics.responseTimes.push({
      endpoint,
      duration,
      timestamp: Date.now(),
      statusCode: res.statusCode
    });
    
    // Keep only last 1000 response times
    if (performanceMetrics.responseTimes.length > 1000) {
      performanceMetrics.responseTimes.shift();
    }
    
    // Track errors
    if (res.statusCode >= 400) {
      const errorKey = `${res.statusCode}:${endpoint}`;
      performanceMetrics.errorCounts.set(
        errorKey,
        (performanceMetrics.errorCounts.get(errorKey) || 0) + 1
      );
    }
    
    // Track slow requests (>2 seconds)
    if (duration > 2000) {
      performanceMetrics.slowRequests.push({
        endpoint,
        duration,
        timestamp: Date.now(),
        requestId: req.requestId,
        statusCode: res.statusCode,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed
      });
      
      // Keep only last 100 slow requests
      if (performanceMetrics.slowRequests.length > 100) {
        performanceMetrics.slowRequests.shift();
      }
    }
    
    // Log request details
    const logLevel = duration > 1000 ? 'warn' : 'info';
    logger[logLevel]('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      memoryDelta: `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`
    });
  });
  
  next();
};

/**
 * Rate limiting middleware
 */
export function createRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;
  
  const requests = new Map();
  
  // Clean up old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 60000);
  
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const requestData = requests.get(key);
    
    if (!requestData || now - requestData.resetTime > windowMs) {
      // Reset window
      requests.set(key, {
        count: 1,
        resetTime: now
      });
      return next();
    }
    
    if (requestData.count >= max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message,
          retryAfter: Math.ceil((requestData.resetTime + windowMs - now) / 1000)
        },
        meta: {
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    requestData.count++;
    next();
  };
}

/**
 * Health check endpoint data
 */
export function getHealthMetrics() {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  // Calculate metrics for the last 5 minutes
  const recentResponses = performanceMetrics.responseTimes.filter(
    rt => rt.timestamp > fiveMinutesAgo
  );
  
  const avgResponseTime = recentResponses.length > 0 
    ? recentResponses.reduce((sum, rt) => sum + rt.duration, 0) / recentResponses.length
    : 0;
  
  const errorRate = recentResponses.length > 0
    ? recentResponses.filter(rt => rt.statusCode >= 400).length / recentResponses.length
    : 0;
  
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    metrics: {
      requests: {
        total: Array.from(performanceMetrics.requestCounts.values()).reduce((a, b) => a + b, 0),
        last5Minutes: recentResponses.length,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      },
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024),
        total: Math.round(memory.heapTotal / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024)
      },
      slowRequests: performanceMetrics.slowRequests.length,
      topEndpoints: Array.from(performanceMetrics.requestCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([endpoint, count]) => ({ endpoint, count }))
    }
  };
}

/**
 * Reset performance metrics
 */
export function resetMetrics() {
  performanceMetrics.requestCounts.clear();
  performanceMetrics.responseTimes.length = 0;
  performanceMetrics.errorCounts.clear();
  performanceMetrics.slowRequests.length = 0;
  performanceMetrics.lastReset = Date.now();
}

/**
 * Export metrics for external monitoring
 */
export function getDetailedMetrics() {
  return {
    ...performanceMetrics,
    summary: getHealthMetrics()
  };
}
