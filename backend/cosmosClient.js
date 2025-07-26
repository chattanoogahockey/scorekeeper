import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

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
  COSMOS_DB_GOAL_EVENTS_CONTAINER,
  COSMOS_DB_PENALTY_EVENTS_CONTAINER,
} = process.env;

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

export function getGoalEventsContainer() {
  return getContainer('COSMOS_DB_GOAL_EVENTS_CONTAINER');
}

export function getPenaltyEventsContainer() {
  return getContainer('COSMOS_DB_PENALTY_EVENTS_CONTAINER');
}

export function getGameEventsContainer() {
  return getContainer('COSMOS_DB_ATTENDANCE_CONTAINER'); // Using gameEvents container for all game events
}