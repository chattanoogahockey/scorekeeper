import { getGamesContainer, initializeContainers } from './cosmosClient.js';

await initializeContainers();
const gamesContainer = getGamesContainer();
const { resources: games } = await gamesContainer.items.query('SELECT * FROM c WHERE c.division = "Gold"').fetchAll();

console.log('Gold games found:', games.length);
games.forEach(game => {
  console.log('- Game:', game.awayTeam, 'vs', game.homeTeam);
  console.log('  Event Type:', game.eventType || 'NO EVENT TYPE');  
  console.log('  Game Status:', game.status || 'NO STATUS');
  console.log('  Submitted At:', game.submittedAt || 'NOT SUBMITTED');
  console.log('  Game Date:', game.gameDate);
  console.log('---');
});
