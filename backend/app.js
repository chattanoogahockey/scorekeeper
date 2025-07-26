import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getGamesContainer,
  getTeamsContainer,
  getRostersContainer,
  getAttendanceContainer,
  getGoalEventsContainer,
  getPenaltyEventsContainer,
  getGameEventsContainer,
} from './cosmosClient.js';
import googleTTS from 'google-tts-api';

// Load environment variables from .env file if present
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Helper to create a standardized error response.
 * @param {express.Response} res
 * @param {Error} error
 * @param {number} [status=500]
 */
function handleError(res, error, status = 500) {
  console.error(error);
  res.status(status).json({ error: error.message || 'Internal Server Error' });
}

// ---------------------- API Routes ----------------------

/**
 * GET /api/leagues
 * Returns a static list of leagues. This could be extended to query
 * from Cosmos DB in the future.
 */
app.get('/api/leagues', (req, res) => {
  res.json([
    { id: 'gold', name: 'Gold' },
    { id: 'silver', name: 'Silver' },
    { id: 'bronze', name: 'Bronze' },
  ]);
});

/**
 * GET /api/teams
 * Returns all teams from the teams container.
 */
app.get('/api/teams', async (req, res) => {
  try {
    const container = getTeamsContainer();
    const querySpec = {
      query: 'SELECT * FROM c',
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    res.json(resources);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/games
 * Query games by league. Returns all scheduled games for the given league
 * with team names populated.
 * Query param: league (string)
 */
app.get('/api/games', async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: 'league query param is required' });
  }
  try {
    const gamesContainer = getGamesContainer();
    const teamsContainer = getTeamsContainer();
    
    // Get all teams first
    const teamsQuery = { query: 'SELECT * FROM c' };
    const { resources: teams } = await teamsContainer.items.query(teamsQuery).fetchAll();
    const teamsMap = teams.reduce((map, team) => {
      map[team.id || team.teamId] = team;
      return map;
    }, {});
    
    // Query games for the given league ordered by gameDate ascending
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.division = @league ORDER BY c.gameDate',
      parameters: [
        { name: '@league', value: league.charAt(0).toUpperCase() + league.slice(1) }, // Capitalize first letter
      ],
    };
    const { resources: games } = await gamesContainer.items.query(querySpec).fetchAll();
    
    // Add team names to games
    const gamesWithTeamNames = games.map(game => ({
      ...game,
      awayTeam: teamsMap[game.awayTeamId]?.name || game.awayTeamId,
      homeTeam: teamsMap[game.homeTeamId]?.name || game.homeTeamId,
    }));
    
    res.json(gamesWithTeamNames);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/rosters
 * Get rosters for a given game. Returns away and home team rosters.
 * Query param: gameId (string)
 */
app.get('/api/rosters', async (req, res) => {
  const { gameId } = req.query;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId query param is required' });
  }
  try {
    // First get the game to find the team IDs
    const gamesContainer = getGamesContainer();
    const gameQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }],
    };
    const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();
    
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const game = games[0];
    const { homeTeamId, awayTeamId } = game;
    
    // Get team names
    const teamsContainer = getTeamsContainer();
    const teamsQuery = {
      query: 'SELECT * FROM c WHERE c.id = @homeTeamId OR c.id = @awayTeamId',
      parameters: [
        { name: '@homeTeamId', value: homeTeamId },
        { name: '@awayTeamId', value: awayTeamId },
      ],
    };
    const { resources: teams } = await teamsContainer.items.query(teamsQuery).fetchAll();
    const teamsMap = teams.reduce((map, team) => {
      map[team.id || team.teamId] = team;
      return map;
    }, {});
    
    // Get players for both teams
    const playersContainer = getRostersContainer();
    const playersQuery = {
      query: 'SELECT * FROM c WHERE c.teamId = @homeTeamId OR c.teamId = @awayTeamId',
      parameters: [
        { name: '@homeTeamId', value: homeTeamId },
        { name: '@awayTeamId', value: awayTeamId },
      ],
    };
    const { resources: players } = await playersContainer.items.query(playersQuery).fetchAll();
    
    // Group players by team and format for frontend
    const awayTeamPlayers = players
      .filter(p => p.teamId === awayTeamId)
      .map(p => ({
        name: p.name,
        number: p.number || '', // Empty if not present
        position: p.position || '', // Empty if not present
        playerId: p.playerId,
      }));
    
    const homeTeamPlayers = players
      .filter(p => p.teamId === homeTeamId)
      .map(p => ({
        name: p.name,
        number: p.number || '',
        position: p.position || '',
        playerId: p.playerId,
      }));
    
    console.log(`Found ${awayTeamPlayers.length} away team players, ${homeTeamPlayers.length} home team players`);
    
    const rosters = [
      {
        teamName: teamsMap[awayTeamId]?.name || 'Away Team',
        teamId: awayTeamId,
        teamType: 'away',
        players: awayTeamPlayers
      },
      {
        teamName: teamsMap[homeTeamId]?.name || 'Home Team',
        teamId: homeTeamId,
        teamType: 'home', 
        players: homeTeamPlayers
      }
    ];
    
    res.json(rosters);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/attendance
 * Records attendance for all teams in a game and captures roster data.
 * Body: { gameId, attendance: {teamName: [playerNames]}, totalRoster: [{teamName, teamId, totalPlayers}] }
 */
app.post('/api/attendance', async (req, res) => {
  const { gameId, attendance, totalRoster } = req.body;
  if (!gameId || !attendance || !totalRoster) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, attendance, totalRoster }' 
    });
  }
  try {
    const container = getAttendanceContainer();
    
    // Create attendance record with both roster and attendance data
    const attendanceRecord = {
      id: `${gameId}-attendance-${Date.now()}`,
      eventType: 'attendance', // Identify this as an attendance event
      gameId,
      recordedAt: new Date().toISOString(),
      
      // Full roster data for each team
      roster: totalRoster.map(team => ({
        teamName: team.teamName,
        teamId: team.teamId,
        totalPlayers: team.totalPlayers,
        playerCount: team.totalPlayers.length
      })),
      
      // Attendance data for each team  
      attendance: Object.keys(attendance).map(teamName => ({
        teamName,
        playersPresent: attendance[teamName],
        presentCount: attendance[teamName].length
      })),
      
      // Summary statistics
      summary: {
        totalTeams: totalRoster.length,
        totalRosterSize: totalRoster.reduce((sum, team) => sum + team.totalPlayers.length, 0),
        totalPresent: Object.values(attendance).reduce((sum, players) => sum + players.length, 0)
      }
    };
    
    console.log(`Recording attendance for game ${gameId}:`);
    console.log(`- Total roster: ${attendanceRecord.summary.totalRosterSize} players`);
    console.log(`- Present: ${attendanceRecord.summary.totalPresent} players`);
    
    const { resource } = await container.items.create(attendanceRecord);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Attendance submission error:', error);
    handleError(res, error);
  }
});

