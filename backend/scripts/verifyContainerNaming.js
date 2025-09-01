#!/usr/bin/env node

/**
 * Verify Container Naming Consistency
 * 
 * This script checks that all container names follow the hyphenated naming convention
 * and verifies that all expected containers exist.
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

async function verifyContainerNaming() {
  console.log('🔍 Verifying container naming consistency...\n');
  
  try {
    // Get all containers in the database
    const { resources: containers } = await database.containers.readAll().fetchAll();
    const containerNames = containers.map(c => c.id).sort();
    
    console.log('📦 Found containers:');
    containerNames.forEach(name => console.log(`  - ${name}`));
    console.log();
    
    // Expected containers with hyphenated naming
    const expectedContainers = [
      'settings',
      'rink-reports',
      'games',
      'player-stats',
      'goals',
      'penalties',
      'rosters',
      'attendance',
      'ot-shootout',
      'shots-on-goal',
      'historical-player-stats'
    ];
    
    console.log('✅ Expected containers:');
    expectedContainers.forEach(name => console.log(`  - ${name}`));
    console.log();
    
    // Check for missing containers
    const missingContainers = expectedContainers.filter(name => !containerNames.includes(name));
    if (missingContainers.length > 0) {
      console.log('❌ Missing containers:');
      missingContainers.forEach(name => console.log(`  - ${name}`));
      console.log();
    }
    
    // Check for unexpected containers (old naming patterns)
    const oldNamingPatterns = ['otshootout', 'rink_reports', 'shotsongoal', 'players', 'analytics'];
    const foundOldNames = containerNames.filter(name => oldNamingPatterns.includes(name));
    
    if (foundOldNames.length > 0) {
      console.log('❌ Found containers with old naming:');
      foundOldNames.forEach(name => console.log(`  - ${name} (should be migrated)`));
      console.log();
    }
    
    // Check for extra containers
    const extraContainers = containerNames.filter(name => !expectedContainers.includes(name));
    if (extraContainers.length > 0) {
      console.log('⚠️  Extra containers found:');
      extraContainers.forEach(name => console.log(`  - ${name}`));
      console.log();
    }
    
    // Summary
    console.log('📋 Summary:');
    console.log(`  Total containers: ${containerNames.length}`);
    console.log(`  Expected containers: ${expectedContainers.length}`);
    console.log(`  Missing: ${missingContainers.length}`);
    console.log(`  Old naming found: ${foundOldNames.length}`);
    console.log(`  Extra containers: ${extraContainers.length}`);
    
    if (missingContainers.length === 0 && foundOldNames.length === 0) {
      console.log('\n✅ All container names are consistent with hyphenated naming convention!');
      return true;
    } else {
      console.log('\n❌ Container naming issues found that need attention.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying containers:', error.message);
    return false;
  }
}

// Run the verification
verifyContainerNaming()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
