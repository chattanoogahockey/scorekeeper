import { getGamesContainer } from './cosmosClient.js';
import fs from 'fs';

async function importGames() {
  try {
    const container = getGamesContainer();
    const games = JSON.parse(fs.readFileSync('games_export.json', 'utf-8'));

    // Team to division mapping (update as needed)
    const teamDivision = {
      'Bachstreet Boys': 'Gold',
      'Whiskey Dekes': 'Gold',
      'Purpetrators': 'Silver',
      'Toe Draggins': 'Silver',
      'Skateful Dead': 'Bronze',
    };

    let imported = 0;
    for (const game of games) {
      // Fix league/division fields
      const homeDiv = teamDivision[game.homeTeam];
      const awayDiv = teamDivision[game.awayTeam];
      game.league = 'cha-hockey';
      game.division = homeDiv || awayDiv || 'Gold'; // fallback to Gold
      game.updatedAt = new Date().toISOString();
      // Remove Cosmos system fields if present
      delete game._rid;
      delete game._self;
      delete game._etag;
      delete game._attachments;
      delete game._ts;
      // Insert into new container
      await container.items.create(game);
      imported++;
      console.log(`✅ Imported game ${game.id}: ${game.homeTeam} vs ${game.awayTeam} [${game.division}]`);
    }
    console.log(`🎉 Imported ${imported} games!`);
  } catch (error) {
    console.error('❌ Error importing games:', error);
  }
}

importGames();
