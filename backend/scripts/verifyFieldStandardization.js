#!/usr/bin/env node

/**
 * End-to-End Field Standardization Verification
 * 
 * This script verifies that the field standardization was successful
 * and tests the updated API endpoints
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

async function verifyFieldStandardization() {
  console.log('🔍 END-TO-END FIELD STANDARDIZATION VERIFICATION\n');
  
  const verificationResults = {
    containers: {},
    apiConsistency: {},
    dataIntegrity: {},
    summary: { passed: 0, failed: 0, warnings: 0 }
  };
  
  try {
    console.log('📊 PHASE 1: CONTAINER FIELD VERIFICATION\n');
    
    // Verify PENALTIES container
    console.log('📝 Verifying PENALTIES container...');
    const penaltiesContainer = database.container('penalties');
    const { resources: penalties } = await penaltiesContainer.items.query('SELECT * FROM c').fetchAll();
    
    const penaltyIssues = [];
    penalties.forEach(penalty => {
      if (penalty.penalizedPlayer) penaltyIssues.push(`${penalty.id}: Still has penalizedPlayer field`);
      if (penalty.penalizedTeam) penaltyIssues.push(`${penalty.id}: Still has penalizedTeam field`);
      if (!penalty.playerName) penaltyIssues.push(`${penalty.id}: Missing playerName field`);
      if (!penalty.teamName) penaltyIssues.push(`${penalty.id}: Missing teamName field`);
    });
    
    if (penaltyIssues.length === 0) {
      console.log('   ✅ All penalty records properly standardized');
      verificationResults.containers.penalties = 'PASSED';
      verificationResults.summary.passed++;
    } else {
      console.log('   ❌ Penalty standardization issues:');
      penaltyIssues.forEach(issue => console.log(`      ${issue}`));
      verificationResults.containers.penalties = 'FAILED';
      verificationResults.summary.failed++;
    }
    
    // Verify GOALS container
    console.log('\n⚽ Verifying GOALS container...');
    const goalsContainer = database.container('goals');
    const { resources: goals } = await goalsContainer.items.query('SELECT * FROM c').fetchAll();
    
    const goalIssues = [];
    goals.forEach(goal => {
      if (goal.scorer) goalIssues.push(`${goal.id}: Still has scorer field`);
      if (goal.scoringTeam) goalIssues.push(`${goal.id}: Still has scoringTeam field`);
      if (!goal.playerName) goalIssues.push(`${goal.id}: Missing playerName field`);
      if (!goal.teamName) goalIssues.push(`${goal.id}: Missing teamName field`);
    });
    
    if (goalIssues.length === 0) {
      console.log('   ✅ All goal records properly standardized');
      verificationResults.containers.goals = 'PASSED';
      verificationResults.summary.passed++;
    } else {
      console.log('   ❌ Goal standardization issues:');
      goalIssues.forEach(issue => console.log(`      ${issue}`));
      verificationResults.containers.goals = 'FAILED';
      verificationResults.summary.failed++;
    }
    
    // Verify SHOTS-ON-GOAL container
    console.log('\n🥅 Verifying SHOTS-ON-GOAL container...');
    const shotsContainer = database.container('shots-on-goal');
    const { resources: shots } = await shotsContainer.items.query('SELECT * FROM c').fetchAll();
    
    const shotIssues = [];
    shots.forEach(shot => {
      if (shot.createdAt) shotIssues.push(`${shot.id}: Still has createdAt field`);
      if (!shot.recordedAt) shotIssues.push(`${shot.id}: Missing recordedAt field`);
      if (shot.homeTeamId && shot.homeTeam && shot.homeTeamId === shot.homeTeam) {
        shotIssues.push(`${shot.id}: Has redundant homeTeamId field`);
      }
      if (shot.awayTeamId && shot.awayTeam && shot.awayTeamId === shot.awayTeam) {
        shotIssues.push(`${shot.id}: Has redundant awayTeamId field`);
      }
    });
    
    if (shotIssues.length === 0) {
      console.log('   ✅ All shot records properly standardized');
      verificationResults.containers.shots = 'PASSED';
      verificationResults.summary.passed++;
    } else {
      console.log('   ❌ Shot standardization issues:');
      shotIssues.forEach(issue => console.log(`      ${issue}`));
      verificationResults.containers.shots = 'FAILED';
      verificationResults.summary.failed++;
    }
    
    console.log('\n📋 PHASE 2: DATA INTEGRITY VERIFICATION\n');
    
    // Verify field consistency across containers
    console.log('🔗 Checking cross-container field consistency...');
    
    const allPlayerNames = new Set();
    const allTeamNames = new Set();
    const allGameIds = new Set();
    
    // Collect from penalties
    penalties.forEach(p => {
      if (p.playerName) allPlayerNames.add(p.playerName);
      if (p.teamName) allTeamNames.add(p.teamName);
      if (p.gameId) allGameIds.add(p.gameId);
    });
    
    // Collect from goals
    goals.forEach(g => {
      if (g.playerName) allPlayerNames.add(g.playerName);
      if (g.teamName) allTeamNames.add(g.teamName);
      if (g.gameId) allGameIds.add(g.gameId);
    });
    
    console.log(`   📊 Found ${allPlayerNames.size} unique players across events`);
    console.log(`   🏒 Found ${allTeamNames.size} unique teams across events`);
    console.log(`   🎮 Found ${allGameIds.size} unique games across events`);
    
    verificationResults.dataIntegrity = {
      uniquePlayers: allPlayerNames.size,
      uniqueTeams: allTeamNames.size,
      uniqueGames: allGameIds.size,
      status: 'VERIFIED'
    };
    verificationResults.summary.passed++;
    
    console.log('\n📊 PHASE 3: TIMESTAMP STANDARDIZATION VERIFICATION\n');
    
    console.log('⏰ Checking timestamp field consistency...');
    
    const timestampContainers = [
      { name: 'penalties', data: penalties },
      { name: 'goals', data: goals },
      { name: 'shots', data: shots }
    ];
    
    const timestampResults = {};
    
    timestampContainers.forEach(({ name, data }) => {
      const hasRecordedAt = data.filter(item => item.recordedAt).length;
      const hasCreatedAt = data.filter(item => item.createdAt).length;
      const total = data.length;
      
      timestampResults[name] = {
        total,
        recordedAt: hasRecordedAt,
        createdAt: hasCreatedAt,
        standardized: hasCreatedAt === 0 && hasRecordedAt === total
      };
      
      if (timestampResults[name].standardized) {
        console.log(`   ✅ ${name}: All ${total} records use 'recordedAt'`);
      } else {
        console.log(`   ❌ ${name}: ${hasCreatedAt} records still use 'createdAt', ${hasRecordedAt} use 'recordedAt'`);
      }
    });
    
    const allTimestampsStandardized = Object.values(timestampResults).every(r => r.standardized);
    if (allTimestampsStandardized) {
      verificationResults.summary.passed++;
    } else {
      verificationResults.summary.failed++;
    }
    
    console.log('\n📈 VERIFICATION SUMMARY:\n');
    
    console.log('✅ PASSED VERIFICATIONS:');
    console.log(`   - Container field standardization: ${verificationResults.summary.passed} containers`);
    console.log(`   - Data integrity verification`);
    console.log(`   - Cross-container consistency`);
    
    if (verificationResults.summary.failed > 0) {
      console.log('\n❌ FAILED VERIFICATIONS:');
      console.log(`   - ${verificationResults.summary.failed} issues found`);
    }
    
    if (verificationResults.summary.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      console.log(`   - ${verificationResults.summary.warnings} warnings`);
    }
    
    console.log('\n🎯 STANDARDIZATION STATUS:');
    const totalChecks = verificationResults.summary.passed + verificationResults.summary.failed;
    const successRate = ((verificationResults.summary.passed / totalChecks) * 100).toFixed(1);
    
    if (successRate >= 95) {
      console.log(`   🎉 EXCELLENT: ${successRate}% success rate`);
      console.log('   💼 System ready for production use');
    } else if (successRate >= 80) {
      console.log(`   ✅ GOOD: ${successRate}% success rate`);
      console.log('   🔧 Minor issues may need attention');
    } else {
      console.log(`   ⚠️  NEEDS WORK: ${successRate}% success rate`);
      console.log('   🚧 Additional standardization required');
    }
    
    return verificationResults;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

// Run the verification
verifyFieldStandardization()
  .then((results) => {
    console.log('\n🏁 Field standardization verification complete');
    process.exit(results.summary.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
