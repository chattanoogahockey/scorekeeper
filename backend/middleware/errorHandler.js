/**
 * Centralized error handling middleware for Express
 * Provides consistent error responses and logging
 */

// Centralized error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error caught by middleware:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  const errorResponse = {
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ...errorResponse,
      error: 'Validation failed',
      details: err.details || err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      ...errorResponse,
      error: 'Invalid data format',
      field: err.path
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      ...errorResponse,
      error: 'Duplicate entry',
      message: 'Resource already exists'
    });
  }

  // Cosmos DB specific errors
  if (err.code === 404) {
    return res.status(404).json({
      ...errorResponse,
      error: 'Resource not found',
      message: 'The requested resource could not be found'
    });
  }

  if (err.code === 413) {
    return res.status(413).json({
      ...errorResponse,
      error: 'Request too large',
      message: 'Request payload exceeds size limit'
    });
  }

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    delete errorResponse.message;
    delete errorResponse.stack;
  }

  // Default to 500 for unhandled errors
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch Promise rejections
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unknown routes
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
};

// Validation helper
export const validateRequired = (fields, body) => {
  const missing = [];
  
  for (const field of fields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.name = 'ValidationError';
    error.details = { missingFields: missing };
    throw error;
  }
};
