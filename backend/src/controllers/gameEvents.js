import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';
import { GOALS_SCHEMA, PENALTIES_SCHEMA } from '../schemas/dataSchemas.js';

/**
 * Game Events controller for handling goals and penalties
 */
export class GameEventsController {
  /**
   * Get game events (goals and penalties)
   */
  static getGameEvents = asyncHandler(async (req, res) => {
    const { gameId, eventType } = req.query;

    logger.info('Fetching game events', { gameId, eventType });

    const events = await DatabaseService.getGameEvents({ gameId, eventType });

    res.json(events);
  });

  /**
   * Create a goal with strict field validation
   */
  static createGoal = asyncHandler(async (req, res) => {
    const {
      gameId,
      team,
      player,
      period,
      time,
      assist,
      shotType,
      goalType,
      breakaway,
      gameContext
    } = req.body;

    // Strict validation - use exact field names from schema
    const requiredFields = ['gameId', 'teamName', 'playerName', 'period', 'time'];
    const goalData = {
      gameId,
      teamName: team, // Map from request field to schema field
      playerName: player, // Map from request field to schema field
      period,
      time
    };

    // Check required fields
    const missingFields = requiredFields.filter(field => !goalData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: requiredFields,
        missing: missingFields,
        received: Object.keys(req.body)
      });
    }

    // Get game information for context
    const games = await DatabaseService.getGames({ gameId });
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = games[0];

    // Get existing goals for analytics
    const existingGoals = await DatabaseService.query('goals', {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.createdAt ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    });

    // Add optional fields and generate ID
    goalData.id = `${gameId}-goal-${Date.now()}`;
    if (assist) goalData.assist1 = assist;
    if (shotType) goalData.shotType = shotType;
    if (goalType) goalData.goalType = goalType;

    // Create goal using DatabaseService with schema validation
    const goal = await DatabaseService.create('goals', goalData);

    logger.info('Goal recorded', { goalId: goal.id, gameId, playerName: player, teamName: team });
    res.status(201).json(goal);
  });

  /**
   * Create a penalty
   */
  static createPenalty = asyncHandler(async (req, res) => {
    const {
      gameId,
      period,
      team,
      player,
      penaltyType,
      penaltyLength,
      time,
      details
    } = req.body;

    // Validation
    if (!gameId || !team || !player || !period || !time || !penaltyType || !penaltyLength) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['gameId', 'team', 'player', 'period', 'time', 'penaltyType', 'penaltyLength']
      });
    }

    // Get game information for context
    const games = await DatabaseService.getGames({ gameId });
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = games[0];

    // Get existing penalties for analytics
    const existingPenalties = await DatabaseService.query('penalties', {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    });

    const penaltyData = {
      id: `${gameId}-penalty-${Date.now()}`,
      gameId,
      period,
      division: game.division || 'Unknown',
      teamName: team,
      playerName: player,
      penaltyType,
      length: penaltyLength,
      timeRemaining: time,
      details: details || {},
      recordedAt: new Date().toISOString(),
      gameStatus: 'in-progress',
      analytics: {
        penaltySequenceNumber: existingPenalties.length + 1,
        totalPenaltiesInGame: existingPenalties.length + 1,
        gameSituation: period > 3 ? 'Overtime' : 'Regular',
        absoluteTimestamp: new Date().toISOString()
      }
    };

    const penalty = await DatabaseService.create('penalties', penaltyData);

    logger.info('Penalty recorded', { penaltyId: penalty.id, gameId, player, team, penaltyType });
    res.status(201).json(penalty);
  });

  /**
   * Handle deprecated game-events creation endpoint
   */
  static createGameEvent = asyncHandler(async (req, res) => {
    const { eventType } = req.body;

    return res.status(501).json({
      error: 'Use dedicated endpoints to create events',
      next: eventType === 'goal' ? '/api/goals' : eventType === 'penalty' ? '/api/penalties' : undefined,
      supported: ['/api/goals', '/api/penalties']
    });
  });
}
