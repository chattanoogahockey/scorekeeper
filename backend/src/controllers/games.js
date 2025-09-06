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
    const { division = 'all', gameId, rid } = req.query;
    const requestId = rid || req.requestId || Math.random().toString(36).substr(2, 9);

    logger.info('Fetching games', { division, gameId, requestId });

    const games = await DatabaseService.getGames({
      division: division.toLowerCase(),
      gameId
    });

    const response = {
      success: true,
      games,
      meta: {
        count: games.length,
        division,
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    res.json(gameId ? games : response);
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
