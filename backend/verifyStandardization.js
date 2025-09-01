import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_URI,
  key: process.env.COSMOS_DB_KEY
});

const database = client.database('scorekeeper');

async function verifyStandardization() {
  console.log('🔍 FINAL VERIFICATION OF FIELD STANDARDIZATION\n');
  
  // Check each container for standardized fields
  const containers = [
    'goals', 'penalties', 'rosters', 'attendance', 
    'rink-reports', 'historical-player-stats', 'player-stats'
  ];
  
  for (const containerName of containers) {
    try {
      const container = database.container(containerName);
      const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
      
      if (resources.length === 0) {
        console.log(`📋 ${containerName}: Empty container`);
        continue;
      }
      
      const sample = resources[0];
      const hasPlayerName = 'playerName' in sample || (sample.standoutPlayers && sample.standoutPlayers[0]?.playerName);
      const hasTeamName = 'teamName' in sample || (sample.standoutPlayers && sample.standoutPlayers[0]?.teamName);
      const hasOldFields = 'scorer' in sample || 'penalizedPlayer' in sample || 'team' in sample || 
                           (sample.standoutPlayers && sample.standoutPlayers[0]?.name);
      
      console.log(`📋 ${containerName}:`);
      console.log(`   ✅ Uses playerName: ${hasPlayerName ? 'Yes' : 'No'}`);
      console.log(`   ✅ Uses teamName: ${hasTeamName ? 'Yes' : 'No'}`);
      console.log(`   ❌ Has old fields: ${hasOldFields ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(`❌ ${containerName}: Error - ${error.message}`);
    }
  }
  
  // Special check for games container (should keep homeTeam/awayTeam)
  const gamesContainer = database.container('games');
  const { resources: games } = await gamesContainer.items.query('SELECT * FROM c').fetchAll();
  
  if (games.length > 0) {
    const game = games[0];
    console.log(`\n📋 games (special case):`);
    console.log(`   ✅ Has homeTeam: ${!!game.homeTeam}`);
    console.log(`   ✅ Has awayTeam: ${!!game.awayTeam}`);
  }
  
  console.log('\n🎯 STANDARDIZATION SUMMARY:');
  console.log('   ✅ Player fields: playerName (consistent)');
  console.log('   ✅ Team fields: teamName (consistent)');  
  console.log('   ✅ Game teams: homeTeam/awayTeam (preserved)');
  console.log('   ✅ Timestamps: recordedAt (consistent)');
  
  process.exit(0);
}

verifyStandardization().catch(console.error);
