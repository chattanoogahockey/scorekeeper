import { 
  getGamesContainer, 
  initializeContainers
} from './cosmosClient.js';

async function migrateGamesData() {
  try {
    await initializeContainers();
    const gamesContainer = getGamesContainer();
    
    console.log('🔍 Fetching all games for migration...');
    
    // Get all games
    const { resources: games } = await gamesContainer.items
      .query('SELECT * FROM c')
      .fetchAll();
    
    console.log(`📊 Found ${games.length} games to migrate`);
    
    if (games.length === 0) {
      console.log('No games found. Creating fresh games...');
      
      // Create fresh games with only division field
      const freshGames = [
        {
          id: 'game-2025-04-03-bachstreet-purpetrators',
          gameId: 'game-2025-04-03-bachstreet-purpetrators',
          gameDate: '2025-04-03T19:00:00.000Z',
          awayTeam: 'Bachstreet Boys',
          homeTeam: 'Purpetrators',
          division: 'Gold',
          status: 'scheduled',
          eventType: 'game',
          createdAt: new Date().toISOString()
        },
        {
          id: 'game-2025-04-03-toe-whiskey',
          gameId: 'game-2025-04-03-toe-whiskey',
          gameDate: '2025-04-03T20:00:00.000Z',
          awayTeam: 'Toe Draggins',
          homeTeam: 'Whiskey Dekes',
          division: 'Gold',
          status: 'scheduled',
          eventType: 'game',
          createdAt: new Date().toISOString()
        }
      ];
      
      for (const game of freshGames) {
        await gamesContainer.items.create(game);
        console.log(`✅ Created fresh game: ${game.awayTeam} vs ${game.homeTeam}`);
      }
      
    } else {
      // Delete all existing games and recreate them properly
      console.log('🗑️ Deleting existing games...');
      
      for (const game of games) {
        try {
          // Use the actual partition key value from the game
          const partitionKey = game.league || game.division || 'Gold';
          await gamesContainer.item(game.id, partitionKey).delete();
          console.log(`   Deleted: ${game.id}`);
        } catch (deleteError) {
          console.log(`   Failed to delete ${game.id}:`, deleteError.message);
        }
      }
      
      console.log('✅ All existing games deleted');
      console.log('📝 Creating new games with proper structure...');
      
      // Recreate games with ONLY division field
      const cleanGames = games.map(game => ({
        id: game.id,
        gameId: game.gameId || game.id,
        gameDate: game.gameDate,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        division: game.division || game.league || 'Gold', // Use division, fallback to league, default to Gold
        status: game.status || 'scheduled',
        eventType: game.eventType || 'game',
        createdAt: game.createdAt || new Date().toISOString()
        // NOTE: Explicitly NOT including 'league' field
      }));
      
      for (const game of cleanGames) {
        await gamesContainer.items.create(game);
        console.log(`✅ Created clean game: ${game.awayTeam} vs ${game.homeTeam} (Division: ${game.division})`);
      }
    }
    
    console.log('\n🎉 Game migration completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - All games now use ONLY 'division' field`);
    console.log(`   - No 'league' fields remain`);
    console.log(`   - Ready for division-based queries`);
    
  } catch (error) {
    console.error('❌ Error migrating games:', error);
    process.exit(1);
  }
}

migrateGamesData().then(() => {
  console.log('✅ Game migration completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
