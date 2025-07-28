#!/usr/bin/env node

/**
 * End-to-end test for penalty recording workflow
 * This simulates the complete workflow from game selection to penalty recording
 */

async function testCompleteWorkflow() {
  console.log('🏒 Testing Complete Penalty Recording Workflow...');
  
  try {
    // Step 1: Get available games
    console.log('\n📋 Step 1: Getting available games...');
    const gamesResponse = await fetch('http://localhost:3001/api/games?league=all');
    
    if (!gamesResponse.ok) {
      throw new Error(`Failed to get games: ${gamesResponse.statusText}`);
    }

    const games = await gamesResponse.json();
    console.log(`✅ Found ${games.length} games available`);
    
    if (games.length === 0) {
      throw new Error('No games found for testing');
    }

    const testGame = games[0];
    console.log(`Using test game: ${testGame.awayTeam} vs ${testGame.homeTeam} (ID: ${testGame.id})`);

    // Step 2: Get rosters for the game
    console.log('\n👥 Step 2: Getting rosters...');
    const rostersResponse = await fetch('http://localhost:3001/api/rosters');
    
    if (!rostersResponse.ok) {
      throw new Error(`Failed to get rosters: ${rostersResponse.statusText}`);
    }

    const rosters = await rostersResponse.json();
    console.log(`✅ Found ${rosters.length} rosters available`);

    // Step 3: Record a penalty
    console.log('\n⚠️ Step 3: Recording a penalty...');
    const penaltyData = {
      gameId: testGame.id,
      team: testGame.awayTeam,
      player: 'Test Player #99',
      period: '2',
      time: '12:45',
      penaltyType: 'Slashing',
      penaltyLength: '2',
      details: { description: 'End-to-end test penalty' }
    };

    const penaltyResponse = await fetch('http://localhost:3001/api/penalties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(penaltyData),
    });

    if (!penaltyResponse.ok) {
      throw new Error(`Failed to record penalty: ${penaltyResponse.statusText}`);
    }

    const penaltyResult = await penaltyResponse.json();
    console.log('✅ Penalty recorded successfully:', {
      id: penaltyResult.penalty.id,
      gameId: penaltyResult.penalty.gameId,
      team: penaltyResult.penalty.penalizedTeam,
      player: penaltyResult.penalty.penalizedPlayer,
      type: penaltyResult.penalty.penaltyType
    });

    // Step 4: Verify penalty was stored
    console.log('\n🔍 Step 4: Verifying penalty was stored...');
    const verifyResponse = await fetch(`http://localhost:3001/api/penalties?gameId=${testGame.id}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify penalty: ${verifyResponse.statusText}`);
    }

    const gamePenalties = await verifyResponse.json();
    const ourPenalty = gamePenalties.find(p => p.id === penaltyResult.penalty.id);
    
    if (!ourPenalty) {
      throw new Error('Penalty not found in database');
    }

    console.log('✅ Penalty verification successful');

    // Step 5: Test API health
    console.log('\n❤️ Step 5: Testing API health...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.statusText}`);
    }

    const health = await healthResponse.json();
    console.log('✅ API health check passed');
    console.log('Available endpoints:', health.endpoints);

    console.log('\n🎉 Complete workflow test PASSED!');
    console.log('\nSummary:');
    console.log('- ✅ Games API working');
    console.log('- ✅ Rosters API working');
    console.log('- ✅ Penalties POST API working');
    console.log('- ✅ Penalties GET API working');
    console.log('- ✅ Database storage working');
    console.log('- ✅ Health check working');

  } catch (error) {
    console.error('❌ Complete workflow test FAILED:', error);
    process.exit(1);
  }
}

// Run the complete test
testCompleteWorkflow();
