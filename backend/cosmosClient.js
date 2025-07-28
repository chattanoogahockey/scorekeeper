// Use ES module-compatible code to get the directory name
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Change the working directory to the backend folder
process.chdir(__dirname);
console.log('Changed working directory to:', process.cwd());

// Ensure dotenv is configured after setting the working directory
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { CosmosClient } from '@azure/cosmos';

/*
 * This module initializes a connection to Azure Cosmos DB and provides
 * convenience functions to access specific containers. The connection
 * details (URI, key, and database name) are read from environment
 * variables. See `.env.example` for the required variables.
 */

const {
  COSMOS_DB_URI,
  COSMOS_DB_ENDPOINT,
  COSMOS_ENDPOINT,
  COSMOS_DB_KEY,
  COSMOS_KEY,
  COSMOS_DB_NAME,
  COSMOS_DB_DATABASE_ID,
  COSMOS_DB_GAMES_CONTAINER,
  COSMOS_DB_TEAMS_CONTAINER,
  COSMOS_DB_ROSTERS_CONTAINER,
  COSMOS_DB_ATTENDANCE_CONTAINER,
  COSMOS_DB_GAME_EVENTS_CONTAINER,
} = process.env;

// Debugging: Log critical environment variables to verify they are loaded
console.log('COSMOS_DB_URI:', process.env.COSMOS_DB_URI);
console.log('COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY);
console.log('COSMOS_DB_NAME:', process.env.COSMOS_DB_NAME);

// Log the current working directory for debugging
console.log('Current working directory:', process.cwd());

// Log all relevant environment variables for debugging
console.log('Environment Variables:', {
  COSMOS_DB_URI: process.env.COSMOS_DB_URI,
  COSMOS_DB_KEY: process.env.COSMOS_DB_KEY,
  COSMOS_DB_NAME: process.env.COSMOS_DB_NAME,
});

// Support multiple environment variable naming conventions
const cosmosUri = COSMOS_DB_URI || COSMOS_DB_ENDPOINT || COSMOS_ENDPOINT;
const cosmosKey = COSMOS_DB_KEY || COSMOS_KEY;
const cosmosDatabase = COSMOS_DB_NAME || COSMOS_DB_DATABASE_ID;

if (!cosmosUri || !cosmosKey || !cosmosDatabase) {
  throw new Error(
    'Missing Cosmos DB configuration. Please ensure the endpoint, key and database name are set via COSMOS_DB_URI / COSMOS_DB_ENDPOINT, COSMOS_DB_KEY / COSMOS_KEY, and COSMOS_DB_NAME / COSMOS_DB_DATABASE_ID.'
  );
}

const client = new CosmosClient({
  endpoint: cosmosUri,
  key: cosmosKey,
});

const database = client.database(cosmosDatabase);

export function getDatabase() {
  return database;
}

/**
 * Returns a reference to a container by name. Throws if the container name is
 * undefined in the environment. Container objects can be used to query,
 * create, or update items.
 *
 * @param {string} containerNameEnvVar The name of the environment variable
 *   storing the container name.
 */
function getContainer(containerNameEnvVar) {
  const containerName = process.env[containerNameEnvVar];
  if (!containerName) {
    throw new Error(`Missing container name for ${containerNameEnvVar}`);
  }
  return database.container(containerName);
}

export function getGamesContainer() {
  return getContainer('COSMOS_DB_GAMES_CONTAINER');
}

export function getTeamsContainer() {
  return getContainer('COSMOS_DB_TEAMS_CONTAINER');
}

export function getRostersContainer() {
  return getContainer('COSMOS_DB_ROSTERS_CONTAINER');
}

export function getAttendanceContainer() {
  return getContainer('COSMOS_DB_ATTENDANCE_CONTAINER');
}

export function getGameEventsContainer() {
  return getContainer('COSMOS_DB_GAME_EVENTS_CONTAINER');
}

export function getPlayerStatsContainer() {
  return database.container('playerStats');
}

export async function testDatabaseConnection() {
  try {
    const container = getGamesContainer(); // Using the games container for testing
    const { resources: items } = await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
    console.log('Database connection successful. Sample item:', items[0]);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}