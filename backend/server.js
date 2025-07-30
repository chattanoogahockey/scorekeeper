import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { getGamesContainer, getAttendanceContainer, getRostersContainer, getGoalsContainer, getPenaltiesContainer } from './cosmosClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Track server start time for diagnostics
const startTime = Date.now();

// SIMPLE TEST ROUTE
app.get('/api/test', (req, res) => {
  console.log('🔥 TEST ENDPOINT HIT! - UPDATED');
  res.json({ message: 'Test endpoint works! - UPDATED' });
});

// HEALTH CHECK ENDPOINT for Azure
app.get('/', (req, res) => {
  console.log('🏥 HEALTH CHECK ENDPOINT HIT');
  res.json({ 
    status: 'healthy', 
    message: 'Hockey Scorekeeper API is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8080
  });
});

app.get('/health', (req, res) => {
  console.log('🏥 HEALTH CHECK /health ENDPOINT HIT');
  res.json({ 
    status: 'healthy', 
    message: 'Hockey Scorekeeper API is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8080
  });
});

// SIMPLE GOALS TEST ROUTE
app.get('/api/goals-test', (req, res) => {
  console.log('🔥 GOALS TEST ENDPOINT HIT!');
  res.json({ message: 'Goals test endpoint works!' });
});

// MINIMAL GOALS TEST - COPY OF ATTENDANCE LOGIC
app.post('/api/goals-minimal', async (req, res) => {
  console.log('🎯 MINIMAL GOALS POST ENDPOINT HIT!');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const container = getGoalsContainer();
    const testGoal = {
      id: `test-goal-${Date.now()}`,
      eventType: 'goal',
      gameId: req.body.gameId || 'test',
      recordedAt: new Date().toISOString(),
      test: true
    };
    
    const { resource } = await container.items.create(testGoal);
    res.status(201).json(resource);
  } catch (error) {
    console.error('❌ Goals minimal test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Utility function for error handling
function handleError(res, error) {
  console.error('API Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred'
  });
}

// Consolidated features from server-new.js

// Add debugging endpoints from server-new.js
app.get('/api/debug/env', (req, res) => {
  const cosmosVars = Object.keys(process.env)
    .filter(key => key.includes('COSMOS'))
    .reduce((obj, key) => {
      obj[key] = process.env[key] ? 'SET (' + process.env[key].substring(0, 20) + '...)' : 'NOT SET';
      return obj;
    }, {});

  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    websitesPort: process.env.WEBSITES_PORT,
    cosmosVars,
    totalEnvVars: Object.keys(process.env).length
  });
});

// Note: Graceful shutdown handlers will be added after server creation


// Consolidated routes and logic from app.js
// Add unique routes from app.js
app.post('/api/attendance', async (req, res) => {
  const { gameId, attendance, totalRoster } = req.body;
  console.log('Received attendance POST:', JSON.stringify(req.body, null, 2));
  if (!gameId || !attendance || !totalRoster) {
    console.error('❌ Invalid attendance payload:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, attendance, totalRoster }',
      received: req.body
    });
  }
  try {
    const container = getAttendanceContainer();
    const attendanceRecord = {
      id: `${gameId}-attendance-${Date.now()}`,
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
    const { resource } = await container.items.create(attendanceRecord);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});


// Add the `/api/games` endpoint
app.get('/api/games', async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: 'Missing required query parameter: league' });
  }

  try {
    const container = getGamesContainer();
    let querySpec;
    
    if (league === 'all') {
      // Return all games to extract leagues
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
    } else {
      // Return games for specific league
      querySpec = {
        query: 'SELECT * FROM c WHERE c.league = @league',
        parameters: [{ name: '@league', value: league }],
      };
    }

    const { resources: games } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Add the `/api/rosters` endpoint
app.get('/api/rosters', async (req, res) => {
  const { teamName, season, division } = req.query;

  try {
    const container = getRostersContainer();
    let querySpec;
    
    if (!teamName && !season && !division) {
      // Return all rosters
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (teamName) {
        conditions.push('c.teamName = @teamName');
        parameters.push({ name: '@teamName', value: teamName });
      }
      
      if (season) {
        conditions.push('c.season = @season');
        parameters.push({ name: '@season', value: season });
      }
      
      if (division) {
        conditions.push('c.division = @division');
        parameters.push({ name: '@division', value: division });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters: parameters,
      };
    }

    const { resources: rosters } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(rosters);
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
});

// Add the `/api/game-events` endpoint for goals, assists, penalties, etc.
app.get('/api/game-events', async (req, res) => {
  const { gameId, eventType } = req.query;

  try {
    // const container = getGameEventsContainer(); // Removed gameEvents
    let querySpec;
    
    if (!gameId && !eventType) {
      // Return all game events
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }
      
      if (eventType) {
        conditions.push('c.eventType = @eventType');
        parameters.push({ name: '@eventType', value: eventType });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters: parameters,
      };
    }

    const { resources: events } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching game events:', error);
    res.status(500).json({ error: 'Failed to fetch game events' });
  }
});

// Add the `/api/game-events` POST endpoint for creating game events
app.post('/api/game-events', async (req, res) => {
  const { gameId, eventType, playerId, playerName, teamName, timestamp, details } = req.body;
  
  if (!gameId || !eventType || !teamName) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, eventType, teamName, ... }' 
    });
  }

  try {
    // const container = getGameEventsContainer(); // Removed gameEvents
    const gameEvent = {
      id: `${gameId}-${eventType}-${Date.now()}`,
      gameId,
      eventType, // 'goal', 'assist', 'penalty', 'substitution', etc.
      playerId,
      playerName,
      teamName,
      timestamp: timestamp || new Date().toISOString(),
      details: details || {},
      recordedAt: new Date().toISOString()
    };
    
    const { resource } = await container.items.create(gameEvent);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});

