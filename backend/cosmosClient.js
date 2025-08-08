// Production-ready Cosmos DB client configuration
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { CosmosClient } from '@azure/cosmos';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure environment variables
dotenv.config({ path: './.env' });

/**
 * Configurable Container Names
 * Can be overridden via environment variables for different environments
 */
const containerNames = {
  settings: process.env.COSMOS_DB_SETTINGS_CONTAINER || 'settings',
  analytics: process.env.COSMOS_DB_ANALYTICS_CONTAINER || 'analytics',
  rink_reports: process.env.COSMOS_DB_RINK_REPORTS_CONTAINER || 'rink_reports',
  games: process.env.COSMOS_DB_GAMES_CONTAINER || 'games',
  players: process.env.COSMOS_DB_PLAYERS_CONTAINER || 'players',
  goals: process.env.COSMOS_DB_GOALS_CONTAINER || 'goals',
  penalties: process.env.COSMOS_DB_PENALTIES_CONTAINER || 'penalties',
  rosters: process.env.COSMOS_DB_ROSTERS_CONTAINER || 'rosters',
  attendance: process.env.COSMOS_DB_ATTENDANCE_CONTAINER || 'attendance',
  otshootout: process.env.COSMOS_DB_OTSHOOTOUT_CONTAINER || 'otshootout',
  shotsongoal: process.env.COSMOS_DB_SHOTSONGOAL_CONTAINER || 'shotsongoal',
};

/**
 * Production Cosmos DB Container Definitions
 * 
 * Container Schema:
 * 1. settings - Global application settings (voice config, etc.)
 * 2. analytics - Pre-aggregated statistics and leaderboards  
 * 3. rink_reports - Weekly division summaries and articles
 * 4. games - Game records and submissions
 * 5. players - Player statistics and profiles
 * 6. goals - Goal events and scoring data
 * 7. penalties - Penalty events and infractions
 * 8. rosters - Team rosters and player assignments
 * 9. attendance - Game attendance tracking
 * 10. otshootout - Overtime and shootout results
 * 11. shotsongoal - Shots on goal tracking and analytics
 */

const CONTAINER_DEFINITIONS = {
  // Global application settings
  settings: {
    name: containerNames.settings,
    partitionKey: '/type',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }]
    }
  },
  
  // Pre-aggregated analytics and statistics
  analytics: {
    name: containerNames.analytics,
    partitionKey: '/division', 
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/division/?' },
        { path: '/week/?' },
        { path: '/type/?' },
        { path: '/lastUpdated/?' }
      ]
    }
  },
  
  // Weekly rink reports and articles
  rink_reports: {
    name: containerNames.rink_reports,
    partitionKey: '/division',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/division/?' },
        { path: '/week/?' },
        { path: '/publishedAt/?' }
      ]
    }
  },
  
  // Game records and submissions
  games: {
    name: containerNames.games,
    partitionKey: '/division',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/division/?' },
        { path: '/eventType/?' },
        { path: '/submittedAt/?' },
        { path: '/gameDate/?' }
      ]
    }
  },
  
  // Player statistics and profiles
  players: {
    name: containerNames.players,
    partitionKey: '/_partitionKey',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/division/?' },
        { path: '/teamName/?' },
        { path: '/playerName/?' },
        { path: '/season/?' }
      ]
    }
  },
  
  // Goal events and scoring data
  goals: {
    name: containerNames.goals,
    partitionKey: '/gameId',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/gameId/?' },
        { path: '/teamName/?' },
        { path: '/playerName/?' },
        { path: '/recordedAt/?' }
      ]
    }
  },
  
  // Penalty events and infractions
  penalties: {
    name: containerNames.penalties,
    partitionKey: '/gameId',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/gameId/?' },
        { path: '/teamName/?' },
        { path: '/playerName/?' },
        { path: '/recordedAt/?' }
      ]
    }
  },
  
  // Team rosters and player assignments
  rosters: {
    name: containerNames.rosters,
    partitionKey: '/teamName',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/teamName/?' },
        { path: '/division/?' },
        { path: '/season/?' }
      ]
    }
  },
  
  // Game attendance tracking
  attendance: {
    name: containerNames.attendance,
    partitionKey: '/gameId',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/gameId/?' },
        { path: '/recordedAt/?' }
      ]
    }
  },
  
  // Overtime and shootout results
  otshootout: {
    name: containerNames.otshootout,
    partitionKey: '/gameId',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/gameId/?' },
        { path: '/winner/?' },
        { path: '/recordedAt/?' }
      ]
    }
  },
  
  // Shots on goal tracking
  shotsongoal: {
    name: containerNames.shotsongoal,
    partitionKey: '/gameId',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/gameId/?' },
        { path: '/team/?' },
        { path: '/timeRecorded/?' }
      ]
    }
  }
};

