#!/usr/bin/env node
import { getDatabase } from '../cosmosClient.js';

async function checkContainers() {
  try {
    const db = getDatabase();
    const containers = ['rosters', 'team-rosters'];

    for (const containerName of containers) {
      try {
        const container = db.container(containerName);
        const { resources } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll();
        console.log(`${containerName}: ${resources[0]} documents`);

        // Also get a sample document to see the structure
        const { resources: sample } = await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
        if (sample.length > 0) {
          console.log(`${containerName} sample:`, JSON.stringify(sample[0], null, 2));
        }
      } catch (error) {
        console.log(`${containerName}: Error - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error checking containers:', error.message);
  }
}

checkContainers();
