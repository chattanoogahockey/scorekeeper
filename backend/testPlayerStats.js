// Quick test of playerStats API
import { getDatabase } from './cosmosClient.js';

async function testPlayerStatsAPI() {
  try {
    console.log('🧪 Testing playerStats container...');
    
    const database = await getDatabase();
    const playerStatsContainer = database.container('playerStats');
    
    // Check if container exists and has data
    const { resources: existingStats } = await playerStatsContainer.items.readAll().fetchAll();
    console.log(`📊 Found ${existingStats.length} existing player stats`);
    
    if (existingStats.length > 0) {
      console.log('\n🎯 Sample player stat:');
      const sample = existingStats[0];
      console.log(`Player: ${sample.playerName} (${sample.teamName})`);
      console.log(`Season: ${sample.season}`);
      console.log(`Attendance: ${sample.attendance?.attendancePercentage || 0}%`);
      console.log(`Reliability: ${sample.insights?.reliability || 'Unknown'}`);
      console.log(`AI Announcements: ${sample.insights?.announcements?.length || 0} ready`);
      
      if (sample.insights?.aiContext) {
        console.log(`Enhanced AI: ✅ Personality, storylines, contextual facts`);
      } else {
        console.log(`Enhanced AI: ❌ Missing aiContext`);
      }
    } else {
      console.log('⚠️ No player stats found. Running calculation...');
      
      // Run a simple calculation for one team
      const { calculatePlayerStats } = await import('./calculateStats.js');
      await calculatePlayerStats();
      
      console.log('✅ Stats calculation completed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

await testPlayerStatsAPI();
