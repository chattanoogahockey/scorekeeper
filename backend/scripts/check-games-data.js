#!/usr/bin/env node
import { getGamesContainer } from '../cosmosClient.js';

async function checkGamesData() {
  try {
    const container = getGamesContainer();
    const { resources: games } = await container.items
      .query('SELECT TOP 10 * FROM c')
      .fetchAll();

    console.log('Sample games:');
    games.forEach((game, i) => {
      console.log(`${i+1}. ID: ${game.id}, Status: ${game.status}, Home: ${game.hometeam || game.homeTeam}, Away: ${game.awayteam || game.awayTeam}`);
    });
    console.log(`Total games found: ${games.length}`);

    // Also check total count
    const { resources: allGames } = await container.items
      .query('SELECT VALUE COUNT(1) FROM c')
      .fetchAll();

    console.log(`Total games in container: ${allGames[0]}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkGamesData();
