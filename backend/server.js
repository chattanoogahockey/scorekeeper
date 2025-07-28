import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { getGamesContainer, getAttendanceContainer, getRostersContainer, getGameEventsContainer } from './cosmosClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

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

// Serve static frontend files
const frontendDist = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Add graceful shutdown logic from server-new.js
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


// Consolidated routes and logic from app.js
// Add unique routes from app.js
app.post('/api/attendance', async (req, res) => {
  const { gameId, attendance, totalRoster } = req.body;
  if (!gameId || !attendance || !totalRoster) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, attendance, totalRoster }' 
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
    const container = getGameEventsContainer();
    let querySpec;
    
    if (!gameId && !eventType) {
      // Return all game events
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.timestamp DESC',
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
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.timestamp DESC`,
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
    const container = getGameEventsContainer();
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

// Add other unique routes from app.js as needed
// ...

// Catch-all route to serve index.html for SPA (after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(process.env.PORT || 8080, () => {
  console.log(`Server is running on port ${process.env.PORT || 8080}`);
});
