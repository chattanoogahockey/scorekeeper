/**
 * Test script to verify historical player stats API endpoint
 */

const API_BASE = 'http://localhost:3001';

async function testHistoricalStatsAPI() {
  try {
    console.log('🧪 Testing Historical Player Stats API...');
    
    const response = await fetch(`${API_BASE}/api/player-stats?scope=historical`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ API Response received!`);
    console.log(`📊 Total historical player records: ${data.length}`);
    
    if (data.length > 0) {
      console.log('\n🔍 Sample records:');
      data.slice(0, 3).forEach((player, index) => {
        console.log(`${index + 1}. ${player.playerName} (${player.division}, ${player.year})`);
        console.log(`   Goals: ${player.goals}, Assists: ${player.assists}, Points: ${player.points}, PIM: ${player.pim}, GP: ${player.gp}`);
      });
      
      console.log('\n📈 Division breakdown:');
      const divisionCounts = data.reduce((acc, player) => {
        acc[player.division] = (acc[player.division] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(divisionCounts).forEach(([division, count]) => {
        console.log(`   ${division}: ${count} players`);
      });
    }
    
    console.log('\n✅ Historical data API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing historical stats API:', error.message);
    process.exit(1);
  }
}

// Run the test
testHistoricalStatsAPI();
