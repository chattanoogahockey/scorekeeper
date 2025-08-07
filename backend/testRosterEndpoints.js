import axios from 'axios';

const BASE_URL = 'https://scorekeeper.azurewebsites.net';

async function testRosterEndpoints() {
  try {
    console.log('🧪 Testing roster endpoints...\n');
    
    // Test 1: Get all rosters
    console.log('1. Testing GET /api/rosters (all rosters)');
    const allRosters = await axios.get(`${BASE_URL}/api/rosters`);
    console.log(`   ✅ Found ${allRosters.data.length} total rosters`);
    allRosters.data.forEach(roster => {
      console.log(`      - ${roster.teamName}: ${roster.players.length} players`);
    });
    
    // Test 2: Get rosters by division
    console.log('\n2. Testing GET /api/rosters?division=Gold');
    const goldRosters = await axios.get(`${BASE_URL}/api/rosters?division=Gold`);
    console.log(`   ✅ Found ${goldRosters.data.length} Gold division rosters`);
    
    // Test 3: Get all games to find a gameId
    console.log('\n3. Getting games to test gameId endpoint');
    const games = await axios.get(`${BASE_URL}/api/games?division=Gold`);
    console.log(`   ✅ Found ${games.data.length} Gold division games`);
    
    if (games.data.length > 0) {
      const testGame = games.data[0];
      console.log(`   Testing with game: ${testGame.awayTeam} vs ${testGame.homeTeam} (ID: ${testGame.id})`);
      
      // Test 4: Get rosters by gameId
      console.log('\n4. Testing GET /api/rosters?gameId=...');
      try {
        const gameRosters = await axios.get(`${BASE_URL}/api/rosters?gameId=${testGame.id}`);
        console.log(`   ✅ Found ${gameRosters.data.length} rosters for game ${testGame.id}`);
        gameRosters.data.forEach(roster => {
          console.log(`      - ${roster.teamName}: ${roster.players.length} players`);
        });
      } catch (gameError) {
        console.log(`   ❌ Game roster lookup failed:`, gameError.response?.data || gameError.message);
      }
    }
    
    console.log('\n🎉 Roster endpoint testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRosterEndpoints();
