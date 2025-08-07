import { 
  getGamesContainer, 
  initializeContainers 
} from './cosmosClient.js';

/**
 * Script to create the 2 scheduled Gold division games for 4/3/2025
 */

const scheduledGames = [
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

async function createScheduledGames() {
  try {
    console.log('🏒 Creating scheduled Gold division games...');
    
    // Initialize containers first
    await initializeContainers();
    const gamesContainer = getGamesContainer();
    
    console.log('✨ Adding scheduled games...');
    
    for (const game of scheduledGames) {
      try {
        const { resource } = await gamesContainer.items.create(game);
        const gameDate = new Date(game.gameDate).toLocaleDateString();
        console.log(`✅ Created game: ${game.awayTeam} @ ${game.homeTeam} on ${gameDate}`);
      } catch (error) {
        console.error(`❌ Failed to create game: ${game.awayTeam} vs ${game.homeTeam}`, error.message);
      }
    }
    
    console.log('🎉 Scheduled games creation completed successfully!');
    console.log(`📅 Schedule:`);
    scheduledGames.forEach(game => {
      const gameDate = new Date(game.gameDate).toLocaleDateString();
      console.log(`   ${gameDate} - ${game.awayTeam} @ ${game.homeTeam}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating scheduled games:', error);
    process.exit(1);
  }
}

// Run the script
createScheduledGames().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
