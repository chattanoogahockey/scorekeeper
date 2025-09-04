#!/usr/bin/env node
import { getDatabase } from '../cosmosClient.js';

async function checkAllContainers() {
  try {
    const db = getDatabase();
    const containers = [
      'games', 'goals', 'penalties', 'attendance', 'ot-shootout',
      'shots-on-goal', 'historical-player-stats', 'player-stats',
      'rink-reports', 'settings', 'rosters'
    ];

    console.log('=== Container Data Check ===\n');

    for (const containerName of containers) {
      try {
        const container = db.container(containerName);
        const { resources } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll();
        const count = resources[0] || 0;
        console.log(`${containerName}: ${count} documents`);

        if (count > 0 && count <= 5) {
          // Show sample data for small containers
          const { resources: samples } = await container.items.query('SELECT TOP 3 * FROM c').fetchAll();
          console.log(`  Sample from ${containerName}:`);
          samples.forEach((doc, index) => {
            console.log(`    ${index + 1}. ID: ${doc.id}, Type: ${doc.eventType || doc.type || 'N/A'}`);
          });
        }
      } catch (error) {
        console.log(`${containerName}: Error - ${error.message.split('Message:')[0].trim()}`);
      }
    }
  } catch (error) {
    console.error('Error checking containers:', error.message);
  }
}

checkAllContainers();
