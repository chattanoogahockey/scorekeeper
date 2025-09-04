#!/usr/bin/env node
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { getRostersContainer } from '../cosmosClient.js';
import logger from '../logger.js';

const excelPath = 'C:\\Users\\marce\\OneDrive\\Documents\\CHAHKY\\data\\fall_2025_rosters_scheduling.xlsx';
const DRY_RUN = process.argv.includes('--dry');

async function processRosterData() {
  try {
    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets['Sheet1'];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${rawData.length} player records in Excel file`);

    // Group players by team
    const teamRosters = {};

    rawData.forEach((row, index) => {
      const playerName = row.Name?.trim();
      const division = row.Division?.trim();
      const position = row.Position?.trim() || 'Player';
      const teamName = row.Team?.trim();
      const year = row.Year;
      const season = row.Season?.trim();

      if (!playerName || !teamName || !division) {
        console.warn(`Skipping row ${index + 2}: Missing required data (Name: ${playerName}, Team: ${teamName}, Division: ${division})`);
        return;
      }

      // Initialize team roster if it doesn't exist
      if (!teamRosters[teamName]) {
        teamRosters[teamName] = {
          teamName,
          division,
          season: season || 'Fall',
          year: year || 2025,
          players: []
        };
      }

      // Add player to team roster
      const playerId = `p_${teamName.replace(/\s+/g, '_').toLowerCase()}_${index + 1}`;
      teamRosters[teamName].players.push({
        playerId,
        name: playerName,
        position
      });
    });

    const rosters = Object.values(teamRosters);
    console.log(`\nProcessed ${rosters.length} team rosters:`);
    rosters.forEach(roster => {
      console.log(`- ${roster.teamName}: ${roster.players.length} players (${roster.division})`);
    });

    if (DRY_RUN) {
      console.log('\nDRY RUN - No data uploaded to Cosmos DB');
      console.log('\nSample roster structure:');
      console.log(JSON.stringify(rosters[0], null, 2));
      return;
    }

    // Upload to Cosmos DB
    const rostersContainer = getRostersContainer();
    let successCount = 0;
    let errorCount = 0;

    for (const roster of rosters) {
      try {
        // Check if roster already exists
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.teamName = @teamName AND c.season = @season AND c.year = @year',
          parameters: [
            { name: '@teamName', value: roster.teamName },
            { name: '@season', value: roster.season },
            { name: '@year', value: roster.year }
          ]
        };

        const { resources: existingRosters } = await rostersContainer.items.query(querySpec).fetchAll();

        if (existingRosters.length > 0) {
          console.log(`Updating existing roster for ${roster.teamName}`);
          const existingRoster = existingRosters[0];
          existingRoster.players = roster.players; // Update players
          await rostersContainer.item(existingRoster.id, existingRoster.teamName).replace(existingRoster);
        } else {
          console.log(`Creating new roster for ${roster.teamName}`);
          const rosterDoc = {
            id: `${roster.teamName.replace(/\s+/g, '_').toLowerCase()}_${roster.season}_${roster.year}`,
            ...roster
          };
          await rostersContainer.items.create(rosterDoc);
        }

        successCount++;
      } catch (error) {
        console.error(`Error uploading roster for ${roster.teamName}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\nUpload complete: ${successCount} successful, ${errorCount} errors`);

  } catch (error) {
    console.error('Error processing roster data:', error.message);
    process.exit(1);
  }
}

processRosterData();
