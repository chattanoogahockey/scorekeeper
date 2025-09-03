import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_URI,
  key: process.env.COSMOS_DB_KEY
});
const db = client.database('scorekeeper');

async function checkGameRecordsData() {
  try {
    const container = db.container('game-records');
    const { resources } = await container.items.query('SELECT TOP 10 * FROM c').fetchAll();

    console.log('Game-Records Container Data:');
    console.log('============================');
    console.log(`Total documents found: ${resources.length}`);
    console.log('');

    resources.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`- ID: ${doc.id}`);
      console.log(`- Game ID: ${doc.gameId || 'N/A'}`);
      console.log(`- Event Type: ${doc.eventType || 'N/A'}`);
      console.log(`- Recorded At: ${doc.recordedAt || 'N/A'}`);
      console.log(`- Keys: ${Object.keys(doc).join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.log(`Error checking game-records: ${error.message}`);
  }

  process.exit(0);
}

checkGameRecordsData();
