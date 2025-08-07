import { 
  getGamesContainer, 
  initializeContainers 
} from './cosmosClient.js';

/**
 * Script to remove all non-Gold division games from the database
 */

async function cleanupGames() {
  try {
    // Initialize containers first
    await initializeContainers();
    const gamesContainer = getGamesContainer();
    
    console.log('🔍 Fetching all games...');
    
    // Get all existing games
    const { resources: allGames } = await gamesContainer.items
      .query('SELECT * FROM c')
      .fetchAll();
    
    console.log(`📊 Found ${allGames.length} total games`);
    
    // Filter for non-Gold games
    const nonGoldGames = allGames.filter(game => 
      game.division !== 'Gold' && game.league !== 'Gold'
    );
    
    const goldGames = allGames.filter(game => 
      game.division === 'Gold' || game.league === 'Gold'
    );
    
    console.log(`🟨 Gold division games: ${goldGames.length}`);
    console.log(`🗑️ Non-Gold games to delete: ${nonGoldGames.length}`);
    
    if (goldGames.length > 0) {
      console.log('\n🟨 Gold games that will be kept:');
      goldGames.forEach((game, i) => {
        console.log(`   ${i + 1}. ${game.awayTeam} vs ${game.homeTeam} (${game.gameDate || 'No date'})`);
      });
    }
    
    if (nonGoldGames.length > 0) {
      console.log('\n🗑️ Non-Gold games to be deleted:');
      nonGoldGames.forEach((game, i) => {
        console.log(`   ${i + 1}. ${game.awayTeam} vs ${game.homeTeam} - ${game.division || game.league} (${game.gameDate || 'No date'})`);
      });
      
      console.log('\n🗑️ Deleting non-Gold games...');
      
      for (const game of nonGoldGames) {
        try {
          await gamesContainer.item(game.id, game.gameId || game.id).delete();
          console.log(`   ✅ Deleted: ${game.awayTeam} vs ${game.homeTeam}`);
        } catch (deleteError) {
          console.log(`   ❌ Failed to delete ${game.id}:`, deleteError.message);
        }
      }
      
      console.log(`\n✅ Cleanup completed! Deleted ${nonGoldGames.length} non-Gold games`);
    } else {
      console.log('\n✅ No non-Gold games found to delete');
    }
    
    console.log(`\n🎉 Database now contains only ${goldGames.length} Gold division games`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupGames().then(() => {
  console.log('✅ Cleanup script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Cleanup script failed:', error);
  process.exit(1);
});
