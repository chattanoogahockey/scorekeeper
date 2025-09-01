#!/usr/bin/env node

/**
 * Fixed Field Standardization Migration Script
 * 
 * This script fixes the critical field inconsistencies identified in the analysis
 * Phase 1: Remove duplicate fields and standardize naming
 * Fixed partition key handling for Cosmos DB
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

async function standardizeFields() {
  console.log('🔧 STARTING FIELD STANDARDIZATION MIGRATION\n');
  console.log('Phase 1: Critical Field Standardization\n');
  
  const migrationLog = [];
  
  try {
    // Fix PENALTIES container
    console.log('📝 Standardizing PENALTIES container...');
    const penaltiesContainer = database.container('penalties');
    const { resources: penalties } = await penaltiesContainer.items.query('SELECT * FROM c').fetchAll();
    
    let penaltiesFixed = 0;
    for (const penalty of penalties) {
      let updated = false;
      const originalDoc = { ...penalty };
      
      // Remove penalizedPlayer if playerName exists
      if (penalty.penalizedPlayer && penalty.playerName) {
        if (penalty.penalizedPlayer !== penalty.playerName) {
          console.log(`   ⚠️  Mismatch: penalizedPlayer="${penalty.penalizedPlayer}" vs playerName="${penalty.playerName}"`);
          // Keep the more complete one
          penalty.playerName = penalty.playerName || penalty.penalizedPlayer;
        }
        delete penalty.penalizedPlayer;
        updated = true;
      } else if (penalty.penalizedPlayer && !penalty.playerName) {
        // Move penalizedPlayer to playerName
        penalty.playerName = penalty.penalizedPlayer;
        delete penalty.penalizedPlayer;
        updated = true;
      }
      
      // Remove penalizedTeam if teamName exists
      if (penalty.penalizedTeam && penalty.teamName) {
        if (penalty.penalizedTeam !== penalty.teamName) {
          console.log(`   ⚠️  Mismatch: penalizedTeam="${penalty.penalizedTeam}" vs teamName="${penalty.teamName}"`);
          penalty.teamName = penalty.teamName || penalty.penalizedTeam;
        }
        delete penalty.penalizedTeam;
        updated = true;
      } else if (penalty.penalizedTeam && !penalty.teamName) {
        // Move penalizedTeam to teamName
        penalty.teamName = penalty.penalizedTeam;
        delete penalty.penalizedTeam;
        updated = true;
      }
      
      if (updated) {
        // Use proper partition key - typically the id itself for these containers
        await penaltiesContainer.item(penalty.id).replace(penalty);
        penaltiesFixed++;
        migrationLog.push({
          container: 'penalties',
          id: penalty.id,
          changes: `Standardized player/team fields`,
          before: originalDoc,
          after: penalty
        });
        console.log(`   ✅ Fixed penalty ${penalty.id}`);
      }
    }
    console.log(`   ✅ Fixed ${penaltiesFixed} penalty records\n`);
    
    // Fix GOALS container
    console.log('⚽ Standardizing GOALS container...');
    const goalsContainer = database.container('goals');
    const { resources: goals } = await goalsContainer.items.query('SELECT * FROM c').fetchAll();
    
    let goalsFixed = 0;
    for (const goal of goals) {
      let updated = false;
      const originalDoc = { ...goal };
      
      // Remove scorer if playerName exists
      if (goal.scorer && goal.playerName) {
        if (goal.scorer !== goal.playerName) {
          console.log(`   ⚠️  Mismatch: scorer="${goal.scorer}" vs playerName="${goal.playerName}"`);
          goal.playerName = goal.playerName || goal.scorer;
        }
        delete goal.scorer;
        updated = true;
      } else if (goal.scorer && !goal.playerName) {
        // Move scorer to playerName
        goal.playerName = goal.scorer;
        delete goal.scorer;
        updated = true;
      }
      
      // Remove scoringTeam if teamName exists
      if (goal.scoringTeam && goal.teamName) {
        if (goal.scoringTeam !== goal.teamName) {
          console.log(`   ⚠️  Mismatch: scoringTeam="${goal.scoringTeam}" vs teamName="${goal.teamName}"`);
          goal.teamName = goal.teamName || goal.scoringTeam;
        }
        delete goal.scoringTeam;
        updated = true;
      } else if (goal.scoringTeam && !goal.teamName) {
        // Move scoringTeam to teamName
        goal.teamName = goal.scoringTeam;
        delete goal.scoringTeam;
        updated = true;
      }
      
      if (updated) {
        await goalsContainer.item(goal.id).replace(goal);
        goalsFixed++;
        migrationLog.push({
          container: 'goals',
          id: goal.id,
          changes: `Standardized player/team fields`,
          before: originalDoc,
          after: goal
        });
        console.log(`   ✅ Fixed goal ${goal.id}`);
      }
    }
    console.log(`   ✅ Fixed ${goalsFixed} goal records\n`);
    
    // Fix SHOTS-ON-GOAL container timestamp
    console.log('🥅 Standardizing SHOTS-ON-GOAL container...');
    const shotsContainer = database.container('shots-on-goal');
    const { resources: shots } = await shotsContainer.items.query('SELECT * FROM c').fetchAll();
    
    let shotsFixed = 0;
    for (const shot of shots) {
      let updated = false;
      const originalDoc = { ...shot };
      
      // Rename createdAt to recordedAt
      if (shot.createdAt && !shot.recordedAt) {
        shot.recordedAt = shot.createdAt;
        delete shot.createdAt;
        updated = true;
      }
      
      // Optional: Remove team ID fields if team names are sufficient
      // This depends on whether IDs are needed for joins
      if (shot.homeTeamId && shot.homeTeam && shot.homeTeamId === shot.homeTeam) {
        delete shot.homeTeamId;
        updated = true;
      }
      if (shot.awayTeamId && shot.awayTeam && shot.awayTeamId === shot.awayTeam) {
        delete shot.awayTeamId;
        updated = true;
      }
      
      if (updated) {
        await shotsContainer.item(shot.id).replace(shot);
        shotsFixed++;
        migrationLog.push({
          container: 'shots-on-goal',
          id: shot.id,
          changes: `Standardized timestamp and team fields`,
          before: originalDoc,
          after: shot
        });
        console.log(`   ✅ Fixed shot ${shot.id}`);
      }
    }
    console.log(`   ✅ Fixed ${shotsFixed} shots records\n`);
    
    // Summary
    console.log('📊 MIGRATION SUMMARY:\n');
    console.log(`   Penalties fixed: ${penaltiesFixed}`);
    console.log(`   Goals fixed: ${goalsFixed}`);
    console.log(`   Shots fixed: ${shotsFixed}`);
    console.log(`   Total records updated: ${penaltiesFixed + goalsFixed + shotsFixed}\n`);
    
    if (migrationLog.length > 0) {
      console.log('📋 DETAILED CHANGES LOG:\n');
      migrationLog.forEach((log, index) => {
        console.log(`${index + 1}. ${log.container} (${log.id}): ${log.changes}`);
      });
    }
    
    return migrationLog;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
standardizeFields()
  .then((log) => {
    console.log('\n🎉 Field standardization migration completed successfully!');
    console.log('\n🔍 Next steps:');
    console.log('   1. Run field consistency analysis again to verify changes');
    console.log('   2. Update backend API code to remove references to old field names');
    console.log('   3. Update frontend components');
    console.log('   4. Test end-to-end functionality');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
