import { getGamesContainer } from './cosmosClient.js';
import fs from 'fs';

async function exportGames() {
  try {
    const container = getGamesContainer();
    const querySpec = { query: 'SELECT * FROM c', parameters: [] };
    const { resources: games } = await container.items.query(querySpec).fetchAll();
    fs.writeFileSync('games_export.json', JSON.stringify(games, null, 2));
    console.log(`Exported ${games.length} games to games_export.json`);
  } catch (error) {
    console.error('❌ Error exporting games:', error);
  }
}

exportGames();
