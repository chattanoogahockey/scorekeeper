#!/usr/bin/env node

/**
 * Data Structure Analysis for Field Standardization
 * 
 * This script examines the actual data structure to understand
 * what fields need to be standardized
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

async function examineDataStructure() {
  console.log('🔍 EXAMINING DATA STRUCTURE FOR STANDARDIZATION\n');
  
  try {
    // Check PENALTIES container
    console.log('📝 PENALTIES Container Structure:');
    const penaltiesContainer = database.container('penalties');
    const { resources: penalties } = await penaltiesContainer.items.query('SELECT * FROM c').fetchAll();
    
    if (penalties.length > 0) {
      console.log(`   Found ${penalties.length} penalty records`);
      console.log('   Sample Record:');
      const sample = penalties[0];
      Object.keys(sample).forEach(key => {
        if (!key.startsWith('_')) {
          console.log(`      ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key]).substring(0, 50)}${JSON.stringify(sample[key]).length > 50 ? '...' : ''}`);
        }
      });
      
      // Check for field duplications
      const duplicates = {};
      penalties.forEach(penalty => {
        if (penalty.penalizedPlayer && penalty.playerName) {
          duplicates.penalizedPlayerVsPlayerName = duplicates.penalizedPlayerVsPlayerName || [];
          duplicates.penalizedPlayerVsPlayerName.push({
            id: penalty.id,
            penalizedPlayer: penalty.penalizedPlayer,
            playerName: penalty.playerName,
            match: penalty.penalizedPlayer === penalty.playerName
          });
        }
        if (penalty.penalizedTeam && penalty.teamName) {
          duplicates.penalizedTeamVsTeamName = duplicates.penalizedTeamVsTeamName || [];
          duplicates.penalizedTeamVsTeamName.push({
            id: penalty.id,
            penalizedTeam: penalty.penalizedTeam,
            teamName: penalty.teamName,
            match: penalty.penalizedTeam === penalty.teamName
          });
        }
      });
      
      if (Object.keys(duplicates).length > 0) {
        console.log('   Duplicate Fields Found:');
        Object.entries(duplicates).forEach(([type, records]) => {
          console.log(`      ${type}: ${records.length} records`);
          records.forEach(record => {
            console.log(`         ${record.id}: ${record.match ? '✅ MATCH' : '❌ MISMATCH'}`);
          });
        });
      }
    } else {
      console.log('   No penalty records found');
    }
    console.log('');
    
    // Check GOALS container
    console.log('⚽ GOALS Container Structure:');
    const goalsContainer = database.container('goals');
    const { resources: goals } = await goalsContainer.items.query('SELECT * FROM c').fetchAll();
    
    if (goals.length > 0) {
      console.log(`   Found ${goals.length} goal records`);
      console.log('   Sample Record:');
      const sample = goals[0];
      Object.keys(sample).forEach(key => {
        if (!key.startsWith('_')) {
          console.log(`      ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key]).substring(0, 50)}${JSON.stringify(sample[key]).length > 50 ? '...' : ''}`);
        }
      });
      
      // Check for field duplications
      const duplicates = {};
      goals.forEach(goal => {
        if (goal.scorer && goal.playerName) {
          duplicates.scorerVsPlayerName = duplicates.scorerVsPlayerName || [];
          duplicates.scorerVsPlayerName.push({
            id: goal.id,
            scorer: goal.scorer,
            playerName: goal.playerName,
            match: goal.scorer === goal.playerName
          });
        }
        if (goal.scoringTeam && goal.teamName) {
          duplicates.scoringTeamVsTeamName = duplicates.scoringTeamVsTeamName || [];
          duplicates.scoringTeamVsTeamName.push({
            id: goal.id,
            scoringTeam: goal.scoringTeam,
            teamName: goal.teamName,
            match: goal.scoringTeam === goal.teamName
          });
        }
      });
      
      if (Object.keys(duplicates).length > 0) {
        console.log('   Duplicate Fields Found:');
        Object.entries(duplicates).forEach(([type, records]) => {
          console.log(`      ${type}: ${records.length} records`);
          records.forEach(record => {
            console.log(`         ${record.id}: ${record.match ? '✅ MATCH' : '❌ MISMATCH'}`);
          });
        });
      }
    } else {
      console.log('   No goal records found');
    }
    console.log('');
    
    // Check SHOTS-ON-GOAL container
    console.log('🥅 SHOTS-ON-GOAL Container Structure:');
    const shotsContainer = database.container('shots-on-goal');
    const { resources: shots } = await shotsContainer.items.query('SELECT * FROM c').fetchAll();
    
    if (shots.length > 0) {
      console.log(`   Found ${shots.length} shot records`);
      console.log('   Sample Record:');
      const sample = shots[0];
      Object.keys(sample).forEach(key => {
        if (!key.startsWith('_')) {
          console.log(`      ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key]).substring(0, 50)}${JSON.stringify(sample[key]).length > 50 ? '...' : ''}`);
        }
      });
      
      // Check timestamp field
      const timestampFields = {};
      shots.forEach(shot => {
        if (shot.createdAt) timestampFields.createdAt = (timestampFields.createdAt || 0) + 1;
        if (shot.recordedAt) timestampFields.recordedAt = (timestampFields.recordedAt || 0) + 1;
      });
      
      console.log('   Timestamp Fields:');
      Object.entries(timestampFields).forEach(([field, count]) => {
        console.log(`      ${field}: ${count} records`);
      });
    } else {
      console.log('   No shot records found');
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

// Run the analysis
examineDataStructure()
  .then(() => {
    console.log('🏁 Data structure analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