// Add the `/api/goals` POST endpoint for creating goals
// Add the `/api/goals` POST endpoint for creating goals - FIXED MAPPING
app.post('/api/goals', async (req, res) => {
  console.log('🔥 GOALS POST ENDPOINT HIT!');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { gameId, team, player, period, time, assist, shotType, goalType, breakaway } = req.body;

  if (!gameId || !team || !player || !period || !time) {
    console.error('❌ Invalid goals payload:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, team, player, period, time.',
      received: req.body
    });
  }

  try {
    const container = getGoalsContainer();
    const goal = {
      id: `${gameId}-goal-${Date.now()}`,
      eventType: 'goal',
      gameId,
      period,
      scoringTeam: team,              // Map team -> scoringTeam
      scorer: player,                 // Map player -> scorer  
      assists: assist ? [assist] : [], // Map assist -> assists array
      time,
      shotType: shotType || 'Wrist Shot',
      goalType: goalType || 'Regular',
      breakaway: breakaway || false,
      recordedAt: new Date().toISOString()
    };
    
    console.log('💾 Creating goal record:', JSON.stringify(goal, null, 2));
    const { resource } = await container.items.create(goal);
    
    console.log('✅ Goal created successfully:', resource.id);
    res.status(201).json(resource);
  } catch (error) {
    console.error('❌ Error creating goal:', error);
    res.status(500).json({ 
      error: 'Failed to create goal',
      message: error.message 
    });
  }
});

// Add the `/api/penalties` POST endpoint for creating penalties
app.post('/api/penalties', async (req, res) => {
  const { gameId, period, team, player, penaltyType, penaltyLength, time, details } = req.body;

  if (!gameId || !team || !player || !period || !time || !penaltyType || !penaltyLength) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, team, player, period, time, penaltyType, penaltyLength.'
    });
  }

  try {
    const container = getPenaltiesContainer();
    const penalty = {
      id: `${gameId}-penalty-${Date.now()}`,
      gameId,
      period,
      penalizedTeam: team,
      penalizedPlayer: player,
      penaltyType,
      penaltyLength,
      time,
      details: details || {},
      recordedAt: new Date().toISOString()
    };
    
    const { resource } = await container.items.create(penalty);
    
    // Get total penalties for this team in this game (simplified response)
    const { resources: teamPenalties } = await container.items.query({
      query: "SELECT * FROM c WHERE c.gameId = @gameId AND c.penalizedTeam = @team",
      parameters: [
        { name: "@gameId", value: gameId },
        { name: "@team", value: team }
      ]
    }).fetchAll();
    
    // Return response matching frontend expectations
    res.json({ 
      success: true, 
      penalty: resource,
      summary: {
        penalizedTeamTotalPenalties: teamPenalties.length,
        playerPenaltiesInGame: teamPenalties.filter(p => p.penalizedPlayer === player).length
      }
    });
  } catch (error) {
    console.error('Error creating penalty:', error);
    res.status(500).json({ error: 'Failed to create penalty' });
  }
});

