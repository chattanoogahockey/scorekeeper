#!/usr/bin/env node
import { getGamesContainer } from '../cosmosClient.js';
import logger from '../logger.js';

/**
 * Clean up team names in games container
 * Remove "Division > " prefix to enable proper joins with rosters
 */

function cleanTeamName(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    return teamName;
  }

  // Remove division prefix (e.g., "Bronze > Team Name" -> "Team Name")
  const parts = teamName.split('>').map(part => part.trim());
  return parts.length > 1 ? parts[1] : parts[0];
}

function extractDivision(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    return null;
  }

  // Extract division from prefix (e.g., "Bronze > Team Name" -> "Bronze")
  const parts = teamName.split('>').map(part => part.trim());
  return parts.length > 1 ? parts[0] : null;
}

async function cleanGamesData() {
  const gamesContainer = getGamesContainer();

  try {
    console.log('🏒 Starting games data cleanup...');

    // Get all games
    const { resources: games } = await gamesContainer.items
      .query('SELECT * FROM c')
      .fetchAll();

    console.log(`📊 Found ${games.length} games to clean up`);

    let cleanedCount = 0;
    let skippedCount = 0;

    for (const game of games) {
      const originalHomeTeam = game.hometeam || game.homeTeam;
      const originalAwayTeam = game.awayteam || game.awayTeam;

      // Clean team names
      const cleanHomeTeam = cleanTeamName(originalHomeTeam);
      const cleanAwayTeam = cleanTeamName(originalAwayTeam);

      // Extract divisions
      const homeDivision = extractDivision(originalHomeTeam);
      const awayDivision = extractDivision(originalAwayTeam);

      // Check if cleanup is needed
      const needsCleanup = (cleanHomeTeam !== originalHomeTeam) ||
                          (cleanAwayTeam !== originalAwayTeam) ||
                          !game.division;

      if (!needsCleanup) {
        console.log(`⏭️  Skipping game ${game.id} - already clean`);
        skippedCount++;
        continue;
      }

      // Prepare update
      const updates = {
        ...game,
        hometeam: cleanHomeTeam,
        awayteam: cleanAwayTeam,
        homeTeam: cleanHomeTeam, // Also update camelCase version
        awayTeam: cleanAwayTeam,
        division: homeDivision || awayDivision || game.division || 'Unknown',
        updatedAt: new Date().toISOString()
      };

      // Remove old fields if they exist
      delete updates.homeTeam;
      delete updates.awayTeam;

      // Update the game
      await gamesContainer.item(game.id).replace(updates);

      console.log(`✅ Cleaned game: ${originalHomeTeam} vs ${originalAwayTeam}`);
      console.log(`   → ${cleanHomeTeam} vs ${cleanAwayTeam} (Division: ${updates.division})`);

      cleanedCount++;
    }

    console.log('\n🎉 Cleanup Complete!');
    console.log('==================');
    console.log(`✅ Games cleaned: ${cleanedCount}`);
    console.log(`⏭️  Games skipped: ${skippedCount}`);
    console.log(`📊 Total games: ${games.length}`);

    // Show sample of cleaned data
    if (cleanedCount > 0) {
      const { resources: sampleGames } = await gamesContainer.items
        .query('SELECT TOP 3 c.id, c.hometeam, c.awayteam, c.division FROM c')
        .fetchAll();

      console.log('\n📋 Sample cleaned games:');
      sampleGames.forEach(game => {
        console.log(`  - ${game.hometeam} vs ${game.awayteam} (${game.division})`);
      });
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanGamesData();
