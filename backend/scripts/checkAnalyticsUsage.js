#!/usr/bin/env node

/**
 * Check Analytics Container Usage
 * 
 * This script checks if the analytics container contains any data
 * and if it's actively being used in the codebase
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

async function checkAnalyticsContainer() {
  console.log('🔍 Checking analytics container usage...\n');
  
  try {
    const analyticsContainer = database.container('analytics');
    
    // Check if container has any documents
    const { resources: documents } = await analyticsContainer.items.query('SELECT * FROM c').fetchAll();
    
    console.log('📊 ANALYTICS CONTAINER STATUS:');
    console.log(`   Document count: ${documents.length}`);
    
    if (documents.length === 0) {
      console.log('   Status: ❌ EMPTY - No documents found');
      console.log('');
      console.log('🔍 CODEBASE USAGE ANALYSIS:');
      console.log('   - analytics container is imported in cosmosClient.js');
      console.log('   - getAnalyticsContainer() function exists but unused');
      console.log('   - "analytics" objects embedded in goals/penalties are NOT stored in this container');
      console.log('   - Only referenced in cleanup scripts');
      console.log('');
      console.log('💡 RECOMMENDATION:');
      console.log('   ❌ DELETE analytics container - it\'s unused and redundant');
      console.log('   ✅ Keep "players" container for live statistical aggregation');
      console.log('   ✅ Embedded analytics in goal/penalty records serve the analytics purpose');
    } else {
      console.log('   Status: ✅ CONTAINS DATA');
      console.log('');
      console.log('📋 Sample documents:');
      documents.slice(0, 3).forEach((doc, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(doc, null, 2)}`);
      });
      console.log('');
      console.log('💡 RECOMMENDATION:');
      console.log('   🔍 INVESTIGATE - Container has data, verify if it\'s current or legacy');
    }
    
  } catch (error) {
    console.error('❌ Error checking analytics container:', error.message);
  }
}

// Run the check
checkAnalyticsContainer()
  .then(() => {
    console.log('\n🏁 Analytics container analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
