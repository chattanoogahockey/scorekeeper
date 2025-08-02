#!/usr/bin/env node

/**
 * Complete API Test Suite
 * Tests goals, penalties, and attendance to verify all APIs are working
 */

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete API Workflow...');
  
  try {
    const apiBaseUrl = 'http://localhost:3001';

    // Step 1: Get games
    console.log('\n🎮 Step 1: Getting games...');
    const gamesResponse = await fetch(`${apiBaseUrl}/api/games?league=all`);
    const games = await gamesResponse.json();
    console.log('✅ Games retrieved:', games.length, 'games found');
    
    const testGame = games[0];
    console.log('✅ Using test game:', testGame.awayTeam, 'vs', testGame.homeTeam, '(ID:', testGame.id, ')');

    // Step 2: Test GOALS API
    console.log('\n⚽ Step 2: Testing Goals API...');
    const goalPayload = {
      gameId: testGame.id,
      team: testGame.awayTeam,
      player: 'Complete Test Scorer',
      period: '1',
      time: '5:30',
      assist: null,
      shotType: 'Wrist Shot',
      goalType: 'Regular',
      breakaway: false
    };
    
    const goalResponse = await fetch(`${apiBaseUrl}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalPayload),
    });
    
    if (!goalResponse.ok) {
      throw new Error(`Goals API failed: ${goalResponse.status}`);
    }
    
    const goalResult = await goalResponse.json();
    console.log('✅ Goal created:', goalResult.success, '- ID:', goalResult.goal.id);

    // Step 3: Test PENALTIES API
    console.log('\n🚨 Step 3: Testing Penalties API...');
    const penaltyPayload = {
      gameId: testGame.id,
      team: testGame.homeTeam,
      player: 'Complete Test Penalty Player',
      period: '2',
      time: '12:45',
      penaltyType: 'Hooking',
      penaltyLength: '2',
      details: { description: 'Complete workflow test penalty' }
    };
    
    const penaltyResponse = await fetch(`${apiBaseUrl}/api/penalties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(penaltyPayload),
    });
    
    if (!penaltyResponse.ok) {
      throw new Error(`Penalties API failed: ${penaltyResponse.status}`);
    }
    
    const penaltyResult = await penaltyResponse.json();
    console.log('✅ Penalty created:', penaltyResult.success, '- ID:', penaltyResult.penalty.id);

    // Step 4: Test ATTENDANCE API (we know this works)
    console.log('\n📋 Step 4: Testing Attendance API...');
    const attendancePayload = {
      gameId: testGame.id,
      attendance: {
        [testGame.awayTeam]: ['Player 1', 'Player 2'],
        [testGame.homeTeam]: ['Player A', 'Player B']
      },
      totalRoster: [
        { teamName: testGame.awayTeam, teamId: testGame.awayTeam, totalPlayers: ['Player 1', 'Player 2', 'Player 3'] },
        { teamName: testGame.homeTeam, teamId: testGame.homeTeam, totalPlayers: ['Player A', 'Player B', 'Player C'] }
      ]
    };
    
    const attendanceResponse = await fetch(`${apiBaseUrl}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendancePayload),
    });
    
    if (!attendanceResponse.ok) {
      throw new Error(`Attendance API failed: ${attendanceResponse.status}`);
    }
    
    const attendanceResult = await attendanceResponse.json();
    console.log('✅ Attendance recorded:', attendanceResult.id);

    console.log('\n🎉 COMPLETE API WORKFLOW TEST PASSED!');
    console.log('✅ Goals API: WORKING');
    console.log('✅ Penalties API: WORKING');
    console.log('✅ Attendance API: WORKING');
    console.log('🚀 All APIs are properly connected and functional!');

  } catch (error) {
    console.error('❌ Complete API Workflow Test FAILED:', error);
    console.error('🔍 Error details:', error.message);
    process.exit(1);
  }
}

// Run the complete workflow test
testCompleteWorkflow();
