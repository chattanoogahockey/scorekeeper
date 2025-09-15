/**
 * Runtime validation utilities for Hockey Scorekeeper data schemas
 * Provides validation functions for JSON data integrity and type checking
 */

import { ValidationError } from '../types/schemas.js';

/**
 * Validation utility class for data schema validation
 */
export class SchemaValidator {
  /**
   * Validate a Game object
   * @param {any} data - Data to validate
   * @returns {ValidationResult} Validation result
   */
  static validateGame(data) {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object') {
      errors.push('Game data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['id', 'homeTeam', 'awayTeam', 'gameDate', 'gameTime', 'division', 'season', 'year', 'createdAt', 'updatedAt'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (data.id && typeof data.id !== 'string') errors.push('Game id must be a string');
    if (data.homeTeam && typeof data.homeTeam !== 'string') errors.push('Game homeTeam must be a string');
    if (data.awayTeam && typeof data.awayTeam !== 'string') errors.push('Game awayTeam must be a string');
    if (data.gameDate && !this.isValidDateString(data.gameDate)) errors.push('Game gameDate must be in YYYY-MM-DD format');
    if (data.gameTime && !this.isValidTimeString(data.gameTime)) errors.push('Game gameTime must be in HH:MM format');
    if (data.division && typeof data.division !== 'string') errors.push('Game division must be a string');
    if (data.season && typeof data.season !== 'string') errors.push('Game season must be a string');
    if (data.year && typeof data.year !== 'number') errors.push('Game year must be a number');

    // Optional field validations
    if (data.status && typeof data.status !== 'string') errors.push('Game status must be a string');
    if (data.homeTeamGoals && typeof data.homeTeamGoals !== 'number') errors.push('Game homeTeamGoals must be a number');
    if (data.awayTeamGoals && typeof data.awayTeamGoals !== 'number') errors.push('Game awayTeamGoals must be a number');

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a Goal object
   * @param {any} data - Data to validate
   * @returns {ValidationResult} Validation result
   */
  static validateGoal(data) {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object') {
      errors.push('Goal data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['id', 'gameId', 'teamName', 'playerName', 'period', 'time', 'createdAt'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (data.id && typeof data.id !== 'string') errors.push('Goal id must be a string');
    if (data.gameId && typeof data.gameId !== 'string') errors.push('Goal gameId must be a string');
    if (data.teamName && typeof data.teamName !== 'string') errors.push('Goal teamName must be a string');
    if (data.playerName && typeof data.playerName !== 'string') errors.push('Goal playerName must be a string');
    if (data.period && typeof data.period !== 'number') errors.push('Goal period must be a number');
    if (data.time && !this.isValidTimeString(data.time)) errors.push('Goal time must be in MM:SS format');

    // Optional field validations
    if (data.assist1 && typeof data.assist1 !== 'string') errors.push('Goal assist1 must be a string');
    if (data.assist2 && typeof data.assist2 !== 'string') errors.push('Goal assist2 must be a string');
    if (data.shotType && !['wrist', 'slap', 'snap', 'backhand'].includes(data.shotType)) {
      errors.push('Goal shotType must be one of: wrist, slap, snap, backhand');
    }
    if (data.goalType && !['regular', 'power-play', 'short-handed', 'penalty-shot', 'empty-net'].includes(data.goalType)) {
      errors.push('Goal goalType must be one of: regular, power-play, short-handed, penalty-shot, empty-net');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a Penalty object
   * @param {any} data - Data to validate
   * @returns {ValidationResult} Validation result
   */
  static validatePenalty(data) {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object') {
      errors.push('Penalty data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['id', 'gameId', 'teamName', 'playerName', 'penaltyType', 'period', 'time', 'createdAt'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (data.id && typeof data.id !== 'string') errors.push('Penalty id must be a string');
    if (data.gameId && typeof data.gameId !== 'string') errors.push('Penalty gameId must be a string');
    if (data.teamName && typeof data.teamName !== 'string') errors.push('Penalty teamName must be a string');
    if (data.playerName && typeof data.playerName !== 'string') errors.push('Penalty playerName must be a string');
    if (data.penaltyType && typeof data.penaltyType !== 'string') errors.push('Penalty penaltyType must be a string');
    if (data.period && typeof data.period !== 'number') errors.push('Penalty period must be a number');
    if (data.time && !this.isValidTimeString(data.time)) errors.push('Penalty time must be in MM:SS format');

    // Optional field validations
    if (data.duration && typeof data.duration !== 'number') errors.push('Penalty duration must be a number');
    if (data.severity && typeof data.severity !== 'string') errors.push('Penalty severity must be a string');

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate an Attendance object
   * @param {any} data - Data to validate
   * @returns {ValidationResult} Validation result
   */
  static validateAttendance(data) {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object') {
      errors.push('Attendance data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['id', 'gameId', 'teamName', 'playersPresent', 'createdAt'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (data.id && typeof data.id !== 'string') errors.push('Attendance id must be a string');
    if (data.gameId && typeof data.gameId !== 'string') errors.push('Attendance gameId must be a string');
    if (data.teamName && typeof data.teamName !== 'string') errors.push('Attendance teamName must be a string');
    if (data.playersPresent && !Array.isArray(data.playersPresent)) {
      errors.push('Attendance playersPresent must be an array');
    } else if (data.playersPresent) {
      for (let i = 0; i < data.playersPresent.length; i++) {
        if (typeof data.playersPresent[i] !== 'string') {
          errors.push(`Attendance playersPresent[${i}] must be a string`);
        }
      }
    }

    // Optional field validations
    if (data.totalRosterSize && typeof data.totalRosterSize !== 'number') {
      errors.push('Attendance totalRosterSize must be a number');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a Player object
   * @param {any} data - Data to validate
   * @returns {ValidationResult} Validation result
   */
  static validatePlayer(data) {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object') {
      errors.push('Player data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['id', 'name', 'number', 'position', 'teamName', 'division', 'season', 'year', 'createdAt', 'updatedAt'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (data.id && typeof data.id !== 'string') errors.push('Player id must be a string');
    if (data.name && typeof data.name !== 'string') errors.push('Player name must be a string');
    if (data.number && typeof data.number !== 'string') errors.push('Player number must be a string');
    if (data.position && !['Forward', 'Defense', 'Goalie'].includes(data.position)) {
      errors.push('Player position must be one of: Forward, Defense, Goalie');
    }
    if (data.teamName && typeof data.teamName !== 'string') errors.push('Player teamName must be a string');
    if (data.division && typeof data.division !== 'string') errors.push('Player division must be a string');
    if (data.season && typeof data.season !== 'string') errors.push('Player season must be a string');
    if (data.year && typeof data.year !== 'number') errors.push('Player year must be a number');

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate an array of objects against a schema
   * @param {any[]} dataArray - Array of data objects to validate
   * @param {function} validatorFn - Validation function to use
   * @returns {ValidationResult} Validation result
   */
  static validateArray(dataArray, validatorFn) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(dataArray)) {
      errors.push('Data must be an array');
      return { isValid: false, errors, warnings };
    }

    dataArray.forEach((item, index) => {
      const result = validatorFn(item);
      if (!result.isValid) {
        errors.push(`Item ${index}: ${result.errors.join(', ')}`);
      }
      if (result.warnings.length > 0) {
        warnings.push(`Item ${index}: ${result.warnings.join(', ')}`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Helper method to validate date string format (YYYY-MM-DD)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} Whether the date string is valid
   */
  static isValidDateString(dateString) {
    if (typeof dateString !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
  }

  /**
   * Helper method to validate time string format (HH:MM or MM:SS)
   * @param {string} timeString - Time string to validate
   * @returns {boolean} Whether the time string is valid
   */
  static isValidTimeString(timeString) {
    if (typeof timeString !== 'string') return false;
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(timeString)) return false;

    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59;
  }

  /**
   * Validate data and throw ValidationError if invalid
   * @param {any} data - Data to validate
   * @param {function} validatorFn - Validation function to use
   * @param {string} [context] - Context for error message
   * @throws {ValidationError} If validation fails
   */
  static validateOrThrow(data, validatorFn, context = 'data') {
    const result = validatorFn(data);
    if (!result.isValid) {
      throw new ValidationError(`Validation failed for ${context}: ${result.errors.join(', ')}`);
    }
  }
}

/**
 * Data integrity checker for JSON file validation
 */
export class DataIntegrityChecker {
  /**
   * Check integrity of games data
   * @param {Game[]} games - Games data to check
   * @returns {ValidationResult} Integrity check result
   */
  static checkGamesIntegrity(games) {
    const result = SchemaValidator.validateArray(games, SchemaValidator.validateGame);
    const warnings = [...result.warnings];

    // Additional integrity checks
    const gameIds = new Set();
    const duplicateIds = [];

    games.forEach((game, index) => {
      if (gameIds.has(game.id)) {
        duplicateIds.push(`Game ${index} has duplicate ID: ${game.id}`);
      } else {
        gameIds.add(game.id);
      }
    });

    if (duplicateIds.length > 0) {
      result.errors.push(...duplicateIds);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Check integrity of goals data
   * @param {Goal[]} goals - Goals data to check
   * @param {string[]} validGameIds - Valid game IDs for reference checking
   * @returns {ValidationResult} Integrity check result
   */
  static checkGoalsIntegrity(goals, validGameIds = []) {
    const result = SchemaValidator.validateArray(goals, SchemaValidator.validateGoal);
    const warnings = [...result.warnings];

    // Check for invalid game references
    const invalidRefs = [];
    goals.forEach((goal, index) => {
      if (!validGameIds.includes(goal.gameId)) {
        invalidRefs.push(`Goal ${index} references invalid game ID: ${goal.gameId}`);
      }
    });

    if (invalidRefs.length > 0) {
      result.errors.push(...invalidRefs);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Check integrity of players data
   * @param {Player[]} players - Players data to check
   * @returns {ValidationResult} Integrity check result
   */
  static checkPlayersIntegrity(players) {
    const result = SchemaValidator.validateArray(players, SchemaValidator.validatePlayer);
    const warnings = [...result.warnings];

    // Additional integrity checks
    const playerIds = new Set();
    const duplicateIds = [];

    players.forEach((player, index) => {
      if (playerIds.has(player.id)) {
        duplicateIds.push(`Player ${index} has duplicate ID: ${player.id}`);
      } else {
        playerIds.add(player.id);
      }
    });

    if (duplicateIds.length > 0) {
      result.errors.push(...duplicateIds);
      result.isValid = false;
    }

    return result;
  }
}