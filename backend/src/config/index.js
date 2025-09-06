import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Database configuration
  cosmos: {
    uri: process.env.COSMOS_DB_URI,
    key: process.env.COSMOS_DB_KEY,
    databaseName: process.env.COSMOS_DB_DATABASE_NAME || process.env.COSMOS_DB_NAME || 'scorekeeper',
    containers: {
      games: process.env.COSMOS_DB_GAMES_CONTAINER || 'games',
      goals: process.env.COSMOS_DB_GOALS_CONTAINER || 'goals',
      penalties: process.env.COSMOS_DB_PENALTIES_CONTAINER || 'penalties',
      rosters: process.env.COSMOS_DB_ROSTERS_CONTAINER || 'rosters',
      attendance: process.env.COSMOS_DB_ATTENDANCE_CONTAINER || 'attendance',
      otShootout: process.env.COSMOS_DB_OTSHOOTOUT_CONTAINER || 'ot-shootout',
      playerStats: process.env.COSMOS_DB_PLAYER_STATS_CONTAINER || 'player-stats',
      shotsOnGoal: process.env.COSMOS_DB_SHOTS_ON_GOAL_CONTAINER || 'shots-on-goal',
      historicalPlayerStats: process.env.COSMOS_DB_HISTORICAL_PLAYER_STATS_CONTAINER || 'historical-player-stats'
    }
  },

  // External services
  tts: {
    enabled: process.env.GOOGLE_TTS_ENABLED !== 'false',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY
  },

  // Application settings
  cache: {
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    ttl: parseInt(process.env.CACHE_TTL) || 3600000 // 1 hour
  },

  // Security settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false'
  }
};

// Validate required configuration
export function validateConfig() {
  const required = [
    'cosmos.uri',
    'cosmos.key'
  ];

  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
    }
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}
