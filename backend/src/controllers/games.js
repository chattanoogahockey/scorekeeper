import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';

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
   * Create a new game
   */
  static createGame = asyncHandler(async (req, res) => {
    const gameData = req.body;

    // Basic validation
    if (!gameData.homeTeam || !gameData.awayTeam) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['homeTeam', 'awayTeam'],
        received: Object.keys(gameData)
      });
    }

    // Generate ID if not provided
    if (!gameData.id) {
      gameData.id = `${gameData.homeTeam.replace(/\s+/g, '_')}_vs_${gameData.awayTeam.replace(/\s+/g, '_')}_${Date.now()}`;
    }

    // Add timestamps
    gameData.createdAt = new Date().toISOString();
    gameData.updatedAt = new Date().toISOString();

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
