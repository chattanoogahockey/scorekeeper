#!/usr/bin/env node

/**
 * Safe Field Standardization Migration Script
 * 
 * This script fixes the critical field inconsistencies using upsert operations
 * to avoid partition key issues
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

async function safeStandardizeFields() {
  console.log('🔧 STARTING SAFE FIELD STANDARDIZATION MIGRATION\n');
  console.log('Using upsert operations to avoid partition key issues\n');
  
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
      
      // Remove penalizedPlayer if playerName exists (they're identical)
      if (penalty.penalizedPlayer && penalty.playerName) {
        delete penalty.penalizedPlayer;
        updated = true;
      } else if (penalty.penalizedPlayer && !penalty.playerName) {
        // Move penalizedPlayer to playerName
        penalty.playerName = penalty.penalizedPlayer;
        delete penalty.penalizedPlayer;
        updated = true;
      }
      
      // Remove penalizedTeam if teamName exists (they're identical)
      if (penalty.penalizedTeam && penalty.teamName) {
        delete penalty.penalizedTeam;
        updated = true;
      } else if (penalty.penalizedTeam && !penalty.teamName) {
        // Move penalizedTeam to teamName
        penalty.teamName = penalty.penalizedTeam;
        delete penalty.penalizedTeam;
        updated = true;
      }
      
      if (updated) {
        // Use upsert operation which handles partition keys properly
        await penaltiesContainer.items.upsert(penalty);
        penaltiesFixed++;
        migrationLog.push({
          container: 'penalties',
          id: penalty.id,
          changes: `Removed duplicate fields: ${originalDoc.penalizedPlayer ? 'penalizedPlayer' : ''} ${originalDoc.penalizedTeam ? 'penalizedTeam' : ''}`.trim(),
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
      
      // Remove scorer if playerName exists (they're identical)
      if (goal.scorer && goal.playerName) {
        delete goal.scorer;
        updated = true;
      } else if (goal.scorer && !goal.playerName) {
        // Move scorer to playerName
        goal.playerName = goal.scorer;
        delete goal.scorer;
        updated = true;
      }
      
      // Remove scoringTeam if teamName exists (they're identical)
      if (goal.scoringTeam && goal.teamName) {
        delete goal.scoringTeam;
        updated = true;
      } else if (goal.scoringTeam && !goal.teamName) {
        // Move scoringTeam to teamName
        goal.teamName = goal.scoringTeam;
        delete goal.scoringTeam;
        updated = true;
      }
      
      if (updated) {
        // Use upsert operation
        await goalsContainer.items.upsert(goal);
        goalsFixed++;
        migrationLog.push({
          container: 'goals',
          id: goal.id,
          changes: `Removed duplicate fields: ${originalDoc.scorer ? 'scorer' : ''} ${originalDoc.scoringTeam ? 'scoringTeam' : ''}`.trim(),
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
      const changesLog = [];
      
      // Rename createdAt to recordedAt
      if (shot.createdAt && !shot.recordedAt) {
        shot.recordedAt = shot.createdAt;
        delete shot.createdAt;
        updated = true;
        changesLog.push('createdAt→recordedAt');
      }
      
      // Remove team ID fields if they're duplicates of team names
      if (shot.homeTeamId && shot.homeTeam && shot.homeTeamId === shot.homeTeam) {
        delete shot.homeTeamId;
        updated = true;
        changesLog.push('removed homeTeamId');
      }
      if (shot.awayTeamId && shot.awayTeam && shot.awayTeamId === shot.awayTeam) {
        delete shot.awayTeamId;
        updated = true;
        changesLog.push('removed awayTeamId');
      }
      
      if (updated) {
        await shotsContainer.items.upsert(shot);
        shotsFixed++;
        migrationLog.push({
          container: 'shots-on-goal',
          id: shot.id,
          changes: changesLog.join(', '),
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
safeStandardizeFields()
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