/**
 * POST /api/penalties
 * Records a penalty event.
 * Body: { gameId, period, penalizedPlayer, team, penaltyType, length, time }
 */
app.post('/api/penalties', async (req, res) => {
  const { gameId, period, penalizedPlayer, team, penaltyType, length, time } = req.body;
  if (!gameId || !period || !penalizedPlayer || !team || !penaltyType || !length || !time) {
    return res.status(400).json({ error: 'Missing required fields for penalty' });
  }
  try {
    const container = getPenaltyEventsContainer();
    const item = {
      id: `${gameId}-penalty-${Date.now()}`,
      gameId,
      period,
      penalizedPlayer,
      team,
      penaltyType,
      length,
      time,
      timestamp: new Date().toISOString(),
    };
    const { resource } = await container.items.create(item);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/events
 * Returns combined goal and penalty events for a game sorted by timestamp.
 * Query param: gameId (string)
 */
app.get('/api/events', async (req, res) => {
  const { gameId } = req.query;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId query param is required' });
  }
  try {
    const goalsContainer = getGoalEventsContainer();
    const penaltiesContainer = getPenaltyEventsContainer();
    const goalQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [ { name: '@gameId', value: gameId } ],
    };
    const penaltyQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [ { name: '@gameId', value: gameId } ],
    };
    const [goalsRes, penaltiesRes] = await Promise.all([
      goalsContainer.items.query(goalQuery).fetchAll(),
      penaltiesContainer.items.query(penaltyQuery).fetchAll(),
    ]);
    const events = [...goalsRes.resources, ...penaltiesRes.resources];
    // sort by timestamp ascending
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    res.json(events);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/lastGoal
 * Returns the most recent goal event for a game.
 * Query param: gameId (string)
 */
app.get('/api/lastGoal', async (req, res) => {
  const { gameId } = req.query;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId query param is required' });
  }
  try {
    const container = getGoalEventsContainer();
    const querySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE c.gameId = @gameId ORDER BY c.timestamp DESC',
      parameters: [ { name: '@gameId', value: gameId } ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    const lastGoal = resources[0] || null;
    res.json(lastGoal);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/lastPenalty
 * Returns the most recent penalty event for a game.
 * Query param: gameId (string)
 */
app.get('/api/lastPenalty', async (req, res) => {
  const { gameId } = req.query;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId query param is required' });
  }
  try {
    const container = getPenaltyEventsContainer();
    const querySpec = {
      query: 'SELECT TOP 1 * FROM c WHERE c.gameId = @gameId ORDER BY c.timestamp DESC',
      parameters: [ { name: '@gameId', value: gameId } ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    const lastPenalty = resources[0] || null;
    res.json(lastPenalty);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * API Route: Record Goal Event
 * POST /api/goals
 * Body: { gameId, team, player, period, time, assist, shotType, goalType, breakaway, goalDescription }
 * Returns: { message, eventId }
 */
app.post('/api/goals', async (req, res) => {
  try {
    const { 
      gameId, 
      team, 
      player, 
      period, 
      time, 
      assist = null,
      shotType = "Wrist Shot",
      goalType = "Regular",
      breakaway = false,
      goalDescription = ""
    } = req.body;
    
    if (!gameId || !team || !player || !period || !time) {
      return res.status(400).json({ error: 'Missing required fields: gameId, team, player, period, time' });
    }
    
    const gameEventsContainer = getGameEventsContainer();
    
    // Get current team goals to calculate running totals
    const teamGoalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId AND c.eventType = @eventType AND c.scoringTeamId = @team',
      parameters: [
        { name: '@gameId', value: parseInt(gameId) },
        { name: '@eventType', value: 'goal' },
        { name: '@team', value: team }
      ]
    };
    const { resources: teamGoals } = await gameEventsContainer.items.query(teamGoalsQuery).fetchAll();
    
    // Get player goals in this game
    const playerGoalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId AND c.eventType = @eventType AND c.scorerId = @player',
      parameters: [
        { name: '@gameId', value: parseInt(gameId) },
        { name: '@eventType', value: 'goal' },
        { name: '@player', value: player }
      ]
    };
    const { resources: playerGoals } = await gameEventsContainer.items.query(playerGoalsQuery).fetchAll();
    
    // Get all goals in this game to calculate against totals
    const allGoalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId AND c.eventType = @eventType',
      parameters: [
        { name: '@gameId', value: parseInt(gameId) },
        { name: '@eventType', value: 'goal' }
      ]
    };
    const { resources: allGoals } = await gameEventsContainer.items.query(allGoalsQuery).fetchAll();
    const opposingGoals = allGoals.filter(goal => goal.scoringTeamId !== team);
    
    // Create comprehensive goal event record matching your schema
    const goalEvent = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'goal',
      gameId: parseInt(gameId),
      period: parseInt(period),
      scoringTeamId: team,
      scorerId: player,
      assistId: assist || null,
      goalTime: time,
      shotType: shotType,
      goalType: goalType,
      breakaway: breakaway,
      scoringTeamGoalsFor: teamGoals.length + 1,
      scoringTeamGoalsAgainst: opposingGoals.length,
      goalDescription: goalDescription || (teamGoals.length === 0 ? "First goal" : "Goal"),
      scorerGoalsInGame: playerGoals.length + 1,
      timestampRecorded: new Date().toISOString(),
      timestampOccurred: new Date().toISOString(),
      enteredBy: 'scorekeeper-app',
      notes: `${goalType} goal by ${player}${assist ? `, assist: ${assist}` : ''}`,
      status: 'finalized',
      finalizedAt: new Date().toISOString()
    };
    
    const { resource: createdEvent } = await gameEventsContainer.items.create(goalEvent);
    
    res.json({ 
      message: 'Goal recorded successfully',
      eventId: createdEvent.id,
      event: createdEvent
    });
    
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/tts
 * Generates a TTS audio URL for a given text using google-tts-api.
 * Query param: text (string)
 * Returns: { url }
 */
app.get('/api/tts', async (req, res) => {
  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'text query param is required' });
  }
  try {
    const url = googleTTS.getAudioUrl(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });
    res.json({ url });
  } catch (error) {
    handleError(res, error);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});