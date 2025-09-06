import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';
import { ROSTERS_SCHEMA, DIVISIONS, SEASONS } from '../schemas/dataSchemas.js';

/**
 * Rosters controller for handling roster-related endpoints
 */
export class RostersController {
  /**
   * Get rosters with optional filtering
   */
  static getRosters = asyncHandler(async (req, res) => {
    const { gameId, teamName, season, division } = req.query;

    logger.info('Fetching rosters', { gameId, teamName, season, division });

    try {
      const rosters = await DatabaseService.getRosters({
        gameId,
        teamName,
        season,
        division
      });

      res.json(rosters);
    } catch (error) {
      logger.error('Error fetching rosters', { error: error.message, gameId, teamName, season, division });
      throw error;
    }
  });

  /**
   * Create a new roster with strict field validation
   */
  static createRoster = asyncHandler(async (req, res) => {
    const { teamName, season, division, players, year } = req.body;

    // Strict validation using schema requirements
    const requiredFields = ['teamName', 'season', 'division', 'players', 'year'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: requiredFields,
        missing: missingFields,
        received: Object.keys(req.body)
      });
    }

    // Validate division enum
    if (!Object.values(DIVISIONS).includes(division)) {
      return res.status(400).json({
        error: 'Invalid division',
        validDivisions: Object.values(DIVISIONS),
        received: division
      });
    }

    // Validate season enum
    if (!Object.values(SEASONS).includes(season)) {
      return res.status(400).json({
        error: 'Invalid season',
        validSeasons: Object.values(SEASONS),
        received: season
      });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        error: 'Players must be a non-empty array'
      });
    }

    // Generate ID using strict naming convention
    const rosterId = `${teamName.replace(/\s+/g, '_').toLowerCase()}_${season.toLowerCase()}_${year}`;

    const rosterData = {
      id: rosterId,
      teamName,
      season,
      year,
      division,
      players: players.map(player => ({
        name: player.name,
        firstName: player.firstName || player.name.split(' ')[0],
        lastName: player.lastName || player.name.split(' ').slice(1).join(' '),
        jerseyNumber: player.jerseyNumber,
        position: player.position || 'Player'
      }))
    };

    // Create roster using DatabaseService with schema validation
    const roster = await DatabaseService.create('rosters', rosterData);

    logger.info('Roster created', { rosterId, teamName });
    res.status(201).json(roster);
  });

  /**
   * Get a specific roster by ID
   */
  static getRosterById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const roster = await DatabaseService.getById('rosters', id);

    if (!roster) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    res.json(roster);
  });

  /**
   * Update a roster
   */
  static updateRoster = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const roster = await DatabaseService.update('rosters', id, updates);

    logger.info('Roster updated', { rosterId: id });
    res.json(roster);
  });

  /**
   * Delete a roster
   */
  static deleteRoster = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await DatabaseService.delete('rosters', id);

    logger.info('Roster deleted', { rosterId: id });
    res.json({ message: 'Roster deleted successfully' });
  });
}
