import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

import { getGamesContainer } from './cosmosClient.js';

// Add the `/api/games` endpoint
app.get('/api/games', async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: 'Missing required query parameter: league' });
  }

  try {
    const container = getGamesContainer();
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.league = @league',
      parameters: [{ name: '@league', value: league }],
    };

    const { resources: games } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Add other unique routes from app.js as needed
// ...

// Serve the frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const server = app;

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
