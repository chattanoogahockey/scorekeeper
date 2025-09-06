/**
 * Centralized configuration for Hockey Scorekeeper 2.0
 * This file consolidates environment-specific settings
 * Updated: 2025-08-09 to ensure deployment includes this file
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join as pathJoin } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config({ path: pathJoin(__dirname, '../.env') });

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
    // Container names - Updated to use containers with actual data
    containers: {
      settings: process.env.COSMOS_CONTAINER_SETTINGS || 'settings', // Use old 'settings' (empty but consistent)
      rinkReports: process.env.COSMOS_CONTAINER_RINK_REPORTS || 'rink-reports',
      games: process.env.COSMOS_CONTAINER_GAMES || 'games', // Use 'games' (has real data)
      players: process.env.COSMOS_CONTAINER_PLAYERS || 'players',
      goals: process.env.COSMOS_CONTAINER_GOALS || 'goals', // Use 'goals' (has real data)
      penalties: process.env.COSMOS_CONTAINER_PENALTIES || 'penalties', // Use 'penalties' (has real data)
      rosters: process.env.COSMOS_CONTAINER_ROSTERS || 'rosters', // Use 'rosters' (has real data)
      attendance: process.env.COSMOS_CONTAINER_ATTENDANCE || 'attendance', // Use 'attendance' (has real data)
      otShootout: process.env.COSMOS_CONTAINER_OT_SHOOTOUT || 'ot-shootout', // Use 'ot-shootout' (has real data)
      shotsOnGoal: process.env.COSMOS_CONTAINER_SHOTS_ON_GOAL || 'shots-on-goal',
      historicalPlayerStats: process.env.COSMOS_CONTAINER_HISTORICAL_PLAYER_STATS || 'historical-player-stats',
      playerStats: process.env.COSMOS_CONTAINER_PLAYER_STATS || 'player-stats'
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
