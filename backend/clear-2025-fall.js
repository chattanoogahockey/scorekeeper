import { getDatabase } from './cosmosClient.js';

async function clear2025FallStats() {
  try {
    const db = getDatabase();
    const container = db.container('player-stats');
    const query = 'SELECT * FROM c WHERE c.year = @year AND c.season = @season';
    const { resources } = await container.items.query({
      query: query,
      parameters: [
        { name: '@year', value: '2025' },
        { name: '@season', value: 'Fall' }
      ]
    }).fetchAll();

    console.log('Found', resources.length, '2025 Fall player stats to delete');

    for (const item of resources) {
      await container.item(item.id, item._partitionKey || item.id).delete();
      console.log('Deleted:', item.playerName);
    }

    console.log('✅ Cleared 2025 Fall player stats');
  } catch(e) {
    console.log('Error:', e.message);
  }
}

clear2025FallStats();
