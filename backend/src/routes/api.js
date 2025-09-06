import express from 'express';
import { GamesController } from '../controllers/games.js';
import { RostersController } from '../controllers/rosters.js';
import { GameEventsController } from '../controllers/gameEvents.js';
import { AttendanceController } from '../controllers/attendance.js';
import { HealthController } from '../controllers/health.js';
import { cacheControl } from '../middleware/index.js';

const router = express.Router();

// Health and version endpoints
router.get('/health', HealthController.getHealth);
router.get('/version', HealthController.getVersion);
router.post('/admin/update-deployment-time', HealthController.updateDeploymentTime);

// Games endpoints
router.get('/games', cacheControl, GamesController.getGames);
router.get('/games/submitted', GamesController.getSubmittedGames);
router.post('/games', GamesController.createGame);
router.get('/games/:id', GamesController.getGameById);
router.put('/games/:id', GamesController.updateGame);
router.delete('/games/:id', GamesController.deleteGame);

// Rosters endpoints
router.get('/rosters', cacheControl, RostersController.getRosters);
router.post('/rosters', RostersController.createRoster);
router.get('/rosters/:id', RostersController.getRosterById);
router.put('/rosters/:id', RostersController.updateRoster);
router.delete('/rosters/:id', RostersController.deleteRoster);

// Game events endpoints
router.get('/game-events', cacheControl, GameEventsController.getGameEvents);
router.post('/game-events', GameEventsController.createGameEvent); // Deprecated
router.post('/goals', GameEventsController.createGoal);
router.post('/penalties', GameEventsController.createPenalty);

// Attendance endpoints
router.post('/attendance', AttendanceController.recordAttendance);
router.get('/attendance/:gameId', AttendanceController.getAttendance);
router.get('/attendance', AttendanceController.getAllAttendance);

export default router;
