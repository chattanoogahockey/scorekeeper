import { DatabaseService } from '../src/services/database.js';
import logger from '../logger.js';

/**
 * Script to add "Sub" players to existing team rosters in Cosmos DB
 * This will permanently add Sub players to the roster documents
 */

const SUB_PLAYERS_DATA = [
  { teamName: "Barkcheck", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Crease Crusaders", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Dumb Pucks", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Silent Knights", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Skate Invaders", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Stitches", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Trailer Puck Boys", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Vice City Panthers", division: "Bronze", season: "Fall", year: 2025 },
  { teamName: "Corn Stars", division: "Gold", season: "Fall", year: 2025 },
  { teamName: "Noah's Arknemesis", division: "Gold", season: "Fall", year: 2025 },
  { teamName: "Purpetrators", division: "Gold", season: "Fall", year: 2025 },
  { teamName: "Sislo", division: "Gold", season: "Fall", year: 2025 },
  { teamName: "Slappy Gilmores", division: "Gold", season: "Fall", year: 2025 },
  { teamName: "UTC", division: "Gold", season: "Fall", year: 2025 },
  { teamName: "Board Busters", division: "Silver", season: "Fall", year: 2025 },
  { teamName: "Crease Grease", division: "Silver", season: "Fall", year: 2025 },
  { teamName: "Danglin Under the Influence", division: "Silver", season: "Fall", year: 2025 },
  { teamName: "Mracnaphobia", division: "Silver", season: "Fall", year: 2025 },
  { teamName: "Net, Sticks and Chill", division: "Silver", season: "Fall", year: 2025 },
  { teamName: "Silent Knights", division: "Silver", season: "Fall", year: 2025 }
];

async function addSubPlayersToRosters() {
  try {
    logger.info('🔄 Starting Sub player addition to rosters...');

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const teamData of SUB_PLAYERS_DATA) {
      try {
        // Generate roster ID based on the naming convention
        const rosterId = `${teamData.teamName.replace(/\s+/g, '_').toLowerCase()}_${teamData.season.toLowerCase()}_${teamData.year}`;
        
        logger.info(`🔍 Processing roster: ${rosterId}`);

        // Get the existing roster
        const existingRoster = await DatabaseService.getById('rosters', rosterId);
        
        if (!existingRoster) {
          logger.warn(`⚠️ Roster not found: ${rosterId}`);
          errorCount++;
          continue;
        }

        // Check if Sub player already exists
        const hasSubPlayer = existingRoster.players.some(player => 
          player.name === 'Sub' || player.position === 'Sub'
        );

        if (hasSubPlayer) {
          logger.info(`⏭️ Sub player already exists in ${teamData.teamName}`);
          skipCount++;
          continue;
        }

        // Add Sub player to the roster
        const subPlayer = {
          name: 'Sub',
          firstName: 'Sub',
          lastName: '',
          jerseyNumber: null,
          position: 'Player'
        };

        existingRoster.players.push(subPlayer);

        // Update the roster in the database
        await DatabaseService.update('rosters', rosterId, {
          players: existingRoster.players
        });

        logger.info(`✅ Added Sub player to ${teamData.teamName} (${teamData.division} Division)`);
        successCount++;

      } catch (error) {
        logger.error(`❌ Error processing ${teamData.teamName}:`, error.message);
        errorCount++;
      }
    }

    logger.info('📊 Sub player addition completed:', {
      total: SUB_PLAYERS_DATA.length,
      success: successCount,
      errors: errorCount,
      skipped: skipCount
    });

    if (successCount > 0) {
      logger.info('🎉 Sub players have been successfully added to rosters!');
    }

  } catch (error) {
    logger.error('💥 Fatal error in Sub player addition script:', error);
    throw error;
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addSubPlayersToRosters()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { addSubPlayersToRosters };
