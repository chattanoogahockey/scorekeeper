import XLSX from 'xlsx';
import { DatabaseService } from '../src/services/database.js';
import logger from '../logger.js';

/**
 * Script to upload roster data from Excel file to Cosmos DB
 * Reads the Excel file and creates roster documents for each team
 */

const EXCEL_FILE_PATH = 'C:\\Users\\marce\\OneDrive\\Documents\\CHAHKY\\data\\fall_2025_rosters.xlsx';

async function uploadRostersFromExcel() {
  try {
    console.log('🏒 Starting roster upload from Excel...');
    console.log(`📁 Reading file: ${EXCEL_FILE_PATH}`);

    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Found ${rawData.length} rows in Excel file`);

    // Group players by team
    const teamRosters = {};
    
    for (const row of rawData) {
      // Handle different possible column names
      const teamName = (row.Team || row.team || row.TeamName || row['Team Name'])?.trim();
      const playerName = (row.Name || row.name || row.PlayerName || row['Player Name'])?.trim();
      const division = (row.Division || row.division)?.trim();
      const position = (row.Position || row.position)?.trim();
      const year = row.Year || row.year || 2025;
      const season = (row.Season || row.season)?.trim();

      if (!teamName || !playerName) {
        console.warn(`⚠️ Skipping row with missing team or player name:`, row);
        continue;
      }

      // Initialize team roster if it doesn't exist
      if (!teamRosters[teamName]) {
        teamRosters[teamName] = {
          teamName,
          division: division || 'Unknown',
          season: season || 'Fall',
          year: year || 2025,
          players: []
        };
      }

      // Add player to team roster
      const player = {
        name: playerName,
        firstName: playerName.split(' ')[0] || playerName,
        lastName: playerName.split(' ').slice(1).join(' ') || '',
        position: position || 'Player',
        jerseyNumber: null // Excel doesn't have jersey numbers
      };

      // Add playerId for non-Sub players
      if (playerName !== 'Sub') {
        player.playerId = `p_${teamName.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)}`;
      }

      teamRosters[teamName].players.push(player);
    }

    console.log(`🏒 Processed ${Object.keys(teamRosters).length} teams`);

    // Upload each team roster to Cosmos DB
    let successCount = 0;
    let errorCount = 0;

    for (const [teamName, rosterData] of Object.entries(teamRosters)) {
      try {
        // Generate roster ID
        const rosterId = `${teamName.replace(/\s+/g, '_').toLowerCase()}_${rosterData.season.toLowerCase()}_${rosterData.year}`;
        
        const rosterDocument = {
          id: rosterId,
          ...rosterData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log(`📤 Uploading roster for ${teamName} (${rosterData.players.length} players)...`);
        
        // Create roster in database
        await DatabaseService.create('rosters', rosterDocument);
        
        console.log(`✅ Successfully uploaded ${teamName}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to upload ${teamName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Roster upload completed!');
    console.log(`✅ Successfully uploaded: ${successCount} teams`);
    console.log(`❌ Failed uploads: ${errorCount} teams`);
    
    if (errorCount === 0) {
      console.log('🏆 All rosters uploaded successfully!');
    }

  } catch (error) {
    console.error('❌ Fatal error during roster upload:', error);
    process.exit(1);
  }
}

// Run the upload
uploadRostersFromExcel()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
