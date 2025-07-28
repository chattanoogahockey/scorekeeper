// Test the playerStats API functionality directly
import { getDatabase } from './cosmosClient.js';

async function testPlayerStatsAPI() {
  try {
    console.log('🧪 Testing playerStats API functionality...');
    
    const database = await getDatabase();
    const playerStatsContainer = database.container('playerStats');
    
    // Test 1: Check container exists and query all stats
    console.log('\n📊 Test 1: Query all player stats');
    const { resources: allStats } = await playerStatsContainer.items.readAll().fetchAll();
    console.log(`Found ${allStats.length} player stats`);
    
    if (allStats.length > 0) {
      // Test 2: Check specific player
      console.log('\n🎯 Test 2: Sample player analysis');
      const marc = allStats.find(p => p.playerName === 'Marc Redinger');
      if (marc) {
        console.log(`\n👤 Marc Redinger (${marc.teamName}):`);
        console.log(`  Season: ${marc.season}`);
        console.log(`  Attendance: ${marc.attendance?.attendancePercentage}% (${marc.attendance?.gamesAttended}/${marc.attendance?.totalTeamGames})`);
        console.log(`  Reliability: ${marc.insights?.reliability}`);
        console.log(`  Trend: ${marc.insights?.trend}`);
        
        if (marc.insights?.aiContext) {
          console.log(`  🤖 AI Enhanced: ✅`);
          console.log(`    Personality: ${marc.insights.aiContext.personality?.join(', ')}`);
          console.log(`    Storylines: ${marc.insights.aiContext.storylines?.length} available`);
          console.log(`    Facts: ${marc.insights.aiContext.contextualFacts?.length} ready`);
        } else {
          console.log(`  🤖 AI Enhanced: ❌`);
        }
        
        console.log(`  📢 Announcements ready:`);
        marc.insights?.announcements?.forEach((ann, i) => {
          console.log(`    ${i + 1}. ${ann}`);
        });
      }
      
      // Test 3: Query by team
      console.log('\n🏒 Test 3: Team query (Bachstreet Boys)');
      const teamQuery = {
        query: "SELECT * FROM c WHERE c.teamName = @teamName",
        parameters: [{ name: "@teamName", value: "Bachstreet Boys" }]
      };
      const { resources: teamStats } = await playerStatsContainer.items.query(teamQuery).fetchAll();
      console.log(`Bachstreet Boys players: ${teamStats.length}`);
      
      // Test 4: AI Announcer Ready Data
      console.log('\n🎙️ Test 4: AI Announcer Ready Format');
      const aiReadyStats = teamStats.map(player => ({
        player: player.playerName,
        quickFacts: [
          `${player.attendance?.attendancePercentage || 0}% attendance`,
          `${player.attendance?.gamesAttended || 0} games played`,
          `Reliability: ${player.insights?.reliability || 'Unknown'}`
        ],
        soundBites: player.insights?.announcements || [],
        personality: player.insights?.aiContext?.personality || [],
        storylines: player.insights?.aiContext?.storylines || []
      }));
      
      console.log('AI Ready Data Sample:');
      console.log(JSON.stringify(aiReadyStats[0], null, 2));
      
    } else {
      console.log('⚠️ No player stats found in container');
    }
    
    console.log('\n✅ API test completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

await testPlayerStatsAPI();
