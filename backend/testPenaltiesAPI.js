#!/usr/bin/env node

/**
 * Penalties API Test
 * This test validates the penalties API endpoint
 */

async function testPenaltiesAPI() {
  console.log('🚨 Testing Penalties API...');
  
  try {
    const apiBaseUrl = 'http://localhost:3001';

    // Step 1: Get games
    console.log('\n🎮 Step 1: Getting games...');
    const gamesResponse = await fetch(`${apiBaseUrl}/api/games?league=all`);
    const games = await gamesResponse.json();
    console.log('✅ Games retrieved:', games.length, 'games found');
    
    if (games.length === 0) {
      throw new Error('No games available for testing');
    }
    
    const testGame = games[0];
    console.log('✅ Using test game:', testGame.awayTeam, 'vs', testGame.homeTeam, '(ID:', testGame.id, ')');

    // Step 2: Test penalties API
    console.log('\n🚨 Step 2: Testing penalties API...');
    const penaltyPayload = {
      gameId: testGame.id,
      team: testGame.awayTeam,
      player: 'Test Penalty Player',
      period: '2',
      time: '15:20',
      penaltyType: 'Tripping',
      penaltyLength: '2',
      details: { description: 'Test penalty from API test' }
    };
    
    console.log('📦 Penalty payload:', JSON.stringify(penaltyPayload, null, 2));

    const penaltyResponse = await fetch(`${apiBaseUrl}/api/penalties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(penaltyPayload),
    });

    console.log('📊 Response status:', penaltyResponse.status);
    console.log('📊 Response ok:', penaltyResponse.ok);

    if (!penaltyResponse.ok) {
      const errorText = await penaltyResponse.text();
      console.error('❌ Error response body:', errorText);
      throw new Error(`Penalty creation failed: ${penaltyResponse.status} ${penaltyResponse.statusText} - ${errorText}`);
    }

    const penaltyResult = await penaltyResponse.json();
    console.log('✅ Penalty created successfully:', penaltyResult.success);
    console.log('✅ Penalty ID:', penaltyResult.penalty.id);
    console.log('✅ Penalty summary:', penaltyResult.summary);

    console.log('\n🎉 Penalties API Test PASSED!');

  } catch (error) {
    console.error('❌ Penalties API Test FAILED:', error);
    console.error('🔍 Error details:', error.message);
    process.exit(1);
  }
}

// Run the penalties test
testPenaltiesAPI();
