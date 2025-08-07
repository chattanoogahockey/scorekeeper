import { getGamesContainer, initializeContainers } from './cosmosClient.js';

async function deleteNonGoldGames() {
  try {
    await initializeContainers();
    const container = getGamesContainer();
    
    console.log('🗑️ Deleting all Silver and Bronze games...');
    
    const { resources: allGames } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log(`Found ${allGames.length} total games`);
    
    let deleted = 0;
    for (const game of allGames) {
      if (game.division === 'Silver' || game.division === 'Bronze') {
        try {
          // Use the correct partition key - try both id and gameId
          const partitionKey = game.gameId || game.id;
          await container.item(game.id, partitionKey).delete();
          console.log(`✅ Deleted: ${game.awayTeam} vs ${game.homeTeam} (${game.division})`);
          deleted++;
        } catch (e) {
          // Try with just the id as partition key
          try {
            await container.item(game.id, game.id).delete();
            console.log(`✅ Deleted: ${game.awayTeam} vs ${game.homeTeam} (${game.division}) - alt method`);
            deleted++;
          } catch (e2) {
            console.log(`❌ Failed to delete: ${game.id} - ${e2.code}`);
          }
        }
      }
    }
    
    console.log(`\n📊 Summary: Deleted ${deleted} games`);
    
    // Verify result
    const { resources: remainingGames } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log(`\n✅ Remaining games: ${remainingGames.length}`);
    
    const goldGames = remainingGames.filter(g => g.division === 'Gold');
    console.log(`🏆 Gold games: ${goldGames.length}`);
    
    const otherGames = remainingGames.filter(g => g.division !== 'Gold');
    if (otherGames.length > 0) {
      console.log(`⚠️ Non-Gold games still remaining: ${otherGames.length}`);
      otherGames.forEach(g => console.log(`   - ${g.awayTeam} vs ${g.homeTeam} (${g.division})`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteNonGoldGames();
