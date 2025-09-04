#!/usr/bin/env node
import { getGamesContainer } from '../cosmosClient.js';

/**
 * Verify games were uploaded correctly
 */
async function verifyGames() {
  try {
    const gamesContainer = getGamesContainer();

    // Count total games
    const { resources: allGames } = await gamesContainer.items
      .query('SELECT VALUE COUNT(1) FROM c')
      .fetchAll();

    console.log(`📊 Total games in container: ${allGames[0]}`);

    // Get upcoming games
    const { resources: upcomingGames } = await gamesContainer.items
      .query({
        query: 'SELECT c.id, c.hometeam, c.awayteam, c.date, c.starttime, c.status FROM c WHERE c.status = @status ORDER BY c.date',
        parameters: [{ name: '@status', value: 'upcoming' }]
      })
      .fetchAll();

    console.log(`📅 Upcoming games: ${upcomingGames.length}`);

    if (upcomingGames.length > 0) {
      console.log('\n🎯 First 5 upcoming games:');
      upcomingGames.slice(0, 5).forEach((game, index) => {
        console.log(`${index + 1}. ${game.hometeam} vs ${game.awayteam}`);
        console.log(`   📅 ${game.date} at ${game.starttime}`);
        console.log(`   🆔 ${game.id}`);
        console.log('');
      });
    }

    // Check for different divisions
    const { resources: divisions } = await gamesContainer.items
      .query('SELECT DISTINCT VALUE c.hometeam FROM c WHERE CONTAINS(c.hometeam, ">")')
      .fetchAll();

    console.log(`🏆 Teams found: ${divisions.length}`);
    console.log('Sample teams:', divisions.slice(0, 3).join(', '));

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyGames();
