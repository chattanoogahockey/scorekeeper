import { 
  getGamesContainer, 
  initializeContainers 
} from './cosmosClient.js';

/**
 * Script to replace all scheduled games with new games for the 2025 season
 */

const newGames = [
  {
    id: 'game-2025-04-03-purpetrators-bachstreet',
    gameId: 'game-2025-04-03-purpetrators-bachstreet',
    gameDate: '2025-04-03T19:00:00.000Z',
    awayTeam: 'Purpetrators',
    homeTeam: 'Bachstreet Boys',
    league: 'Gold',
    division: 'Gold',
    status: 'scheduled',
    eventType: 'game',
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-2025-04-03-skateful-utc',
    gameId: 'game-2025-04-03-skateful-utc',
    gameDate: '2025-04-03T20:00:00.000Z',
    awayTeam: 'Skateful Dead',
    homeTeam: 'UTC',
    league: 'Gold',
    division: 'Gold',
    status: 'scheduled',
    eventType: 'game',
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-2025-04-03-toe-whiskey',
    gameId: 'game-2025-04-03-toe-whiskey',
    gameDate: '2025-04-03T21:00:00.000Z',
    awayTeam: 'Toe Draggins',
    homeTeam: 'Whiskey Dekes',
    league: 'Gold',
    division: 'Gold',
    status: 'scheduled',
    eventType: 'game',
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-2025-03-27-bachstreet-skateful',
    gameId: 'game-2025-03-27-bachstreet-skateful',
    gameDate: '2025-03-27T19:00:00.000Z',
    awayTeam: 'Bachstreet Boys',
    homeTeam: 'Skateful Dead',
    league: 'Gold',
    division: 'Gold',
    status: 'scheduled',
    eventType: 'game',
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-2025-03-27-purpetrators-whiskey',
    gameId: 'game-2025-03-27-purpetrators-whiskey',
    gameDate: '2025-03-27T20:00:00.000Z',
    awayTeam: 'Purpetrators',
    homeTeam: 'Whiskey Dekes',
    league: 'Gold',
    division: 'Gold',
    status: 'scheduled',
    eventType: 'game',
    createdAt: new Date().toISOString()
  },
  {
    id: 'game-2025-03-27-utc-toe',
    gameId: 'game-2025-03-27-utc-toe',
    gameDate: '2025-03-27T21:00:00.000Z',
    awayTeam: 'UTC',
    homeTeam: 'Toe Draggins',
    league: 'Gold',
    division: 'Gold',
    status: 'scheduled',
    eventType: 'game',
    createdAt: new Date().toISOString()
  }
];

async function replaceScheduledGames() {
  console.log('🏒 Starting scheduled games replacement...');
  
  try {
    // Initialize database containers
    await initializeContainers();
    const gamesContainer = getGamesContainer();
    
    console.log('🗑️ Removing existing scheduled games...');
    
    // Get all existing games that are scheduled (not submitted/completed)
    const { resources: existingGames } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.eventType = 'game' AND (c.status = 'scheduled' OR NOT IS_DEFINED(c.status))",
        parameters: []
      })
      .fetchAll();
    
    console.log(`📊 Found ${existingGames.length} existing scheduled games to remove`);
    
    // Delete existing scheduled games
    for (const game of existingGames) {
      try {
        // Use the league as partition key (as defined in cosmosClient.js)
        const partitionKey = game.league || game.division || 'Gold';
        await gamesContainer.item(game.id, partitionKey).delete();
        console.log(`✅ Deleted game: ${game.awayTeam} vs ${game.homeTeam} (${game.gameDate})`);
      } catch (deleteError) {
        if (deleteError.code === 404) {
          console.log(`ℹ️  Game ${game.id} already removed`);
        } else {
          console.error(`❌ Failed to delete game ${game.id}:`, deleteError.message);
        }
      }
    }
    
    console.log('✨ Adding new scheduled games...');
    
    // Add new games
    for (const game of newGames) {
      try {
        const { resource } = await gamesContainer.items.create(game);
        console.log(`✅ Created game: ${game.awayTeam} vs ${game.homeTeam} on ${new Date(game.gameDate).toLocaleDateString()}`);
      } catch (createError) {
        console.error(`❌ Failed to create game ${game.id}:`, createError.message);
      }
    }
    
    console.log('🎉 Scheduled games replacement completed successfully!');
    console.log(`📅 New schedule:`);
    
    // Display the new schedule
    newGames.forEach(game => {
      const date = new Date(game.gameDate);
      console.log(`   ${date.toLocaleDateString()} - ${game.awayTeam} @ ${game.homeTeam}`);
    });
    
  } catch (error) {
    console.error('💥 Error during games replacement:', error);
    process.exit(1);
  }
}

// Run the script
replaceScheduledGames()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
