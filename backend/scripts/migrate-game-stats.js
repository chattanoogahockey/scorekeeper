/**
 * Migration script to populate game stats (goals/shots) in games container
 * This script calculates current stats from existing goals and shots-on-goal containers
 * and updates the games container with the aggregated totals.
 */

import { DatabaseService } from '../src/services/database.js';

const DATABASE = new DatabaseService();

async function migrateGameStats() {
  console.log('🔄 Starting game stats migration...');
  
  try {
    // Get all games
    const gamesContainer = DATABASE.container('games');
    const goalsContainer = DATABASE.container('goals');
    const shotsContainer = DATABASE.container('shots-on-goal');
    
    console.log('📊 Fetching all games...');
    const { resources: games } = await gamesContainer.items.readAll().fetchAll();
    console.log(`✅ Found ${games.length} games to migrate`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const game of games) {
      console.log(`\n🎮 Processing game: ${game.homeTeam} vs ${game.awayTeam} (${game.id})`);
      
      try {
        // Get goals for this game
        const goalsQuery = {
          query: 'SELECT * FROM c WHERE c.gameId = @gameId',
          parameters: [{ name: '@gameId', value: game.id }]
        };
        const { resources: goals } = await goalsContainer.items.query(goalsQuery).fetchAll();
        
        // Calculate goal totals
        let homeTeamGoals = 0;
        let awayTeamGoals = 0;
        
        goals.forEach(goal => {
          if (goal.teamName === game.homeTeam) {
            homeTeamGoals++;
          } else if (goal.teamName === game.awayTeam) {
            awayTeamGoals++;
          }
        });
        
        // Get shots for this game
        const shotsQuery = {
          query: 'SELECT * FROM c WHERE c.gameId = @gameId',
          parameters: [{ name: '@gameId', value: game.id }]
        };
        const { resources: shots } = await shotsContainer.items.query(shotsQuery).fetchAll();
        
        let homeTeamShots = 0;
        let awayTeamShots = 0;
        
        if (shots.length > 0) {
          const shotRecord = shots[0];
          homeTeamShots = shotRecord.home || 0;
          awayTeamShots = shotRecord.away || 0;
        }
        
        // Check if update is needed
        const needsUpdate = (
          game.homeTeamGoals !== homeTeamGoals ||
          game.awayTeamGoals !== awayTeamGoals ||
          game.homeTeamShots !== homeTeamShots ||
          game.awayTeamShots !== awayTeamShots
        );
        
        if (needsUpdate) {
          // Update the game with calculated stats
          game.homeTeamGoals = homeTeamGoals;
          game.awayTeamGoals = awayTeamGoals;
          game.homeTeamShots = homeTeamShots;
          game.awayTeamShots = awayTeamShots;
          game.updatedAt = new Date().toISOString();
          
          await gamesContainer.item(game.id, game.id).replace(game);
          
          console.log(`✅ Updated: H-${homeTeamGoals}/${homeTeamShots}, A-${awayTeamGoals}/${awayTeamShots}`);
          updated++;
        } else {
          console.log(`⏭️ Skipped: Already has correct stats`);
          skipped++;
        }
        
      } catch (gameError) {
        console.error(`❌ Error processing game ${game.id}:`, gameError.message);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`📈 Updated: ${updated} games`);
    console.log(`⏭️ Skipped: ${skipped} games`);
    console.log(`📊 Total: ${games.length} games processed`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateGameStats()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateGameStats };
