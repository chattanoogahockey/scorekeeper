import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';
import { GAME_STATUS, DIVISIONS, SEASONS } from '../schemas/dataSchemas.js';

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

    const response = {
      success: true,
      games: enrichedGames,
      meta: {
        count: enrichedGames.length,
        division,
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    res.json(gameId ? enrichedGames : response);
  });

  /**
   * Get submitted games
   */
  static getSubmittedGames = asyncHandler(async (req, res) => {
    logger.info('Fetching submitted games');

    const submittedGames = await DatabaseService.getSubmittedGames();

    res.json(submittedGames);
  });

  /**
   * Create a new game with strict field validation
   */
  static createGame = asyncHandler(async (req, res) => {
    const gameData = req.body;

    // Enforce required fields for games schema
    const requiredFields = ['homeTeam', 'awayTeam', 'gameDate', 'gameTime', 'division', 'season', 'year'];
    const missingFields = requiredFields.filter(field => !gameData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: requiredFields,
        missing: missingFields,
        received: Object.keys(gameData)
      });
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

    // Validate status enum
    if (!Object.values(GAME_STATUS).includes(gameData.status)) {
      return res.status(400).json({
        error: 'Invalid game status',
        validStatuses: Object.values(GAME_STATUS),
        received: gameData.status
      });
    }

    // Validate division enum
    if (!Object.values(DIVISIONS).includes(gameData.division)) {
      return res.status(400).json({
        error: 'Invalid division',
        validDivisions: Object.values(DIVISIONS),
        received: gameData.division
      });
    }

    // Validate season enum
    if (!Object.values(SEASONS).includes(gameData.season)) {
      return res.status(400).json({
        error: 'Invalid season',
        validSeasons: Object.values(SEASONS),
        received: gameData.season
      });
    }

    // Create game (DatabaseService.create will handle schema validation and timestamps)
    const game = await DatabaseService.create('games', gameData);

    logger.info('Game created', { gameId: game.id });
    res.status(201).json(game);
  });

  /**
   * Get a specific game by ID
   */
  static getGameById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const game = await DatabaseService.getById('games', id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  });

  /**
   * Update a game
   */
  static updateGame = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const game = await DatabaseService.update('games', id, updates);

    logger.info('Game updated', { gameId: id });
    res.json(game);
  });

  /**
   * Delete a game
   */
  static deleteGame = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await DatabaseService.delete('games', id);

    logger.info('Game deleted', { gameId: id });
    res.json({ message: 'Game deleted successfully' });
  });
}
