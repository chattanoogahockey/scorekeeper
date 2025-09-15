/**
 * JSDoc type definitions for Hockey Scorekeeper JSON schemas
 * Provides type safety documentation for data validation and development
 */

/**
 * @typedef {Object} Game
 * @property {string} id - Unique game identifier
 * @property {string} homeTeam - Home team name
 * @property {string} awayTeam - Away team name
 * @property {string} gameDate - Game date in YYYY-MM-DD format
 * @property {string} gameTime - Game time in HH:MM format
 * @property {string} division - Division name
 * @property {string} season - Season name
 * @property {number} year - Season year
 * @property {string} [status] - Game status
 * @property {number} [homeTeamGoals] - Home team goals scored
 * @property {number} [awayTeamGoals] - Away team goals scored
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} GameCreate
 * @property {string} homeTeam - Home team name
 * @property {string} awayTeam - Away team name
 * @property {string} gameDate - Game date in YYYY-MM-DD format
 * @property {string} gameTime - Game time in HH:MM format
 * @property {string} division - Division name
 * @property {string} season - Season name
 * @property {number} year - Season year
 */

/**
 * @typedef {Object} Goal
 * @property {string} id - Unique goal identifier
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Scoring team name
 * @property {string} playerName - Goal scorer name
 * @property {number} period - Game period (1, 2, 3, or OT)
 * @property {string} time - Goal time in MM:SS format
 * @property {string} [assist1] - First assist player name
 * @property {string} [assist2] - Second assist player name
 * @property {string} [shotType] - Type of shot (wrist, slap, snap, backhand)
 * @property {string} [goalType] - Type of goal (regular, power-play, short-handed, penalty-shot, empty-net)
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} GoalCreate
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Scoring team name
 * @property {string} playerName - Goal scorer name
 * @property {number} period - Game period
 * @property {string} time - Goal time in MM:SS format
 * @property {string} [assist1] - First assist player name
 * @property {string} [assist2] - Second assist player name
 * @property {string} [shotType] - Type of shot
 * @property {string} [goalType] - Type of goal
 */

/**
 * @typedef {Object} Penalty
 * @property {string} id - Unique penalty identifier
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Penalized team name
 * @property {string} playerName - Penalized player name
 * @property {string} penaltyType - Type of penalty
 * @property {number} period - Game period
 * @property {string} time - Penalty time in MM:SS format
 * @property {number} [duration] - Penalty duration in minutes
 * @property {string} [severity] - Penalty severity
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} PenaltyCreate
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Penalized team name
 * @property {string} playerName - Penalized player name
 * @property {string} penaltyType - Type of penalty
 * @property {number} period - Game period
 * @property {string} time - Penalty time in MM:SS format
 * @property {number} [duration] - Penalty duration in minutes
 * @property {string} [severity] - Penalty severity
 */

/**
 * @typedef {Object} Attendance
 * @property {string} id - Unique attendance record identifier
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Team name
 * @property {string[]} playersPresent - Array of player names present
 * @property {number} [totalRosterSize] - Total roster size
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} AttendanceCreate
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Team name
 * @property {string[]} playersPresent - Array of player names present
 * @property {number} [totalRosterSize] - Total roster size
 */

/**
 * @typedef {Object} PlayerStats
 * @property {string} id - Unique stats record identifier
 * @property {string} gameId - Associated game ID
 * @property {string} teamName - Team name
 * @property {string} playerName - Player name
 * @property {number} goals - Goals scored
 * @property {number} assists - Assists made
 * @property {number} points - Total points (goals + assists)
 * @property {number} penaltyMinutes - Penalty minutes
 * @property {number} shots - Shots on goal
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} Player
 * @property {string} id - Unique player identifier
 * @property {string} name - Player full name
 * @property {string} number - Jersey number
 * @property {string} position - Player position (Forward, Defense, Goalie)
 * @property {string} teamName - Team name
 * @property {string} division - Division name
 * @property {string} season - Season name
 * @property {number} year - Season year
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} Roster
 * @property {string} id - Unique roster identifier
 * @property {string} teamName - Team name
 * @property {string} division - Division name
 * @property {string} season - Season name
 * @property {number} year - Season year
 * @property {Player[]} players - Array of players on roster
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} DashboardSummary
 * @property {number} totalGames - Total number of games
 * @property {number} totalGoals - Total goals scored across all games
 * @property {number} totalPenalties - Total penalties across all games
 * @property {Object.<string, number>} gamesByDivision - Games count by division
 * @property {Game[]} recentGames - Array of recent games
 * @property {Array.<{playerName: string, goals: number, assists: number, points: number}>} topScorers - Top scoring players
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message if unsuccessful
 * @property {string} [message] - Additional message
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success - Whether the request was successful
 * @property {Array} [data] - Array of response data
 * @property {string} [error] - Error message if unsuccessful
 * @property {string} [message] - Additional message
 * @property {Object} pagination - Pagination information
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of items
 * @property {number} pagination.totalPages - Total number of pages
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of validation error messages
 * @property {string[]} [warnings] - Array of validation warning messages
 */

/**
 * @typedef {Object} FormField
 * @property {string} name - Field name
 * @property {*} value - Field value
 * @property {boolean} [required] - Whether field is required
 * @property {function(*): ValidationResult} [validator] - Validation function
 */

/**
 * @typedef {Object} GameSelectorProps
 * @property {function(Game): void} onGameSelect - Callback when game is selected
 * @property {Game} [selectedGame] - Currently selected game
 * @property {string} [filterByDivision] - Division filter
 */

/**
 * @typedef {Object} GoalFormProps
 * @property {string} gameId - Game ID for the goal
 * @property {function(Goal): void} onGoalAdded - Callback when goal is added
 * @property {Player[]} availablePlayers - Available players for selection
 */

/**
 * @typedef {Object} AttendanceTrackerProps
 * @property {Game} game - Game object
 * @property {Player[]} roster - Team roster
 * @property {function(Attendance): void} onAttendanceUpdate - Callback when attendance is updated
 */

/**
 * @typedef {'Gold'|'Silver'|'Bronze'|'Platinum'} Division
 */

/**
 * @typedef {'Fall'|'Winter'|'Spring'|'Summer'} Season
 */

/**
 * @typedef {'Forward'|'Defense'|'Goalie'} Position
 */

/**
 * @typedef {'wrist'|'slap'|'snap'|'backhand'} ShotType
 */

/**
 * @typedef {'regular'|'power-play'|'short-handed'|'penalty-shot'|'empty-net'} GoalType
 */

/**
 * Custom Error Classes for better error handling
 */
export class ValidationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [field] - Field that caused the error
   */
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

export class DataLoadError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [fileName] - File that failed to load
   */
  constructor(message, fileName) {
    super(message);
    this.name = 'DataLoadError';
    this.fileName = fileName;
  }
}