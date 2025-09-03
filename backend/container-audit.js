import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_URI,
  key: process.env.COSMOS_DB_KEY
});
const db = client.database('scorekeeper');

const containers = [
  'games',
  'ot-shootout',
  'settings',
  'penalties',
  'team-rosters',
  'shots-on-goal',
  'goals',
  'app-settings',
  'rink-reports',
  'rosters',
  'historical-player-stats',
  'attendance',
  'game-attendance',
  'player-stats'
];

async function auditAllContainers() {
  console.log('🔍 COMPREHENSIVE CONTAINER AUDIT\n');
  console.log('=' .repeat(50));

  for (const containerName of containers) {
    try {
      const container = db.container(containerName);
      const { resources } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll();
      const count = resources[0] || 0;

      console.log(`\n📦 ${containerName}:`);
      console.log(`   Documents: ${count}`);

      if (count > 0 && count <= 5) {
        // Show sample data for small containers
        const { resources: samples } = await container.items.query('SELECT TOP 3 * FROM c').fetchAll();
        console.log(`   Sample data:`);
        samples.forEach((doc, index) => {
          const keys = Object.keys(doc).filter(k => !k.startsWith('_'));
          console.log(`     Doc ${index + 1}: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
        });
      }

      // Status indicator
      if (count === 0) {
        console.log(`   ⚠️  STATUS: EMPTY - Consider deletion`);
      } else if (count > 0) {
        console.log(`   ✅ STATUS: ACTIVE - Has data`);
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎯 AUDIT COMPLETE');
}

auditAllContainers();
