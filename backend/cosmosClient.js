// Production-ready Cosmos DB client configuration
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { CosmosClient } from '@azure/cosmos';
import { config } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure environment variables
dotenv.config({ path: './.env' });

/**
 * Standardized Container Names (using hyphens consistently)
 * Can be overridden via environment variables for different environments
 */
const containerNames = config.cosmos.containers;

/**
 * Production Cosmos DB Container Definitions
 * 
 * Container Schema:
 * 1. settings - Global application settings (voice config, etc.)
 * 2. rink-reports - Weekly division summaries and articles
 * 3. games - Game records and submissions
 * 4. player-stats - Current season player statistics (live aggregation)
 * 5. goals - Goal events and scoring data
 * 6. penalties - Penalty events and infractions
 * 7. rosters - Team rosters and player assignments
 * 8. attendance - Game attendance tracking
 * 9. ot-shootout - Overtime and shootout results
 * 10. shots-on-goal - Shots on goal tracking and analytics
 * 11. historical-player-stats - Historical player career statistics
 */

const CONTAINER_DEFINITIONS = {
  // Global application settings
  'app-settings': {
    name: containerNames.settings,
    partitionKey: '/type',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }]
    }
  },
  
  // Weekly rink reports and articles
  'rink-reports': {
    name: containerNames.rinkReports,
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
  
  // Current season player statistics
  'player-stats': {
    name: containerNames.playerStats,
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
  
  // Team rosters and player assignments
  'team-rosters': {
    name: containerNames.rosters,
    partitionKey: '/teamName',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/teamName/?' },
        { path: '/division/?' },
        { path: '/season/?' },
        { path: '/players/[]/playerId/?' },
        { path: '/players/[]/name/?' }
      ]
    }
  },
  
  // Game attendance tracking
  'game-attendance': {
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
  
  // Shots on goal tracking
  'shots-on-goal': {
    name: containerNames.shotsOnGoal,
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
  },

  // Historical aggregate player stats (read-only after import)
  'historical-player-stats': {
    name: containerNames.historicalPlayerStats,
    partitionKey: '/division',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/division/?' },
        { path: '/year/?' },
        { path: '/playerName/?' }
      ]
    }
  }
};

// Environment variable configuration
const cosmosUri = config.cosmos.uri;
const cosmosKey = config.cosmos.key;
const cosmosDatabase = config.cosmos.database;

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
  return database.container(CONTAINER_DEFINITIONS['app-settings'].name);
}

// Rink reports container - Weekly division summaries
export function getRinkReportsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['rink-reports'].name);
}

// Games container - Game records and submissions
export function getGamesContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['game-records'].name);
}

// Player-stats container - Current season player statistics
export function getPlayerStatsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['player-stats'].name);
}

// Goals container - Goal events and scoring data
export function getGoalsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['goals'].name);
}

// Penalties container - Penalty events and infractions
export function getPenaltiesContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['penalties'].name);
}

// Rosters container - Team rosters and player assignments
export function getRostersContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['team-rosters'].name);
}

// Attendance container - Game attendance tracking
export function getAttendanceContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['game-attendance'].name);
}

// OT/Shootout container - Overtime and shootout results
export function getOTShootoutContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['ot-shootout'].name);
}

// Shots on Goal container - Shots on goal tracking and analytics
export function getShotsOnGoalContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['shots-on-goal'].name);
}

// Historical player stats container
export function getHistoricalPlayerStatsContainer() {
  if (!cosmosConfigured || !database) throw new Error('Cosmos DB not configured');
  return database.container(CONTAINER_DEFINITIONS['historical-player-stats'].name);
}

// Legacy aliases for backward compatibility (deprecated)
export function getTeamsContainer() {
  console.warn('getTeamsContainer is deprecated, use getPlayerStatsContainer or getRostersContainer');
  return getRostersContainer();
}

export function getPlayersContainer() {
  console.warn('getPlayersContainer is deprecated, use getPlayerStatsContainer');
  return getPlayerStatsContainer();
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

/**
 * Get standardized container names
 */
export function getContainerNames() {
  return containerNames;
}