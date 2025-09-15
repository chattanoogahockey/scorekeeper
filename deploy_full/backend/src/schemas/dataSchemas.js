/**
 * Gold Standard Data Schemas for CosmosDB Containers
 * NO FALLBACKS - Source of truth field definitions
 */

/**
 * Games Container Schema
 */
export const GAMES_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  homeTeam: { type: 'string', required: true },
  awayTeam: { type: 'string', required: true },
  gameDate: { type: 'string', required: true }, // YYYY-MM-DD format
  gameTime: { type: 'string', required: true }, // HH:MM format
  division: { type: 'string', required: true },
  season: { type: 'string', required: true },
  year: { type: 'number', required: true },
  
  // Optional fields
  week: { type: 'number', required: false },
  status: { type: 'string', required: false, default: 'Scheduled' },
  venue: { type: 'string', required: false },
  rink: { type: 'string', required: false },
  
  // Game statistics (aggregated totals)
  homeTeamGoals: { type: 'number', required: false, default: 0 },
  awayTeamGoals: { type: 'number', required: false, default: 0 },
  homeTeamShots: { type: 'number', required: false, default: 0 },
  awayTeamShots: { type: 'number', required: false, default: 0 },
  
  // System fields
  createdAt: { type: 'string', required: true }, // ISO string
  updatedAt: { type: 'string', required: true }  // ISO string
};

/**
 * Rosters Container Schema
 */
export const ROSTERS_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  teamName: { type: 'string', required: true },
  division: { type: 'string', required: true },
  season: { type: 'string', required: true },
  year: { type: 'number', required: true },
  players: { type: 'array', required: true },
  
  // System fields
  createdAt: { type: 'string', required: true },
  updatedAt: { type: 'string', required: true }
};

/**
 * Goals Container Schema
 */
export const GOALS_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  gameId: { type: 'string', required: true }, // Foreign key to games.id
  teamName: { type: 'string', required: true },
  playerName: { type: 'string', required: true },
  period: { type: 'number', required: true },
  time: { type: 'string', required: true }, // MM:SS format
  
  // Optional fields
  assist1: { type: 'string', required: false },
  assist2: { type: 'string', required: false },
  shotType: { type: 'string', required: false },
  goalType: { type: 'string', required: false }, // Even Strength, Power Play, Short Handed, etc.
  
  // System fields
  createdAt: { type: 'string', required: true }
};

/**
 * Penalties Container Schema
 */
export const PENALTIES_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  gameId: { type: 'string', required: true }, // Foreign key to games.id
  teamName: { type: 'string', required: true },
  playerName: { type: 'string', required: true },
  penaltyType: { type: 'string', required: true },
  period: { type: 'number', required: true },
  time: { type: 'string', required: true }, // MM:SS format
  
  // Optional fields
  duration: { type: 'number', required: false, default: 2 }, // Minutes
  severity: { type: 'string', required: false }, // Minor, Major, Misconduct
  
  // System fields
  createdAt: { type: 'string', required: true }
};

/**
 * Attendance Container Schema
 */
export const ATTENDANCE_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  gameId: { type: 'string', required: true }, // Foreign key to games.id
  teamName: { type: 'string', required: true },
  playersPresent: { type: 'array', required: true },
  
  // Optional fields
  totalRosterSize: { type: 'number', required: false },
  
  // System fields
  createdAt: { type: 'string', required: true }
};

/**
 * Player Stats Container Schema
 */
export const PLAYER_STATS_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  gameId: { type: 'string', required: true }, // Foreign key to games.id
  teamName: { type: 'string', required: true },
  playerName: { type: 'string', required: true },
  
  // Statistics fields
  goals: { type: 'number', required: false, default: 0 },
  assists: { type: 'number', required: false, default: 0 },
  points: { type: 'number', required: false, default: 0 },
  penaltyMinutes: { type: 'number', required: false, default: 0 },
  shots: { type: 'number', required: false, default: 0 },
  
  // System fields
  createdAt: { type: 'string', required: true }
};

/**
 * Shots on Goal Container Schema
 */
export const SHOTS_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  gameId: { type: 'string', required: true }, // Foreign key to games.id
  
  // Team shot counts by period
  homeTeamShots: { type: 'object', required: true }, // { period1: 5, period2: 3, period3: 7 }
  awayTeamShots: { type: 'object', required: true }, // { period1: 4, period2: 6, period3: 5 }
  
  // System fields
  createdAt: { type: 'string', required: true },
  updatedAt: { type: 'string', required: true }
};

/**
 * OT/Shootout Container Schema
 */
export const OT_SHOOTOUT_SCHEMA = {
  // Required fields
  id: { type: 'string', required: true },
  gameId: { type: 'string', required: true }, // Foreign key to games.id
  type: { type: 'string', required: true }, // 'overtime' or 'shootout'
  
  // Result fields
  winningTeam: { type: 'string', required: true },
  losingTeam: { type: 'string', required: true },
  
  // Shootout specific fields (optional for overtime)
  shootoutRounds: { type: 'array', required: false },
  
  // System fields
  createdAt: { type: 'string', required: true }
};

/**
 * Get schema for container
 * @param {string} containerName - Container name
 * @returns {Object} Schema definition
 */
export function getSchemaForContainer(containerName) {
  const schemas = {
    'games': GAMES_SCHEMA,
    'rosters': ROSTERS_SCHEMA,
    'goals': GOALS_SCHEMA,
    'penalties': PENALTIES_SCHEMA,
    'attendance': ATTENDANCE_SCHEMA,
    'player-stats': PLAYER_STATS_SCHEMA,
    'shots-on-goal': SHOTS_SCHEMA,
    'ot-shootout': OT_SHOOTOUT_SCHEMA
  };
  
  return schemas[containerName];
}

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} Validation result
 */
export function validateData(data, schema) {
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
 * Status enum for games
 */
export const GAME_STATUS = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  POSTPONED: 'Postponed'
};

/**
 * Division enum
 */
export const DIVISIONS = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum'
};

/**
 * Season enum
 */
export const SEASONS = {
  FALL: 'Fall',
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer'
};
