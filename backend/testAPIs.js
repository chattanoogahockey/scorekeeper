// Test script to verify the roster and game events APIs
const baseUrl = 'https://scorekeeper.azurewebsites.net';

async function testAPIs() {
  console.log('🚀 Testing APIs on', baseUrl);
  
  try {
    // Test rosters endpoint
    console.log('\n📋 Testing /api/rosters endpoint...');
    const rostersResponse = await fetch(`${baseUrl}/api/rosters?division=gold&season=winter%202025`);
    const rostersText = await rostersResponse.text();
    console.log('Raw response:', rostersText.substring(0, 200) + '...');
    
    let rosters;
    try {
      rosters = JSON.parse(rostersText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return;
    }
    
    if (!Array.isArray(rosters)) {
      console.error('Response is not an array:', typeof rosters, rosters);
      return;
    }
    
    console.log(`✅ Found ${rosters.length} players in gold division winter 2025`);
    
    // Show team summary
    const teamCounts = {};
    rosters.forEach(player => {
      teamCounts[player.teamName] = (teamCounts[player.teamName] || 0) + 1;
    });
    
    console.log('\n📊 Team Summary:');
    Object.entries(teamCounts).forEach(([team, count]) => {
      console.log(`  ${team}: ${count} players`);
    });
    
    // Test a specific team
    console.log('\n🏒 Testing specific team: Whiskey Dekes...');
    const whiskeyResponse = await fetch(`${baseUrl}/api/rosters?teamName=Whiskey%20Dekes`);
    const whiskeyPlayers = await whiskeyResponse.json();
    console.log(`✅ Whiskey Dekes has ${whiskeyPlayers.length} players:`);
    whiskeyPlayers.forEach(player => {
      console.log(`  #${player.jerseyNumber} ${player.fullName}`);
    });
    
    // Test game events endpoint (should be empty initially)
    console.log('\n🎯 Testing /api/game-events endpoint...');
    const eventsResponse = await fetch(`${baseUrl}/api/game-events`);
    const events = await eventsResponse.json();
    console.log(`✅ Current game events: ${events.length}`);
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the tests
testAPIs();
