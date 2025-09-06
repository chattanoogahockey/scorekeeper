/**
 * Standardized API Response Format for Gold Standard Applications
 */

/**
 * Standard API Response Interface
 */
export class APIResponse {
  constructor(success, data = null, meta = {}, error = null) {
    this.success = success;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      requestId: meta.requestId || this.generateRequestId(),
      ...meta
    };
    
    if (error) {
      this.error = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        details: error.details || null
      };
    }
  }

  generateRequestId() {
    return Math.random().toString(36).substr(2, 9);
  }

  static success(data, meta = {}) {
    return new APIResponse(true, data, meta);
  }

  static error(error, meta = {}) {
    return new APIResponse(false, null, meta, error);
  }

  static paginated(data, pagination, meta = {}) {
    return new APIResponse(true, data, {
      ...meta,
      pagination: {
        count: data.length,
        total: pagination.total || data.length,
        page: pagination.page || 1,
        limit: pagination.limit || data.length,
        hasNext: pagination.hasNext || false,
        hasPrevious: pagination.hasPrevious || false
      }
    });
  }
}

/**
 * Standard Error Classes
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource, id = null) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message, details = null) {
    super('CONFLICT', message, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Response middleware for consistent formatting
 */
export const responseMiddleware = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  res.json = function(data) {
    // If data is already an APIResponse, use it as-is
    if (data instanceof APIResponse) {
      return originalJson.call(this, data);
    }
    
    // If it's an error response, format it
    if (data.error || res.statusCode >= 400) {
      const response = APIResponse.error({
        code: data.code || 'ERROR',
        message: data.message || data.error || 'An error occurred',
        details: data.details || null
      }, {
        requestId: req.requestId
      });
      return originalJson.call(this, response);
    }
    
    // For success responses, wrap in standard format
    const response = APIResponse.success(data, {
      requestId: req.requestId
    });
    
    return originalJson.call(this, response);
  };
  
  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (error, req, res, next) => {
  // Log the error
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle known error types
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
      APIResponse.error({
        code: error.code,
        message: error.message,
        details: error.details
      }, {
        requestId: req.requestId
      })
    );
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json(
      APIResponse.error({
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      }, {
        requestId: req.requestId
      })
    );
  }

  // Handle database errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return res.status(503).json(
      APIResponse.error({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database service is temporarily unavailable'
      }, {
        requestId: req.requestId
      })
    );
  }

  // Default server error
  res.status(500).json(
    APIResponse.error({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }, {
      requestId: req.requestId
    })
  );
};
