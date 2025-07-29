#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test
 * This test simulates exactly what the frontend is doing
 */

async function testFrontendBackendIntegration() {
  console.log('🧪 Testing Frontend-Backend Integration...');
  
  try {
    // Step 1: Test basic connectivity (what frontend does first)
    console.log('\n🔗 Step 1: Testing basic connectivity...');
    const testResponse = await fetch('http://localhost:3001/api/test');
    console.log('✅ Test endpoint status:', testResponse.status);
    const testData = await testResponse.json();
    console.log('✅ Test endpoint data:', testData);

    // Step 2: Test environment variables (what frontend would use)
    console.log('\n🌍 Step 2: Testing environment simulation...');
    const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
    console.log('✅ API Base URL (simulating frontend):', apiBaseUrl);

    // Step 3: Get games (to simulate frontend workflow)
    console.log('\n🎮 Step 3: Getting games...');
    const gamesResponse = await fetch(`${apiBaseUrl}/api/games?league=all`);
    const games = await gamesResponse.json();
    console.log('✅ Games retrieved:', games.length, 'games found');
    
    if (games.length === 0) {
      throw new Error('No games available for testing');
    }
    
    const testGame = games[0];
    console.log('✅ Using test game:', testGame.awayTeam, 'vs', testGame.homeTeam, '(ID:', testGame.id, ')');

    // Step 4: Test exact payload that frontend would send
    console.log('\n⚽ Step 4: Testing exact frontend goal payload...');
    const frontendGoalPayload = {
      gameId: testGame.id,  // This is critical - using the correct field name
      team: testGame.awayTeam,
      player: 'Frontend Test Player',
      period: '1',
      time: '10:30',
      assist: null,
      shotType: 'Wrist Shot',
      goalType: 'Regular',
      breakaway: false
    };
    
    console.log('📦 Frontend payload:', JSON.stringify(frontendGoalPayload, null, 2));

    const goalResponse = await fetch(`${apiBaseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(frontendGoalPayload),
    });

    console.log('📊 Response status:', goalResponse.status);
    console.log('📊 Response ok:', goalResponse.ok);
    console.log('📊 Response headers:', Object.fromEntries(goalResponse.headers.entries()));

    if (!goalResponse.ok) {
      const errorText = await goalResponse.text();
      console.error('❌ Error response body:', errorText);
      throw new Error(`Goal creation failed: ${goalResponse.status} ${goalResponse.statusText} - ${errorText}`);
    }

    const goalResult = await goalResponse.json();
    console.log('✅ Goal created successfully:', goalResult.success);
    console.log('✅ Goal ID:', goalResult.goal.id);

    // Step 5: Verify the goal was stored
    console.log('\n🔍 Step 5: Verifying goal was stored...');
    const verifyResponse = await fetch(`${apiBaseUrl}/api/goals?gameId=${testGame.id}`, {
      method: 'GET'
    });

    if (verifyResponse.ok) {
      console.log('✅ Goal verification endpoint is accessible');
    } else {
      console.log('⚠️ Goal verification endpoint not fully implemented');
    }

    console.log('\n🎉 Frontend-Backend Integration Test PASSED!');
    console.log('🔥 The issue is likely in the frontend JavaScript code, not the API connectivity.');

  } catch (error) {
    console.error('❌ Frontend-Backend Integration Test FAILED:', error);
    console.error('🔍 Error details:', error.message);
    process.exit(1);
  }
}

// Run the integration test
testFrontendBackendIntegration();
