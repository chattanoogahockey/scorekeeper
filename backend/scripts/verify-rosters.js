#!/usr/bin/env node
import { getRostersContainer } from '../cosmosClient.js';

async function verifyRosters() {
  try {
    const container = getRostersContainer();
    const querySpec = {
      query: 'SELECT c.teamName, c.division, ARRAY_LENGTH(c.players) as playerCount FROM c WHERE c.season = @season AND c.year = @year',
      parameters: [
        { name: '@season', value: 'Fall' },
        { name: '@year', value: 2025 }
      ]
    };

    const { resources } = await container.items.query(querySpec).fetchAll();

    console.log('Uploaded Fall 2025 rosters:');
    resources.forEach(roster => {
      console.log(`- ${roster.teamName}: ${roster.playerCount} players (${roster.division})`);
    });
    console.log(`\nTotal: ${resources.length} rosters`);

    // Also check total players across all rosters
    const totalPlayers = resources.reduce((sum, roster) => sum + roster.playerCount, 0);
    console.log(`Total players: ${totalPlayers}`);

  } catch (error) {
    console.error('Error verifying rosters:', error.message);
  }
}

verifyRosters();
