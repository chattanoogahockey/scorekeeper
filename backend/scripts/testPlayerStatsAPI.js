#!/usr/bin/env node

/**
 * Test Player Stats API with new container name
 * 
 * This script tests that the player stats API works with the renamed container
 */

import { config } from '../config/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function testPlayerStatsAPI() {
  console.log('🧪 Testing player stats API with new container name...\n');
  
  try {
    // Import and test the cosmosClient functions
    const { getPlayerStatsContainer, getContainerDefinitions } = await import('../cosmosClient.js');
    
    console.log('✅ Successfully imported getPlayerStatsContainer function');
    
    // Test container access
    const playerStatsContainer = getPlayerStatsContainer();
    console.log('✅ Successfully got player-stats container reference');
    
    // Test container definitions
    const definitions = getContainerDefinitions();
    console.log('✅ Container definitions loaded');
    console.log(`   player-stats container name: ${definitions['player-stats'].name}`);
    
    // Test querying the container
    const { resources: stats } = await playerStatsContainer.items.query('SELECT * FROM c').fetchAll();
    console.log(`✅ Successfully queried player-stats container: ${stats.length} documents found`);
    
    if (stats.length > 0) {
      console.log('\n📊 Sample player stats:');
      stats.slice(0, 3).forEach((stat, index) => {
        console.log(`   ${index + 1}. ${stat.playerName} (${stat.division}): ${stat.goals}G ${stat.assists}A ${stat.points}P`);
      });
    }
    
    console.log('\n🎯 All tests passed! The rename was successful.');
    
  } catch (error) {
    console.error('❌ Error testing player stats API:', error.message);
    process.exit(1);
  }
}

// Run the test
testPlayerStatsAPI()
  .then(() => {
    console.log('\n🏁 Player stats API test complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
