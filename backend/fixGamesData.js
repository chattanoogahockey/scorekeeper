import { getGamesContainer } from './cosmosClient.js';

async function fixGamesData() {
  try {
    const container = getGamesContainer();
    
    console.log('🔍 Fixing games data structure...');
    
    // Get all games
    const querySpec = {
      query: 'SELECT * FROM c',
      parameters: [],
    };
    
    const { resources: games } = await container.items.query(querySpec).fetchAll();
    console.log(`Found ${games.length} games to fix`);
    
    for (const game of games) {
      // Move the current 'league' field to 'division' and set proper league
      if (game.league && !game.division) {
        const oldLeague = game.league;
        game.division = oldLeague; // Gold, Silver, Bronze
        game.league = 'cha-hockey'; // The actual league name
        game.updatedAt = new Date().toISOString();
        // Use the old league as the partition key for update
        await container.item(game.id, oldLeague).replace(game);
        console.log(`✅ Updated game ${game.id}: ${game.homeTeam} vs ${game.awayTeam} - league: cha-hockey, division: ${game.division}`);
      }
    }
    
    console.log('🎉 Finished fixing all games data!');
    
  } catch (error) {
    console.error('❌ Error fixing games data:', error);
  }
}

// Run the script
fixGamesData();
