/**
 * JSON Data Management Utilities
 * Handles deterministic naming, file operations, and data validation
 */

/**
 * Generate deterministic game filename
 * Format: YYYYMMDD_game-<league>-<id>.json
 * @param {string} gameDate - Date in YYYY-MM-DD format
 * @param {string} league - League/division identifier
 * @param {string} gameId - Unique game identifier
 * @returns {string} Deterministic filename
 */
export function generateGameFilename(gameDate, league, gameId) {
  // Convert date format from YYYY-MM-DD to YYYYMMDD
  const datePart = gameDate.replace(/-/g, '');

  // Sanitize league name (remove spaces, special chars)
  const sanitizedLeague = league.toLowerCase().replace(/[^a-z0-9]/g, '');

  return `${datePart}_game-${sanitizedLeague}-${gameId}.json`;
}

/**
 * Generate deterministic game ID
 * Format: YYYYMMDD_<league>_<sequentialId>
 * @param {string} gameDate - Date in YYYY-MM-DD format
 * @param {string} league - League/division identifier
 * @param {number} sequentialId - Sequential ID for the day/league
 * @returns {string} Deterministic game ID
 */
export function generateGameId(gameDate, league, sequentialId) {
  // Convert date format from YYYY-MM-DD to YYYYMMDD
  const datePart = gameDate.replace(/-/g, '');

  // Sanitize league name
  const sanitizedLeague = league.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Pad sequential ID to 3 digits
  const paddedId = sequentialId.toString().padStart(3, '0');

  return `${datePart}_${sanitizedLeague}_${paddedId}`;
}

/**
 * Parse game filename to extract metadata
 * @param {string} filename - Game filename
 * @returns {Object} Parsed metadata
 */
export function parseGameFilename(filename) {
  // Remove .json extension if present
  const baseName = filename.replace(/\.json$/, '');

  // Match pattern: YYYYMMDD_game-<league>-<id>
  const match = baseName.match(/^(\d{8})_game-([a-z0-9]+)-(.+)$/);

  if (!match) {
    throw new Error(`Invalid game filename format: ${filename}`);
  }

  const [, datePart, league, gameId] = match;

  // Convert YYYYMMDD back to YYYY-MM-DD
  const gameDate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;

  return {
    gameDate,
    league,
    gameId,
    filename: baseName
  };
}

/**
 * Validate JSON data against schema
 * @param {Object} data - JSON data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result
 */
export function validateJsonData(data, schema) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    if (fieldConfig.required && !(fieldName in data)) {
      errors.push(`Missing required field: ${fieldName}`);
    }

    if (fieldName in data) {
      const value = data[fieldName];
      const expectedType = fieldConfig.type;

      // Type validation
      if (expectedType === 'string' && typeof value !== 'string') {
        errors.push(`Field ${fieldName} must be a string, got ${typeof value}`);
      } else if (expectedType === 'number' && typeof value !== 'number') {
        errors.push(`Field ${fieldName} must be a number, got ${typeof value}`);
      } else if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Field ${fieldName} must be an array, got ${typeof value}`);
      } else if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
        errors.push(`Field ${fieldName} must be an object, got ${typeof value}`);
      }
    }
  }

  // Check for unexpected fields
  for (const fieldName of Object.keys(data)) {
    if (!(fieldName in schema) && !fieldName.startsWith('_')) {
      warnings.push(`Unexpected field: ${fieldName}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate sample JSON data for a schema
 * @param {Object} schema - Schema definition
 * @returns {Object} Sample data object
 */
export function generateSampleData(schema) {
  const sample = {};

  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    if (fieldConfig.default !== undefined) {
      sample[fieldName] = fieldConfig.default;
    } else if (fieldConfig.required) {
      // Generate sample values based on type
      switch (fieldConfig.type) {
        case 'string':
          sample[fieldName] = `sample_${fieldName}`;
          break;
        case 'number':
          sample[fieldName] = 1;
          break;
        case 'array':
          sample[fieldName] = [];
          break;
        case 'object':
          sample[fieldName] = {};
          break;
        default:
          sample[fieldName] = null;
      }
    }
  }

  return sample;
}

/**
 * Check if JSON file contains sensitive data
 * @param {Object} data - JSON data to check
 * @returns {Array} Array of security issues found
 */
export function auditForSecrets(data) {
  const issues = [];
  const jsonString = JSON.stringify(data).toLowerCase();

  // Check for common secret patterns
  const secretPatterns = [
    /private[_-]?key/i,
    /secret[_-]?key/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
    /auth[_-]?token/i,
    /password/i,
    /credential/i,
    /-----begin.*private.*key-----/i,
    /-----begin.*certificate-----/i
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(jsonString)) {
      issues.push(`Potential secret detected matching pattern: ${pattern}`);
    }
  }

  return issues;
}