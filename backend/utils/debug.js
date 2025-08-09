/**
 * Debug utility for production-ready logging
 * Only logs debug messages in development mode or when DEBUG flag is set
 */

const isDebugEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

export function debugLog(...args) {
  if (isDebugEnabled) {
    console.log(...args);
  }
}

export function debugInfo(...args) {
  if (isDebugEnabled) {
    console.info(...args);
  }
}

export function debugWarn(...args) {
  if (isDebugEnabled) {
    console.warn(...args);
  }
}

// Always show errors and warnings in production
export function errorLog(...args) {
  console.error(...args);
}

export function warnLog(...args) {
  console.warn(...args);
}

export function infoLog(...args) {
  console.info(...args);
}
