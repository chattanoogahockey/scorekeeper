import logger from '../../logger.js';
import { config } from '../config/index.js';

/**
 * Middleware to log incoming requests
 */
export function requestLogger(req, res, next) {
  if (!config.logging.enableRequestLogging) {
    return next();
  }

  const start = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substr(2, 9);

  // Add request ID to request object
  req.requestId = requestId;

  logger.info('Request received', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId
    });
  });

  next();
}

/**
 * Middleware to handle CORS
 */
export function corsHandler(req, res, next) {
  res.header('Access-Control-Allow-Origin', config.cors.origin);
  res.header('Access-Control-Allow-Credentials', config.cors.credentials);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

/**
 * Middleware to add cache control headers
 */
export function cacheControl(req, res, next) {
  // Add cache-busting headers for API endpoints
  if (req.url.startsWith('/api/')) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Request-ID': req.requestId || Math.random().toString(36).substr(2, 9)
    });
  }
  next();
}

/**
 * Middleware to validate required fields in request body
 */
export function validateBody(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => !req.body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
        received: Object.keys(req.body)
      });
    }

    next();
  };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery(requiredParams) {
  return (req, res, next) => {
    const missing = requiredParams.filter(param => !req.query[param]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required query parameters',
        missing,
        received: Object.keys(req.query)
      });
    }

    next();
  };
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
