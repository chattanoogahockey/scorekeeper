#!/usr/bin/env node

/**
 * Test script for the penalties API
 * This script tests both POST and GET endpoints for penalties
 */

const testPenalty = {
  gameId: "test-game-2",
  team: "Chattanooga Ice Wolves",
  player: "John Doe",
  period: "2",
  time: "15:45",
  penaltyType: "High-sticking",
  penaltyLength: "2",
  details: { description: "High stick to opponent's face" }
};

async function testPenaltiesAPI() {
  console.log('🏒 Testing Penalties API...');
  
  try {
    // Test POST endpoint
    console.log('\n📝 Testing POST /api/penalties...');
    const postResponse = await fetch('http://localhost:3001/api/penalties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPenalty),
    });

    if (!postResponse.ok) {
      throw new Error(`POST failed: ${postResponse.statusText}`);
    }

    const postResult = await postResponse.json();
    console.log('✅ POST successful:', postResult);

    // Test GET endpoint
    console.log('\n📖 Testing GET /api/penalties...');
    const getResponse = await fetch('http://localhost:3001/api/penalties');
    
    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.statusText}`);
    }

    const penalties = await getResponse.json();
    console.log(`✅ GET successful: Found ${penalties.length} penalties`);
    
    // Show latest penalty
    if (penalties.length > 0) {
      const latestPenalty = penalties[0];
      console.log('Latest penalty:', {
        id: latestPenalty.id,
        gameId: latestPenalty.gameId,
        team: latestPenalty.penalizedTeam,
        player: latestPenalty.penalizedPlayer,
        type: latestPenalty.penaltyType,
        length: latestPenalty.penaltyLength
      });
    }

    // Test GET with gameId filter
    console.log('\n🔍 Testing GET /api/penalties with gameId filter...');
    const filteredResponse = await fetch(`http://localhost:3001/api/penalties?gameId=${testPenalty.gameId}`);
    
    if (!filteredResponse.ok) {
      throw new Error(`Filtered GET failed: ${filteredResponse.statusText}`);
    }

    const filteredPenalties = await filteredResponse.json();
    console.log(`✅ Filtered GET successful: Found ${filteredPenalties.length} penalties for game ${testPenalty.gameId}`);

    console.log('\n🎉 All penalties API tests passed!');
    
  } catch (error) {
    console.error('❌ Penalties API test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPenaltiesAPI();
