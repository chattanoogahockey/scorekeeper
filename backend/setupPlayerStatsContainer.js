/**
 * Setup script for player-stats container
 * This container will store pre-calculated analytics for quick AI announcer access
 */

import { getDatabase } from './cosmosClient.js';

async function setupPlayerStatsContainer() {
  try {
    const database = await getDatabase();
    
    // Create playerStats container
    const { container } = await database.containers.createIfNotExists({
      id: 'playerStats',
      partitionKey: { path: '/playerId' }
    });
    
    console.log('Player stats container created successfully');
    return container;
  } catch (error) {
    console.error('Error setting up player stats container:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupPlayerStatsContainer()
    .then(() => {
      console.log('Setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { setupPlayerStatsContainer };
