import { DatabaseService } from '../services/database.js';
import { asyncHandler } from '../middleware/index.js';
import logger from '../../logger.js';

/**
 * Attendance controller for handling attendance-related endpoints
 */
export class AttendanceController {
  /**
   * Record attendance for a game
   */
  static recordAttendance = asyncHandler(async (req, res) => {
    const { gameId, attendance, totalRoster } = req.body;

    // Validation
    if (!gameId || !attendance || !totalRoster) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['gameId', 'attendance', 'totalRoster']
      });
    }

    const attendanceRecord = {
      id: `${gameId}-attendance`,
      eventType: 'attendance',
      gameId,
      recordedAt: new Date().toISOString(),
      roster: totalRoster.map(team => ({
        teamName: team.teamName,
        teamId: team.teamId,
        totalPlayers: team.totalPlayers,
        playerCount: team.totalPlayers.length
      })),
      attendance: Object.keys(attendance).map(teamName => ({
        teamName,
        playersPresent: attendance[teamName],
        presentCount: attendance[teamName].length
      })),
      summary: {
        totalTeams: totalRoster.length,
        totalRosterSize: totalRoster.reduce((sum, team) => sum + team.totalPlayers.length, 0),
        totalPresent: Object.values(attendance).reduce((sum, players) => sum + players.length, 0)
      }
    };

    const record = await DatabaseService.upsert('attendance', attendanceRecord);

    logger.info('Attendance recorded', { gameId, totalPresent: attendanceRecord.summary.totalPresent });
    res.status(201).json(record);
  });

  /**
   * Get attendance for a specific game
   */
  static getAttendance = asyncHandler(async (req, res) => {
    const { gameId } = req.params;

    const attendance = await DatabaseService.getById('attendance', `${gameId}-attendance`);

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json(attendance);
  });

  /**
   * Get all attendance records
   */
  static getAllAttendance = asyncHandler(async (req, res) => {
    const attendanceRecords = await DatabaseService.query('attendance', {
      query: 'SELECT * FROM c ORDER BY c.recordedAt DESC'
    });

    res.json(attendanceRecords);
  });
}
