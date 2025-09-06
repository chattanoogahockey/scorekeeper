/**
 * Professional Input Validation Utilities
 */

import { GAME_STATUS, DIVISIONS, SEASONS } from '../schemas/dataSchemas.js';
import { ValidationError } from './apiResponse.js';

/**
 * Validation schema definitions
 */
const VALIDATION_SCHEMAS = {
  game: {
    homeTeam: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-\.]+$/
    },
    awayTeam: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-\.]+$/
    },
    gameDate: {
      type: 'string',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}$/
    },
    gameTime: {
      type: 'string',
      required: true,
      pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    division: {
      type: 'string',
      required: true,
      enum: Object.values(DIVISIONS)
    },
    season: {
      type: 'string',
      required: true,
      enum: Object.values(SEASONS)
    },
    year: {
      type: 'number',
      required: true,
      min: 2020,
      max: 2030
    },
    week: {
      type: 'number',
      required: false,
      min: 1,
      max: 52
    },
    status: {
      type: 'string',
      required: false,
      enum: Object.values(GAME_STATUS)
    },
    venue: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    rink: {
      type: 'string',
      required: false,
      maxLength: 50
    }
  },

  roster: {
    teamName: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50
    },
    division: {
      type: 'string',
      required: true,
      enum: Object.values(DIVISIONS)
    },
    season: {
      type: 'string',
      required: true,
      enum: Object.values(SEASONS)
    },
    year: {
      type: 'number',
      required: true,
      min: 2020,
      max: 2030
    },
    players: {
      type: 'array',
      required: true,
      minLength: 1,
      maxLength: 50,
      items: {
        type: 'object',
        properties: {
          playerId: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 20
          },
          name: {
            type: 'string',
            required: true,
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-Z\s\-\.]+$/
          },
          position: {
            type: 'string',
            required: true,
            enum: ['Forward', 'Defense', 'Goalie']
          }
        }
      }
    }
  },

  goal: {
    gameId: {
      type: 'string',
      required: true,
      minLength: 10
    },
    scoringTeam: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50
    },
    playerName: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-\.]+$/
    },
    period: {
      type: 'number',
      required: true,
      min: 1,
      max: 10
    },
    timeInPeriod: {
      type: 'string',
      required: true,
      pattern: /^([0-1]?[0-9]|2[0-0]):[0-5][0-9]$/
    },
    assist1: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-\.]+$/
    },
    assist2: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-\.]+$/
    },
    goalType: {
      type: 'string',
      required: false,
      enum: ['Even Strength', 'Power Play', 'Short Handed', 'Penalty Shot', 'Empty Net']
    }
  },

  penalty: {
    gameId: {
      type: 'string',
      required: true,
      minLength: 10
    },
    penalizedTeam: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50
    },
    playerName: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-\.]+$/
    },
    period: {
      type: 'number',
      required: true,
      min: 1,
      max: 10
    },
    timeInPeriod: {
      type: 'string',
      required: true,
      pattern: /^([0-1]?[0-9]|2[0-0]):[0-5][0-9]$/
    },
    penaltyType: {
      type: 'string',
      required: true,
      enum: ['Minor', 'Major', 'Misconduct', 'Game Misconduct', 'Match']
    },
    infraction: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 50
    },
    duration: {
      type: 'number',
      required: true,
      min: 2,
      max: 20
    }
  }
};

/**
 * Validate a single field
 */
function validateField(fieldName, value, schema) {
  const errors = [];
  
  // Check if required
  if (schema.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  // Skip further validation if field is not required and empty
  if (!schema.required && (value === undefined || value === null || value === '')) {
    return errors;
  }
  
  // Type validation
  if (schema.type === 'string' && typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
  } else if (schema.type === 'number' && typeof value !== 'number') {
    errors.push(`${fieldName} must be a number`);
  } else if (schema.type === 'array' && !Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
  } else if (schema.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
    errors.push(`${fieldName} must be an object`);
  }
  
  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${fieldName} must be at least ${schema.minLength} characters long`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${fieldName} must be no more than ${schema.maxLength} characters long`);
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(`${fieldName} has invalid format`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${schema.enum.join(', ')}`);
    }
  }
  
  // Number validations
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`${fieldName} must be at least ${schema.min}`);
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`${fieldName} must be no more than ${schema.max}`);
    }
  }
  
  // Array validations
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${fieldName} must have at least ${schema.minLength} items`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${fieldName} must have no more than ${schema.maxLength} items`);
    }
    
    // Validate array items
    if (schema.items) {
      value.forEach((item, index) => {
        if (schema.items.type === 'object' && schema.items.properties) {
          for (const [propName, propSchema] of Object.entries(schema.items.properties)) {
            const propErrors = validateField(`${fieldName}[${index}].${propName}`, item[propName], propSchema);
            errors.push(...propErrors);
          }
        }
      });
    }
  }
  
  return errors;
}

/**
 * Validate data against a schema
 */
export function validate(data, schemaName) {
  const schema = VALIDATION_SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(`Unknown validation schema: ${schemaName}`);
  }
  
  const errors = [];
  const warnings = [];
  
  // Validate each field in the schema
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldErrors = validateField(fieldName, data[fieldName], fieldSchema);
    errors.push(...fieldErrors);
  }
  
  // Check for unexpected fields
  for (const fieldName of Object.keys(data)) {
    if (!(fieldName in schema) && !fieldName.startsWith('_') && 
        fieldName !== 'id' && fieldName !== 'createdAt' && fieldName !== 'updatedAt') {
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
 * Validation middleware
 */
export function validateRequest(schemaName) {
  return (req, res, next) => {
    try {
      const validation = validate(req.body, schemaName);
      
      if (!validation.isValid) {
        throw new ValidationError('Validation failed', {
          errors: validation.errors,
          warnings: validation.warnings
        });
      }
      
      // Log warnings but don't fail the request
      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', {
          warnings: validation.warnings,
          requestId: req.requestId
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Sanitize input data
 */
export function sanitizeInput(data) {
  if (typeof data === 'string') {
    return data.trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
  
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  return data;
}

/**
 * Input sanitization middleware
 */
export const sanitizationMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
};
