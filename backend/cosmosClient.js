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
 */

const CONTAINER_DEFINITIONS = {
  // Global application settings
  settings: {
    name: 'settings',
    partitionKey: '/type',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/"_etag"/?' }]
    }
  },
  
  // Pre-aggregated analytics and statistics
  analytics: {
    name: 'analytics',
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
    name: 'rink_reports',
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
    name: 'games',
    partitionKey: '/league',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/league/?' },
        { path: '/division/?' },
        { path: '/eventType/?' },
        { path: '/submittedAt/?' },
        { path: '/gameDate/?' }
      ]
    }
  },
  
  // Player statistics and profiles
  players: {
    name: 'playerStats',
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
    name: 'goals',
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
    name: 'penalties',
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
    name: 'rosters',
    partitionKey: '/teamId',
    indexingPolicy: {
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/*' },
        { path: '/teamId/?' },
        { path: '/division/?' },
        { path: '/teamName/?' },
        { path: '/season/?' }
      ]
    }
  },
  
  // Game attendance tracking
  attendance: {
    name: 'attendance',
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
    name: 'otshootout',
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

if (!cosmosUri || !cosmosKey || !cosmosDatabase) {
  throw new Error(
    'Missing Cosmos DB configuration. Please ensure COSMOS_DB_URI, COSMOS_DB_KEY, and COSMOS_DB_NAME are set.'
  );
}

// Initialize Cosmos DB client
const client = new CosmosClient({
  endpoint: cosmosUri,
  key: cosmosKey,
});

const database = client.database(cosmosDatabase);

/**
 * Get database instance
 */
export function getDatabase() {
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
  return database.container(CONTAINER_DEFINITIONS.settings.name);
}

// Analytics container - Pre-aggregated statistics  
export function getAnalyticsContainer() {
  return database.container(CONTAINER_DEFINITIONS.analytics.name);
}

// Rink reports container - Weekly division summaries
export function getRinkReportsContainer() {
  return database.container(CONTAINER_DEFINITIONS.rink_reports.name);
}

// Games container - Game records and submissions
export function getGamesContainer() {
  return database.container(CONTAINER_DEFINITIONS.games.name);
}

// Players container - Player statistics and profiles
export function getPlayersContainer() {
  return database.container(CONTAINER_DEFINITIONS.players.name);
}

// Goals container - Goal events and scoring data
export function getGoalsContainer() {
  return database.container(CONTAINER_DEFINITIONS.goals.name);
}

// Penalties container - Penalty events and infractions
export function getPenaltiesContainer() {
  return database.container(CONTAINER_DEFINITIONS.penalties.name);
}

// Rosters container - Team rosters and player assignments
export function getRostersContainer() {
  return database.container(CONTAINER_DEFINITIONS.rosters.name);
}

// Attendance container - Game attendance tracking
export function getAttendanceContainer() {
  return database.container(CONTAINER_DEFINITIONS.attendance.name);
}

// OT/Shootout container - Overtime and shootout results
export function getOTShootoutContainer() {
  return database.container(CONTAINER_DEFINITIONS.otshootout.name);
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
 * Test database connection and container accessibility
 */
export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connectivity
    const { resource: dbInfo } = await database.read();
    console.log(`✅ Connected to database: ${dbInfo.id}`);
    
    // Test container access
    const settingsContainer = getSettingsContainer();
    await settingsContainer.read();
    console.log('✅ Container access verified');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    throw error;
  }
}

/**
 * Get container definitions for documentation/debugging
 */
export function getContainerDefinitions() {
  return CONTAINER_DEFINITIONS;
}