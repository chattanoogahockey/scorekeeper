/**
 * Centralized configuration for Hockey Scorekeeper 2.0
 * This file consolidates environment-specific settings
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isDevelopment,
  debug: isDevelopment || process.env.DEBUG === 'true',
  
  // Server
  port: process.env.PORT || 3001,
  
  // Cosmos DB - Standardized variables only
  cosmos: {
    uri: process.env.COSMOS_DB_URI,
    key: process.env.COSMOS_DB_KEY,
    database: process.env.COSMOS_DB_NAME,
    // Container names with consistent hyphenated naming
    containers: {
      settings: process.env.COSMOS_CONTAINER_SETTINGS || 'settings',
      analytics: process.env.COSMOS_CONTAINER_ANALYTICS || 'analytics',
      rinkReports: process.env.COSMOS_CONTAINER_RINK_REPORTS || 'rink-reports',
      games: process.env.COSMOS_CONTAINER_GAMES || 'games',
      players: process.env.COSMOS_CONTAINER_PLAYERS || 'players',
      goals: process.env.COSMOS_CONTAINER_GOALS || 'goals',
      penalties: process.env.COSMOS_CONTAINER_PENALTIES || 'penalties',
      rosters: process.env.COSMOS_CONTAINER_ROSTERS || 'rosters',
      attendance: process.env.COSMOS_CONTAINER_ATTENDANCE || 'attendance',
      otShootout: process.env.COSMOS_CONTAINER_OT_SHOOTOUT || 'ot-shootout',
      shotsOnGoal: process.env.COSMOS_CONTAINER_SHOTS_ON_GOAL || 'shots-on-goal'
    }
  },
  
  // Google Cloud TTS
  googleTts: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    credentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  },
  
  // Default Voice Configuration
  voices: {
    default: {
      male: 'en-US-Studio-Q',
      female: 'en-US-Studio-O'
    }
  },
  
  // API Configuration
  api: {
    requestTimeout: 30000,
    maxRetries: 3
  },
  
  // Logging
  logging: {
    level: isDevelopment ? 'debug' : 'info',
    enableRequestLogging: isDevelopment
  }
};

export default config;
