// Import config with fallback
let config;
try {
  const configModule = await import('./src/config/index.js');
  config = configModule.config || configModule.default;
} catch (error) {
  // Fallback for missing config
  config = {
    isProduction: process.env.NODE_ENV === 'production',
    env: process.env.NODE_ENV || 'development'
  };
}

/**
 * Structured logger for Hockey Scorekeeper API
 * Provides consistent logging with request IDs and structured data
 */
class Logger {
  constructor() {
    this.isProduction = config.isProduction;
    this.shouldLog = config.env !== 'production' || config.logging?.enabled;
    this.logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'info' : 'debug');
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLogLevel(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Sanitize log data to prevent sensitive information leakage
   */
  sanitize(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Format structured log message
   */
  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...this.sanitize(metadata)
    };

    if (!this.shouldLog) {
      return logEntry;
    }

    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
      debug: '🔍'
    }[level] || 'ℹ️';

    if (this.isProduction) {
      // Production: JSON format for log aggregation
      console.log(JSON.stringify(logEntry));
    } else {
      // Development: Human-readable format
      const metaStr = Object.keys(metadata).length > 0
        ? ` | ${JSON.stringify(this.sanitize(metadata))}`
        : '';
      console.log(`${emoji} [${timestamp}] ${message}${metaStr}`);
    }

    return logEntry;
  }

  info(message, metadata = {}) {
    if (this.shouldLogLevel('info')) {
      return this.formatMessage('info', message, metadata);
    }
  }

  warn(message, metadata = {}) {
    if (this.shouldLogLevel('warn')) {
      return this.formatMessage('warn', message, metadata);
    }
  }

  error(message, metadata = {}) {
    if (this.shouldLogLevel('error')) {
      return this.formatMessage('error', message, metadata);
    }
  }

  success(message, metadata = {}) {
    if (this.shouldLogLevel('info')) {
      return this.formatMessage('success', message, metadata);
    }
  }

  debug(message, metadata = {}) {
    if (this.shouldLogLevel('debug')) {
      return this.formatMessage('debug', message, metadata);
    }
  }

  /**
   * Create request-specific logger with request ID
   */
  withRequest(req) {
    const requestId = req.requestId || this.generateRequestId();
    req.requestId = requestId;

    return {
      info: (message, metadata = {}) => this.info(message, { requestId, ...metadata }),
      warn: (message, metadata = {}) => this.warn(message, { requestId, ...metadata }),
      error: (message, metadata = {}) => this.error(message, { requestId, ...metadata }),
      success: (message, metadata = {}) => this.success(message, { requestId, ...metadata }),
      debug: (message, metadata = {}) => this.debug(message, { requestId, ...metadata })
    };
  }

  /**
   * Log API usage metrics
   */
  logApiMetrics(endpoint, method, statusCode, duration, metadata = {}) {
    this.info('API Request', {
      endpoint,
      method,
      statusCode,
      duration: `${duration}ms`,
      ...metadata
    });
  }

  /**
   * Log TTS usage for monitoring
   */
  logTtsUsage(voice, provider, gameId, metadata = {}) {
    this.info('TTS Usage', {
      voice,
      provider,
      gameId,
      ...metadata
    });
  }

  /**
   * Log security events for monitoring
   */
  logSecurityEvent(eventType, metadata = {}) {
    this.warn(`Security Event: ${eventType}`, {
      security: true,
      eventType,
      ...metadata
    });
  }

  /**
   * Log announcer service availability
   */
  logAnnouncerAvailability(available, features = []) {
    if (available) {
      this.success('Announcer service loaded', { features });
    } else {
      this.warn('Announcer service not available', {
        impact: 'Voice announcements disabled',
        fallback: 'Text-only mode available'
      });
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
