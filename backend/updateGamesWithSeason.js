import { getGamesContainer } from './cosmosClient.js';

/**
 * Update all games in the container to add the season field 
 * matching the format used in rosters and playerStats ("winter 2025")
 */
async function updateGamesWithSeason() {
  console.log('🎯 Starting to update games with season field...');
  
  try {
    const container = getGamesContainer();
    
    // Get all games
    const { resources: games } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log(`📋 Found ${games.length} games to update`);
    
    let updatedCount = 0;
    
    for (const game of games) {
      // Only update if season doesn't exist
      if (!game.season) {
        const updatedGame = {
          ...game,
          season: "winter 2025",
          updatedAt: new Date().toISOString()
        };
        
        // Use upsert instead of replace to handle potential partition key issues
        await container.items.upsert(updatedGame);
        console.log(`✅ Updated game ${game.id}: ${game.awayTeam} vs ${game.homeTeam}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Game ${game.id} already has season: ${game.season}`);
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} games with season field`);
    
  } catch (error) {
    console.error('❌ Error updating games with season:', error);
  }
}

// Run the update
updateGamesWithSeason();
