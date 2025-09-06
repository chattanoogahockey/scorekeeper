import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';

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
   * Create a goal
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

    // Validation
    if (!gameId || !team || !player || !period || !time) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['gameId', 'team', 'player', 'period', 'time']
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
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    });

    // Calculate analytics
    const goalSequenceNumber = existingGoals.length + 1;
    const homeGoals = existingGoals.filter(g => g.teamName === game.homeTeam).length;
    const awayGoals = existingGoals.filter(g => g.teamName === game.awayTeam).length;

    const goalData = {
      id: `${gameId}-goal-${Date.now()}`,
      eventType: 'goal',
      gameId,
      period,
      division: game.division || 'Unknown',
      teamName: team,
      playerName: player,
      assistedBy: assist ? [assist] : [],
      timeRemaining: time,
      shotType: shotType || 'Wrist Shot',
      goalType: goalType || 'even strength',
      breakaway: breakaway || false,
      recordedAt: new Date().toISOString(),
      gameStatus: 'in-progress',
      analytics: {
        goalSequenceNumber,
        scoreBeforeGoal: {
          [game.homeTeam]: game.homeTeam === team ? homeGoals : awayGoals,
          [game.awayTeam]: game.awayTeam === team ? homeGoals : awayGoals
        },
        scoreAfterGoal: {
          [game.homeTeam]: game.homeTeam === team ? homeGoals + 1 : awayGoals,
          [game.awayTeam]: game.awayTeam === team ? homeGoals : awayGoals + 1
        },
        totalGoalsInGame: goalSequenceNumber,
        gameSituation: period > 3 ? 'Overtime' : 'Regular',
        absoluteTimestamp: new Date().toISOString(),
        ...(gameContext || {})
      }
    };

    const goal = await DatabaseService.create('goals', goalData);

    logger.info('Goal recorded', { goalId: goal.id, gameId, player, team });
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
