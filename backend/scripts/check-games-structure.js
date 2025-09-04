#!/usr/bin/env node
import { getGamesContainer } from '../cosmosClient.js';

async function checkGamesStructure() {
  const container = getGamesContainer();
  const { resources: games } = await container.items.query('SELECT TOP 5 * FROM c').fetchAll();

  console.log('Games structure:');
  games.forEach((game, i) => {
    console.log(`Game ${i+1}:`);
    console.log(`  ID: ${game.id}`);
    console.log(`  Status: ${game.status}`);
    console.log(`  EventType: ${game.eventtype || game.eventType}`);
    console.log(`  Home: ${game.hometeam || game.homeTeam}`);
    console.log(`  Away: ${game.awayteam || game.awayTeam}`);
    console.log(`  Division: ${game.division}`);
    console.log('');
  });
}

checkGamesStructure();
