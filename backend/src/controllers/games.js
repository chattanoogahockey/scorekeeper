import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';
import { GAME_STATUS, DIVISIONS, SEASONS } from '../schemas/dataSchemas.js';
import { APIResponse, NotFoundError, ValidationError, ConflictError } from '../utils/apiResponse.js';
import { validate, sanitizeInput } from '../utils/validation.js';

/**
 * Games controller for handling game-related endpoints
 */
export class GamesController {
  /**
   * Get games with optional filtering
   */
  static getGames = asyncHandler(async (req, res) => {
    const { division = 'all', gameId, rid, dateFrom, dateTo, includeUpcoming } = req.query;
    const requestId = rid || req.requestId || Math.random().toString(36).substr(2, 9);

    logger.info('Fetching games', { division, gameId, dateFrom, dateTo, includeUpcoming, requestId });

    // Validate query parameters
    const validationErrors = [];
    if (division !== 'all' && !Object.values(DIVISIONS).includes(division)) {
      validationErrors.push(`Invalid division: ${division}. Valid values: ${Object.values(DIVISIONS).join(', ')}`);
    }
    
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid query parameters', validationErrors);
    }

    // Calculate date range for upcoming games (today + 6 days) if includeUpcoming is true
    let filters = { division: division.toLowerCase(), gameId };
    
    if (includeUpcoming === 'true' && !dateFrom && !dateTo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 6); // 6 days from today
      endDate.setHours(23, 59, 59, 999); // End of day
      
      filters.dateFrom = today.toISOString();
      filters.dateTo = endDate.toISOString();
      
      logger.info('Using upcoming games filter', { 
        dateFrom: filters.dateFrom, 
        dateTo: filters.dateTo,
        requestId 
      });
    } else if (dateFrom || dateTo) {
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
    }

    const games = await DatabaseService.getGames(filters);

    // Enrich games with actual division information from rosters
    const enrichedGames = await Promise.all(games.map(async (game) => {
      try {
        // Only update division if it's currently "Unknown"
        if (game.division === 'Unknown' && game.homeTeam) {
          // Try to get division from home team roster
          const homeDivision = await DatabaseService.getTeamDivision(
            game.homeTeam, 
            game.season || 'Fall', 
            game.year || 2025
          );
          
          if (homeDivision !== 'Unknown') {
            game.division = homeDivision;
          } else if (game.awayTeam) {
            // If home team division not found, try away team
            const awayDivision = await DatabaseService.getTeamDivision(
              game.awayTeam, 
              game.season || 'Fall', 
              game.year || 2025
            );
            if (awayDivision !== 'Unknown') {
              game.division = awayDivision;
            }
          }
        }
        
        return game;
      } catch (error) {
        logger.warn('Failed to enrich game division', { 
          gameId: game.id, 
          error: error.message 
        });
        return game;
      }
    }));

    // Return single game or collection based on query
    if (gameId) {
      const game = enrichedGames[0];
      if (!game) {
        throw new NotFoundError(`Game with ID ${gameId} not found`);
      }
      return APIResponse.success(res, game, 'Game retrieved successfully', {
        gameId,
        requestId
      });
    }

    return APIResponse.success(res, enrichedGames, 'Games retrieved successfully', {
      count: enrichedGames.length,
      division,
      filters: Object.keys(filters).filter(key => filters[key] !== undefined),
      requestId
    });
  });

  /**
   * Get submitted games
   */
  static getSubmittedGames = asyncHandler(async (req, res) => {
    logger.info('Fetching submitted games');

    const submittedGames = await DatabaseService.getSubmittedGames();

    return APIResponse.success(res, submittedGames, 'Submitted games retrieved successfully', {
      count: submittedGames.length
    });
  });

  /**
   * Create a new game with strict field validation
   */
  static createGame = asyncHandler(async (req, res) => {
    // Sanitize input data
    const gameData = sanitizeInput(req.body);

    // Validate using our validation utility
    const validation = validate('game', gameData);
    if (!validation.isValid) {
      throw new ValidationError('Game validation failed', validation.errors);
    }

    // Generate ID if not provided (following standard pattern)
    if (!gameData.id) {
      const homeTeamSafe = gameData.homeTeam.replace(/\s+/g, '_').toLowerCase();
      const awayTeamSafe = gameData.awayTeam.replace(/\s+/g, '_').toLowerCase();
      gameData.id = `${gameData.season.toLowerCase()}_${gameData.year}_${homeTeamSafe}_vs_${awayTeamSafe}_${Date.now()}`;
    }

    // Set default status if not provided
    if (!gameData.status) {
      gameData.status = GAME_STATUS.SCHEDULED;
    }

    // Check for existing game with same teams, date, and time to prevent duplicates
    const existingGames = await DatabaseService.getGames({
      homeTeam: gameData.homeTeam,
      awayTeam: gameData.awayTeam,
      gameDate: gameData.gameDate,
      gameTime: gameData.gameTime
    });

    if (existingGames.length > 0) {
      throw new ConflictError('A game with the same teams, date, and time already exists');
    }

    // Create game (DatabaseService.create will handle schema validation and timestamps)
    const game = await DatabaseService.create('games', gameData);

    logger.info('Game created successfully', { 
      gameId: game.id, 
      homeTeam: game.homeTeam, 
      awayTeam: game.awayTeam,
      gameDate: game.gameDate
    });

    return APIResponse.success(res, game, 'Game created successfully', {
      gameId: game.id
    }, 201);
  });

  /**
   * Get a specific game by ID
   */
  static getGameById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('Game ID is required');
    }

    const game = await DatabaseService.getById('games', id);

    if (!game) {
      throw new NotFoundError(`Game with ID ${id} not found`);
    }

    return APIResponse.success(res, game, 'Game retrieved successfully', {
      gameId: id
    });
  });

  /**
   * Update a game
   */
  static updateGame = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = sanitizeInput(req.body);

    if (!id) {
      throw new ValidationError('Game ID is required');
    }

    // Validate update data if provided
    if (Object.keys(updates).length > 0) {
      const validation = validate('game', updates, { partial: true });
      if (!validation.isValid) {
        throw new ValidationError('Game update validation failed', validation.errors);
      }
    }

    // Check if game exists first
    const existingGame = await DatabaseService.getById('games', id);
    if (!existingGame) {
      throw new NotFoundError(`Game with ID ${id} not found`);
    }

    const game = await DatabaseService.update('games', id, updates);

    logger.info('Game updated successfully', { 
      gameId: id, 
      updatedFields: Object.keys(updates)
    });

    return APIResponse.success(res, game, 'Game updated successfully', {
      gameId: id,
      updatedFields: Object.keys(updates)
    });
  });

  /**
   * Delete a game
   */
  static deleteGame = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('Game ID is required');
    }

    // Check if game exists first
    const existingGame = await DatabaseService.getById('games', id);
    if (!existingGame) {
      throw new NotFoundError(`Game with ID ${id} not found`);
    }

    await DatabaseService.delete('games', id);

    logger.info('Game deleted successfully', { gameId: id });

    return APIResponse.success(res, null, 'Game deleted successfully', {
      gameId: id
    });
  });
}
