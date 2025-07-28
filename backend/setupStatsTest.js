// Simple test to create player-stats container
import { getDatabase } from './cosmosClient.js';

console.log('Starting container setup...');

try {
  const database = await getDatabase();
  console.log('Database connection successful');
  
  const { container } = await database.containers.createIfNotExists({
    id: 'playerStats',
    partitionKey: { path: '/playerId' }
  });
  
  console.log('Player stats container created successfully!');
} catch (error) {
  console.error('Error:', error.message);
}
