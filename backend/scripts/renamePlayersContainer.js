#!/usr/bin/env node

/**
 * Rename "players" container to "player-stats"
 * 
 * This script:
 * 1. Creates new "player-stats" container
 * 2. Migrates all data from "players" to "player-stats"
 * 3. Deletes old "players" container
 * 4. Updates all code references
 */

import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const client = new CosmosClient({
  endpoint: config.cosmos.uri,
  key: config.cosmos.key
});

const database = client.database(config.cosmos.database);

async function renamePlayersContainer() {
  console.log('🔄 Renaming "players" container to "player-stats"\n');
  
  try {
    // Step 1: Check if old container exists and new doesn't
    const oldContainer = database.container('players');
    const newContainer = database.container('player-stats');
    
    console.log('📋 Step 1: Checking container status...');
    
    let oldExists = false;
    let newExists = false;
    
    try {
      await oldContainer.read();
      oldExists = true;
      console.log('   ✅ "players" container exists');
    } catch (e) {
      console.log('   ❌ "players" container not found');
      return;
    }
    
    try {
      await newContainer.read();
      newExists = true;
      console.log('   ⚠️  "player-stats" container already exists');
    } catch (e) {
      console.log('   ✅ "player-stats" container ready to create');
    }
    
    // Step 2: Get all data from old container
    console.log('\n📊 Step 2: Reading data from "players" container...');
    const { resources: playerData } = await oldContainer.items.query('SELECT * FROM c').fetchAll();
    console.log(`   Found ${playerData.length} documents to migrate`);
    
    // Step 3: Create new container with same partition key structure
    if (!newExists) {
      console.log('\n🆕 Step 3: Creating "player-stats" container...');
      await database.containers.create({
        id: 'player-stats',
        partitionKey: '/_partitionKey'  // Same as original players container
      });
      console.log('   ✅ "player-stats" container created');
    }
    
    // Step 4: Migrate data
    console.log('\n📥 Step 4: Migrating data...');
    for (const doc of playerData) {
      try {
        await newContainer.items.create(doc);
        console.log(`   ✅ Migrated: ${doc.playerName} (${doc.division})`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⚠️  Skipped duplicate: ${doc.playerName} (${doc.division})`);
        } else {
          console.log(`   ❌ Failed to migrate: ${doc.playerName} - ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Data migration complete!');
    console.log(`\n⚠️  Manual steps required:`);
    console.log(`   1. Update cosmosClient.js to use "player-stats"`);
    console.log(`   2. Update server.js references`);
    console.log(`   3. Test the application`);
    console.log(`   4. Delete old "players" container when confirmed working`);
    
  } catch (error) {
    console.error('❌ Error during container rename:', error.message);
    process.exit(1);
  }
}

// Run the rename
renamePlayersContainer()
  .then(() => {
    console.log('\n🏁 Container rename process complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
