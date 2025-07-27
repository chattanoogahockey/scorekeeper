import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Debug endpoint for troubleshooting
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

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Import database functions
import { getGamesContainer, getAttendanceContainer, getRostersContainer } from './cosmosClient.js';

// Helper function for error handling
const handleError = (res, error) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
};

// API endpoints

// Record attendance for a game
app.post('/api/attendance', async (req, res) => {
  const { gameId, attendance, totalRoster } = req.body;
  if (!gameId || !attendance || !totalRoster) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, attendance, totalRoster }' 
    });
  }
  try {
    const container = getAttendanceContainer(); // This is gameEvents container
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

// Get available divisions from scheduled games (Gold, Silver, Bronze within cha-hockey league)
app.get('/api/games/leagues', async (req, res) => {
  try {
    const container = getGamesContainer();
    const querySpec = {
      query: 'SELECT DISTINCT c.division FROM c WHERE c.league = "cha-hockey"',
      parameters: [],
    };

    const { resources: divisions } = await container.items.query(querySpec).fetchAll();
    // Transform to expected format - these are divisions within cha-hockey
    const formattedDivisions = divisions.map(item => ({
      id: item.division.toLowerCase().replace(/\s+/g, '-'),
      name: item.division
    }));
    
    res.status(200).json(formattedDivisions);
  } catch (error) {
    handleError(res, error);
  }
});

// Get roster data by team or division
app.get('/api/rosters', async (req, res) => {
  const { team, gameId, division } = req.query;
  
  try {
    const container = getRostersContainer();
    let querySpec;
    
    if (team) {
      // Get roster by team name
      querySpec = {
        query: 'SELECT * FROM c WHERE c.team = @team AND c.league = "cha-hockey"',
        parameters: [{ name: '@team', value: team }],
      };
    } else if (division) {
      // Get rosters by division
      querySpec = {
        query: 'SELECT * FROM c WHERE c.division = @division AND c.league = "cha-hockey"',
        parameters: [{ name: '@division', value: division }],
      };
    } else if (gameId) {
      // Get all rosters for teams in a specific game
      querySpec = {
        query: 'SELECT * FROM c WHERE c.isActive = true AND c.league = "cha-hockey"',
        parameters: [],
      };
    } else {
      // Get all active rosters in cha-hockey
      querySpec = {
        query: 'SELECT * FROM c WHERE c.isActive = true AND c.league = "cha-hockey"',
        parameters: [],
      };
    }

    const { resources: rosters } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(rosters);
  } catch (error) {
    handleError(res, error);
  }
});

// Get games by division within cha-hockey league
app.get('/api/games', async (req, res) => {
  const { league } = req.query; // This is actually the division (Gold, Silver, Bronze)
  if (!league) {
    return res.status(400).json({ error: 'Missing required query parameter: league (division)' });
  }

  try {
    const container = getGamesContainer();
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.league = "cha-hockey" AND c.division = @division',
      parameters: [{ name: '@division', value: league }],
    };

    const { resources: games } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Add goal recording endpoint
app.post('/api/goals', async (req, res) => {
  const { gameId, teamId, playerId, period, time, assistIds } = req.body;
  if (!gameId || !teamId || !playerId || !period || !time) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, teamId, playerId, period, time, assistIds? }' 
    });
  }
  try {
    const container = getAttendanceContainer(); // Using attendance container for game events
    const goalRecord = {
      id: `${gameId}-goal-${Date.now()}`,
      eventType: 'goal',
      gameId,
      teamId,
      playerId,
      period,
      time,
      assistIds: assistIds || [],
      recordedAt: new Date().toISOString()
    };
    const { resource } = await container.items.create(goalRecord);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});

// Add penalty recording endpoint
app.post('/api/penalties', async (req, res) => {
  const { gameId, teamId, playerId, period, time, penaltyType, duration } = req.body;
  if (!gameId || !teamId || !playerId || !period || !time || !penaltyType) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, teamId, playerId, period, time, penaltyType, duration? }' 
    });
  }
  try {
    const container = getAttendanceContainer(); // Using attendance container for game events
    const penaltyRecord = {
      id: `${gameId}-penalty-${Date.now()}`,
      eventType: 'penalty',
      gameId,
      teamId,
      playerId,
      period,
      time,
      penaltyType,
      duration: duration || 2, // Default 2 minutes
      recordedAt: new Date().toISOString()
    };
    const { resource } = await container.items.create(penaltyRecord);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});

// Add other API endpoints as needed

// Serve the frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const server = app;

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
