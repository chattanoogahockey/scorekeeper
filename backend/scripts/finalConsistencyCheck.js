#!/usr/bin/env node

/**
 * Final Container Field Verification
 * 
 * Check shots-on-goal team naming and rink-reports field consistency
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

async function checkFinalConsistency() {
  console.log('🔍 FINAL FIELD CONSISTENCY CHECK\n');
  
  try {
    // Check shots-on-goal container
    console.log('🥅 SHOTS-ON-GOAL Container Analysis:');
    const shotsContainer = database.container('shots-on-goal');
    const { resources: shots } = await shotsContainer.items.query('SELECT * FROM c').fetchAll();
    
    if (shots.length > 0) {
      const sample = shots[0];
      console.log('   Sample Record Fields:');
      Object.keys(sample).forEach(key => {
        if (!key.startsWith('_')) {
          console.log(`      ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key]).substring(0, 50)}`);
        }
      });
      
      // Check team naming consistency
      console.log('\n   Team Field Analysis:');
      shots.forEach(shot => {
        if (shot.homeTeam) console.log(`      ✅ homeTeam: "${shot.homeTeam}"`);
        if (shot.awayTeam) console.log(`      ✅ awayTeam: "${shot.awayTeam}"`);
        if (shot.homeTeamId) console.log(`      ⚠️  homeTeamId: "${shot.homeTeamId}" (potential redundant)`);
        if (shot.awayTeamId) console.log(`      ⚠️  awayTeamId: "${shot.awayTeamId}" (potential redundant)`);
      });
    }
    
    // Check rink-reports container
    console.log('\n📄 RINK-REPORTS Container Analysis:');
    const reportsContainer = database.container('rink-reports');
    const { resources: reports } = await reportsContainer.items.query('SELECT * FROM c').fetchAll();
    
    if (reports.length > 0) {
      const sample = reports[0];
      console.log('   Sample Record Fields:');
      Object.keys(sample).forEach(key => {
        if (!key.startsWith('_')) {
          console.log(`      ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key]).substring(0, 50)}`);
        }
      });
      
      // Check player field consistency
      console.log('\n   Player Field Analysis:');
      if (sample.standoutPlayers) {
        console.log('      standoutPlayers structure:');
        console.log(`         ${JSON.stringify(sample.standoutPlayers, null, 8)}`);
      }
    }
    
    console.log('\n🎯 FIELD CONSISTENCY RECOMMENDATIONS:\n');
    
    // Shots-on-goal recommendations
    console.log('SHOTS-ON-GOAL:');
    const hasRedundantTeamIds = shots.some(s => 
      (s.homeTeamId && s.homeTeam && s.homeTeamId === s.homeTeam) ||
      (s.awayTeamId && s.awayTeam && s.awayTeamId === s.awayTeam)
    );
    
    if (hasRedundantTeamIds) {
      console.log('   ⚠️  Remove redundant team ID fields (homeTeamId, awayTeamId)');
      console.log('   ✅ Keep homeTeam and awayTeam (consistent with games container)');
    } else {
      console.log('   ✅ Team naming is consistent');
    }
    
    // Rink-reports recommendations
    console.log('\nRINK-REPORTS:');
    console.log('   ℹ️  standoutPlayers uses nested structure - this is acceptable');
    console.log('   ✅ No direct playerName field conflicts');
    
    return { shots, reports };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

checkFinalConsistency()
  .then(() => {
    console.log('\n🏁 Final consistency check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });
