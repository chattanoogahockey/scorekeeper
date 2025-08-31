import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';

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

    const rosters = await DatabaseService.getRosters({
      gameId,
      teamName,
      season,
      division
    });

    res.json(rosters);
  });

  /**
   * Create a new roster
   */
  static createRoster = asyncHandler(async (req, res) => {
    const { teamName, season, division, players } = req.body;

    // Validation
    if (!teamName || !season || !division || !players) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['teamName', 'season', 'division', 'players']
      });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        error: 'Players must be a non-empty array'
      });
    }

    // Parse season format
    const seasonParts = season.trim().split(/\s+/);
    const year = seasonParts[0];
    const seasonType = seasonParts[1] || 'Fall';

    // Generate ID
    const rosterId = `${teamName.replace(/\s+/g, '_').toLowerCase()}_${year}_${seasonType.toLowerCase()}`;

    const rosterData = {
      id: rosterId,
      teamName,
      season,
      year: parseInt(year),
      seasonType,
      division,
      players: players.map(player => ({
        name: player.name,
        firstName: player.firstName || player.name.split(' ')[0],
        lastName: player.lastName || player.name.split(' ').slice(1).join(' '),
        jerseyNumber: player.jerseyNumber,
        position: player.position || 'Player'
      })),
      totalPlayers: players.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const roster = await DatabaseService.create('team-rosters', rosterData);

    logger.info('Roster created', { rosterId, teamName });
    res.status(201).json(roster);
  });

  /**
   * Get a specific roster by ID
   */
  static getRosterById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const roster = await DatabaseService.getById('team-rosters', id);

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

    const roster = await DatabaseService.update('team-rosters', id, updates);

    logger.info('Roster updated', { rosterId: id });
    res.json(roster);
  });

  /**
   * Delete a roster
   */
  static deleteRoster = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await DatabaseService.delete('team-rosters', id);

    logger.info('Roster deleted', { rosterId: id });
    res.json({ message: 'Roster deleted successfully' });
  });
}
