import { getGamesContainer } from './cosmosClient.js';

async function checkGamesData() {
  try {
    const container = getGamesContainer();
    
    console.log('🔍 Checking games data structure...');
    
    // Get all games
    const querySpec = {
      query: 'SELECT * FROM c',
      parameters: [],
    };
    
    const { resources: games } = await container.items.query(querySpec).fetchAll();
    console.log(`Found ${games.length} games`);
    
    if (games.length > 0) {
      console.log('\n📋 Sample game data:');
      console.log(JSON.stringify(games[0], null, 2));
      
      console.log('\n📊 Games by division:');
      const gamesByDivision = {};
      games.forEach(game => {
        if (!gamesByDivision[game.division || 'NO_DIVISION']) {
          gamesByDivision[game.division || 'NO_DIVISION'] = 0;
        }
        gamesByDivision[game.division || 'NO_DIVISION']++;
      });
      
      Object.entries(gamesByDivision).forEach(([division, count]) => {
        console.log(`  ${division}: ${count} games`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking games data:', error);
  }
}

// Run the script
checkGamesData();
