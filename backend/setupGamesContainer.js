import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

const {
  COSMOS_DB_URI,
  COSMOS_DB_KEY,
  COSMOS_DB_NAME,
  COSMOS_DB_GAMES_CONTAINER,
} = process.env;

console.log('Debugging Environment Variables:');
console.log('COSMOS_DB_URI:', COSMOS_DB_URI);
console.log('COSMOS_DB_KEY:', COSMOS_DB_KEY ? 'Provided' : 'Not Provided');
console.log('COSMOS_DB_NAME:', COSMOS_DB_NAME);
console.log('COSMOS_DB_GAMES_CONTAINER:', COSMOS_DB_GAMES_CONTAINER);

const client = new CosmosClient({ endpoint: COSMOS_DB_URI, key: COSMOS_DB_KEY });
const database = client.database(COSMOS_DB_NAME);

async function setupGamesContainer() {
  try {
    // Create the container if it doesn't exist
    const { container } = await database.containers.createIfNotExists({
      id: COSMOS_DB_GAMES_CONTAINER,
      partitionKey: { paths: ['/league'] },
    });

    console.log(`Container '${COSMOS_DB_GAMES_CONTAINER}' is ready.`);

    // Placeholder games data
    const games = [
      { date: '2025-04-03', homeTeam: 'Bachstreet Boys', awayTeam: 'Purpetrators', league: 'Gold' },
      { date: '2025-04-03', homeTeam: 'Purpetrators', awayTeam: 'Bachstreet Boys', league: 'Gold' },
      { date: '2025-04-03', homeTeam: 'Skateful Dead', awayTeam: 'UTC', league: 'Gold' },
    ];

    // Insert games into the container
    for (const game of games) {
      await container.items.create(game);
      console.log(`Inserted game: ${game.homeTeam} vs ${game.awayTeam}`);
    }

    console.log('Games setup complete.');
  } catch (error) {
    console.error('Error setting up games container:', error);
  }
}

setupGamesContainer();