// GET endpoint for retrieving penalties
app.get('/api/penalties', async (req, res) => {
  const { gameId, team, playerId } = req.query;

  try {
    const container = getPenaltiesContainer();
    let querySpec;
    
    if (!gameId && !team && !playerId) {
      // Return all penalties
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }
      
      if (team) {
        conditions.push('c.penalizedTeam = @team');
        parameters.push({ name: '@team', value: team });
      }
      
      if (playerId) {
        conditions.push('c.penalizedPlayer = @playerId');
        parameters.push({ name: '@playerId', value: playerId });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.recordedAt DESC`,
        parameters: parameters,
      };
    }

    const { resources: penalties } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(penalties);
  } catch (error) {
    console.error('Error fetching penalties:', error);
    res.status(500).json({ error: 'Failed to fetch penalties' });
  }
});

// Health check endpoint for debugging production issues
app.get('/api/health', (req, res) => {
  console.log('🔥 HEALTH ENDPOINT HIT!');
  const envVars = {
    COSMOS_DB_URI: !!process.env.COSMOS_DB_URI,
    COSMOS_DB_KEY: !!process.env.COSMOS_DB_KEY,
    COSMOS_DB_NAME: !!process.env.COSMOS_DB_NAME,
    COSMOS_DB_GAMES_CONTAINER: process.env.COSMOS_DB_GAMES_CONTAINER,
    COSMOS_DB_ROSTERS_CONTAINER: process.env.COSMOS_DB_ROSTERS_CONTAINER,
    COSMOS_DB_ATTENDANCE_CONTAINER: process.env.COSMOS_DB_ATTENDANCE_CONTAINER,
    COSMOS_DB_GOALS_CONTAINER: process.env.COSMOS_DB_GOALS_CONTAINER,
    COSMOS_DB_PENALTIES_CONTAINER: process.env.COSMOS_DB_PENALTIES_CONTAINER,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: envVars,
    endpoints: {
      goals: '/api/goals',
      penalties: '/api/penalties',
      games: '/api/games', 
      playerStats: '/api/player-stats',
      health: '/api/health'
    }
  });
});

// Player Stats API endpoint for AI announcer
app.get('/api/player-stats', async (req, res) => {
  const { playerName, teamName, playerId, refresh } = req.query;
  
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const database = await getDatabase();
    const playerStatsContainer = database.container('playerStats');
    
    // If refresh is requested, recalculate stats
    if (refresh === 'true') {
      console.log('Refreshing player stats...');
      const { default: calculateStats } = await import('./calculateStats.js');
      await calculateStats();
    }
    
    let querySpec;
    
    if (playerId) {
      // Get specific player by ID
      querySpec = {
        query: "SELECT * FROM c WHERE c.playerId = @playerId",
        parameters: [{ name: "@playerId", value: playerId }]
      };
    } else if (playerName && teamName) {
      // Get specific player by name and team
      querySpec = {
        query: "SELECT * FROM c WHERE c.playerName = @playerName AND c.teamName = @teamName",
        parameters: [
          { name: "@playerName", value: playerName },
          { name: "@teamName", value: teamName }
        ]
      };
    } else if (teamName) {
      // Get all players for a team
      querySpec = {
        query: "SELECT * FROM c WHERE c.teamName = @teamName",
        parameters: [{ name: "@teamName", value: teamName }]
      };
    } else {
      // Get all player stats
      querySpec = {
        query: "SELECT * FROM c"
      };
    }
    
    const { resources: playerStats } = await playerStatsContainer.items.query(querySpec).fetchAll();
    
    // Add AI announcer ready insights
    const enrichedStats = playerStats.map(player => ({
      ...player,
      announcer: {
        quickFacts: [
          `${player.playerName} has ${player.attendance?.attendancePercentage || 0}% attendance this season`,
          `Attended ${player.attendance?.gamesAttended || 0} of ${player.attendance?.totalTeamGames || 0} games`,
          player.insights?.reliability ? `Reliability: ${player.insights.reliability}` : null
        ].filter(Boolean),
        soundBites: player.insights?.announcements || [],
        metrics: {
          attendance: player.attendance?.attendancePercentage || 0,
          gamesPlayed: player.attendance?.gamesAttended || 0,
          reliability: player.insights?.reliability || 'Unknown'
        }
      }
    }));
    
    res.status(200).json(enrichedStats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch player stats',
      message: error.message 
    });
  }
});

// Add other unique routes from app.js as needed
// ...

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve static frontend files (after all API routes)
const frontendDist = path.resolve(__dirname, 'frontend');
app.use(express.static(frontendDist));

// Catch-all route to serve index.html for SPA (MUST be last!)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const server = app.listen(process.env.PORT || 8080, () => {
  console.log(`🚀 NEW SERVER.JS is running on port ${process.env.PORT || 8080}`);
  console.log('🏥 Health check available at / and /health');
  console.log('🎯 API endpoints available at /api/*');
  console.log('Deployment completed successfully');
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Add graceful shutdown logic after server is created
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received at', new Date().toISOString());
  console.log('🔍 Server has been running for approximately', Math.floor((Date.now() - startTime) / 1000), 'seconds');
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received at', new Date().toISOString());
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
