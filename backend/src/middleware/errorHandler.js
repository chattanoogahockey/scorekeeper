import logger from '../../logger.js';
import { config } from '../config/index.js';

/**
 * Error response types
 */
export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  DATABASE: 'DATABASE_ERROR',
  ANNOUNCER: 'ANNOUNCER_ERROR',
  TTS: 'TTS_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL: 'INTERNAL_ERROR'
};

/**
 * Create standardized error response
 */
export function createErrorResponse(error, context = 'API', requestId = null) {
  const errorResponse = {
    error: true,
    message: 'An error occurred',
    timestamp: new Date().toISOString(),
    canRetry: true,
    requestId,
    context,
    type: ErrorTypes.INTERNAL
  };

  // Database errors
  if (error.message?.includes('not configured') ||
      error.message?.includes('Cosmos') ||
      error.code === 404) {
    errorResponse.message = 'Database temporarily unavailable. Please try again later.';
    errorResponse.code = ErrorTypes.DATABASE;
    errorResponse.userMessage = 'The scorekeeper database is temporarily unavailable. Your data is safe - please try again in a moment.';
    return errorResponse;
  }

  // Announcer service errors
  if (error.message?.includes('Announcer service not available')) {
    errorResponse.message = 'Voice announcements temporarily unavailable';
    errorResponse.code = ErrorTypes.ANNOUNCER;
    errorResponse.userMessage = 'Voice announcements are temporarily unavailable. Text updates and scoring still work normally.';
    errorResponse.fallback = 'Text mode available';
    return errorResponse;
  }

  // TTS errors
  if (error.message?.includes('TTS') || error.message?.includes('speech')) {
    errorResponse.message = 'Text-to-speech service temporarily unavailable';
    errorResponse.code = ErrorTypes.TTS;
    errorResponse.userMessage = 'Voice synthesis is temporarily unavailable. Text announcements still work normally.';
    return errorResponse;
  }

  // Validation errors
  if (error.message?.includes('validation') || error.message?.includes('required')) {
    errorResponse.message = error.message;
    errorResponse.code = ErrorTypes.VALIDATION;
    errorResponse.canRetry = false;
    return errorResponse;
  }

  // Not found errors
  if (error.code === 404 || error.message?.includes('not found')) {
    errorResponse.message = error.message || 'Resource not found';
    errorResponse.code = ErrorTypes.NOT_FOUND;
    errorResponse.canRetry = false;
    return errorResponse;
  }

  // Conflict errors
  if (error.code === 409 || error.message?.includes('conflict')) {
    errorResponse.message = error.message || 'Resource conflict';
    errorResponse.code = ErrorTypes.CONFLICT;
    errorResponse.canRetry = false;
    return errorResponse;
  }

  // Generic error with sanitized message
  errorResponse.message = error.message || 'Internal server error';
  return errorResponse;
}

/**
 * Global error handler middleware
 */
export function errorHandler(error, req, res, _next) {
  const requestId = req.requestId || req.headers['x-request-id'];

  // Log the error
  const logData = {
    error: error.message,
    context: 'Global Error Handler',
    requestId,
    method: req.method,
    url: req.url,
    stack: config.isProduction ? undefined : error.stack,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  logger.error('Unhandled error', logData);

  // Create standardized error response
  const errorResponse = createErrorResponse(error, 'Global Handler', requestId);

  // Set appropriate status code
  let statusCode = 500;
  switch (errorResponse.code) {
  case ErrorTypes.VALIDATION:
    statusCode = 400;
    break;
  case ErrorTypes.NOT_FOUND:
    statusCode = 404;
    break;
  case ErrorTypes.CONFLICT:
    statusCode = 409;
    break;
  case ErrorTypes.UNAUTHORIZED:
    statusCode = 401;
    break;
  case ErrorTypes.FORBIDDEN:
    statusCode = 403;
    break;
  case ErrorTypes.RATE_LIMIT:
    statusCode = 429;
    break;
  default:
    statusCode = 500;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req, res) {
  const requestId = req.requestId || req.headers['x-request-id'];

  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    requestId
  });

  res.status(404).json({
    error: true,
    message: 'Route not found',
    timestamp: new Date().toISOString(),
    requestId,
    type: ErrorTypes.NOT_FOUND
  });
}
