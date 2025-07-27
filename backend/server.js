const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { CosmosClient } = require('@azure/cosmos');

// Load environment variables
dotenv.config();

// ===== COSMOS DB SETUP =====
const {
  COSMOS_DB_URI,
  COSMOS_DB_ENDPOINT,
  COSMOS_ENDPOINT,
  COSMOS_DB_KEY,
  COSMOS_KEY,
  COSMOS_DB_NAME,
  COSMOS_DB_DATABASE_ID,
  COSMOS_DB_CONNECTION_STRING,
  COSMOS_DB_GAMES_CONTAINER,
  COSMOS_DB_TEAMS_CONTAINER,
  COSMOS_DB_ROSTERS_CONTAINER,
  COSMOS_DB_ATTENDANCE_CONTAINER,
  COSMOS_DB_GOAL_EVENTS_CONTAINER,
  COSMOS_DB_PENALTY_EVENTS_CONTAINER,
} = process.env;

// Support multiple environment variable naming conventions
const cosmosUri = COSMOS_DB_URI || COSMOS_DB_ENDPOINT || COSMOS_ENDPOINT;
const cosmosKey = COSMOS_DB_KEY || COSMOS_KEY;
const cosmosDatabase = COSMOS_DB_NAME || COSMOS_DB_DATABASE_ID;

console.log('🔍 Cosmos DB Configuration:');
console.log(`  Connection String: ${COSMOS_DB_CONNECTION_STRING ? 'SET' : 'MISSING'}`);
console.log(`  Endpoint: ${cosmosUri ? 'SET' : 'MISSING'}`);
console.log(`  Key: ${cosmosKey ? 'SET (length=' + (cosmosKey?.length || 0) + ')' : 'MISSING'}`);
console.log(`  Database: ${cosmosDatabase || 'MISSING'}`);

// Use connection string if available, otherwise use endpoint/key
let cosmosClient;
if (COSMOS_DB_CONNECTION_STRING) {
  console.log('🔗 Using Cosmos DB Connection String');
  cosmosClient = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
} else if (cosmosUri && cosmosKey && cosmosDatabase) {
  console.log('🔑 Using Cosmos DB Endpoint/Key');
  cosmosClient = new CosmosClient({
    endpoint: cosmosUri,
    key: cosmosKey,
  });
} else {
  throw new Error('Missing Cosmos DB configuration. Please provide either COSMOS_DB_CONNECTION_STRING or (endpoint, key, database).');
}

const database = cosmosClient.database(cosmosDatabase);

function getContainer(containerNameEnvVar) {
  const containerName = process.env[containerNameEnvVar];
  if (!containerName) {
    throw new Error(`Missing container name for ${containerNameEnvVar}`);
  }
  return database.container(containerName);
}

// ===== EXPRESS SETUP =====
const app = express();
const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

console.log('🚀 Starting Hockey Scorekeeper API');
console.log(`   Port: ${port}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function handleError(res, error, status = 500) {
  console.error('❌ Error:', error);
  res.status(status).json({ error: error.message || 'Internal Server Error' });
}

// ===== API ROUTES =====

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/api/leagues', (req, res) => {
  res.json([
    { id: 'gold', name: 'Gold' },
    { id: 'silver', name: 'Silver' },
    { id: 'bronze', name: 'Bronze' },
  ]);
});

app.get('/api/teams', async (req, res) => {
  try {
    const container = getContainer('COSMOS_DB_TEAMS_CONTAINER');
    const querySpec = { query: 'SELECT * FROM c' };
    const { resources } = await container.items.query(querySpec).fetchAll();
    res.json(resources);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/games', async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: 'league query param is required' });
  }
  
  console.log(`🎯 Searching for games in league: ${league}`);
  
  try {
    const gamesContainer = getContainer('COSMOS_DB_GAMES_CONTAINER');
    const teamsContainer = getContainer('COSMOS_DB_TEAMS_CONTAINER');
    
    // Get teams
    const teamsQuery = { query: 'SELECT * FROM c' };
    const { resources: teams } = await teamsContainer.items.query(teamsQuery).fetchAll();
    const teamsMap = teams.reduce((map, team) => {
      map[team.id || team.teamId] = team;
      return map;
    }, {});
    
    // Query games - try different field names
    const querySpecs = [
      {
        query: 'SELECT * FROM c WHERE c.division = @league ORDER BY c.gameDate ASC',
        parameters: [{ name: '@league', value: league.charAt(0).toUpperCase() + league.slice(1) }]
      },
      {
        query: 'SELECT * FROM c WHERE c.league = @league ORDER BY c.gameDate ASC',
        parameters: [{ name: '@league', value: league }]
      },
      {
        query: 'SELECT * FROM c WHERE UPPER(c.division) = @league ORDER BY c.gameDate ASC',
        parameters: [{ name: '@league', value: league.toUpperCase() }]
      }
    ];
    
    let games = [];
    for (const querySpec of querySpecs) {
      const { resources } = await gamesContainer.items.query(querySpec).fetchAll();
      if (resources.length > 0) {
        games = resources;
        break;
      }
    }
    
    console.log(`📊 Found ${games.length} games for league: ${league}`);
    
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

app.get('/api/rosters', async (req, res) => {
  const { gameId } = req.query;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId query param is required' });
  }
  
  try {
    const container = getContainer('COSMOS_DB_ROSTERS_CONTAINER');
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    res.json(resources);
  } catch (error) {
    handleError(res, error);
  }
});

// Serve frontend
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <h1>🏒 Hockey Scorekeeper API</h1>
      <p>Server running at ${new Date().toISOString()}</p>
      <ul>
        <li><a href="/api/health">Health Check</a></li>
        <li><a href="/api/leagues">Leagues</a></li>
      </ul>
    `);
  }
});

// Catch-all for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// ===== START SERVER =====
const server = app.listen(port, () => {
  console.log(`✅ Hockey Scorekeeper API running on port ${port}`);
  console.log(`✅ Health: http://localhost:${port}/api/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use`);
  }
});

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