// Environment variable configuration
const {
  COSMOS_DB_URI,
  COSMOS_DB_ENDPOINT,
  COSMOS_ENDPOINT,
  COSMOS_DB_KEY,
  COSMOS_KEY,
  COSMOS_DB_NAME,
  COSMOS_DB_DATABASE_ID
} = process.env;

// Support multiple environment variable naming conventions
const cosmosUri = COSMOS_DB_URI || COSMOS_DB_ENDPOINT || COSMOS_ENDPOINT;
const cosmosKey = COSMOS_DB_KEY || COSMOS_KEY;
const cosmosDatabase = COSMOS_DB_NAME || COSMOS_DB_DATABASE_ID;

const cosmosConfigured = Boolean(cosmosUri && cosmosKey && cosmosDatabase);
let client = null;
let database = null;

if (cosmosConfigured) {
  // Initialize Cosmos DB client only when properly configured
  client = new CosmosClient({ endpoint: cosmosUri, key: cosmosKey });
  database = client.database(cosmosDatabase);
} else {
  console.warn('⚠️ Cosmos DB not configured. Running in degraded mode.');
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!cosmosConfigured || !database) {
    throw new Error('Cosmos DB not configured');
  }
  return database;
}

/**
 * Container accessor functions with proper error handling
 */

/**
 * Container accessor functions with proper error handling
 */

// Settings container - Global application settings
export function getSettingsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.settings.name);
}

// Analytics container - Pre-aggregated statistics  
export function getAnalyticsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.analytics.name);
}

// Rink reports container - Weekly division summaries
export function getRinkReportsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.rink_reports.name);
}

// Games container - Game records and submissions
export function getGamesContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.games.name);
}

// Players container - Player statistics and profiles
export function getPlayersContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.players.name);
}

// Goals container - Goal events and scoring data
export function getGoalsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.goals.name);
}

// Penalties container - Penalty events and infractions
export function getPenaltiesContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.penalties.name);
}

// Rosters container - Team rosters and player assignments
export function getRostersContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.rosters.name);
}

// Attendance container - Game attendance tracking
export function getAttendanceContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.attendance.name);
}

// OT/Shootout container - Overtime and shootout results
export function getOTShootoutContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.otshootout.name);
}

// Shots on Goal container - Shots on goal tracking and analytics
export function getShotsOnGoalContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS.shotsongoal.name);
}

// Legacy aliases for backward compatibility (deprecated)
export function getTeamsContainer() {
  console.warn('getTeamsContainer is deprecated, use getPlayersContainer or getRostersContainer');
  return getRostersContainer();
}

export function getPlayerStatsContainer() {
  console.warn('getPlayerStatsContainer is deprecated, use getPlayersContainer');
  return getPlayersContainer();
}

/**
 * Initialize all containers with proper indexing policies
 * Called during application startup
 */
export async function initializeContainers() {
  if (!cosmosConfigured || !database) {
    console.warn('⚠️ Skipping Cosmos DB initialization (not configured)');
    return false;
  }

  console.log('🔧 Initializing Cosmos DB containers...');
  try {
    const containerPromises = Object.values(CONTAINER_DEFINITIONS).map(async (definition) => {
      const { name, partitionKey, indexingPolicy } = definition;
      try {
        const { container } = await database.containers.createIfNotExists({
          id: name,
          partitionKey,
          indexingPolicy
        });
        console.log(`✅ Container '${name}' ready`);
        return container;
      } catch (error) {
        console.error(`❌ Failed to initialize container '${name}':`, error.message);
        throw error;
      }
    });
    await Promise.all(containerPromises);
    console.log('🎉 All Cosmos DB containers initialized successfully');
    return true;
  } catch (error) {
    console.error('💥 Failed to initialize Cosmos DB containers:', error);
    throw error;
  }
}

/**
 * Get container definitions for documentation/debugging
 */
export function getContainerDefinitions() {
  return CONTAINER_DEFINITIONS;
}