import { getGamesContainer, getRostersContainer } from './cosmosClient.js';

console.log('🔍 Testing API endpoints...');

// Test rosters endpoint
const rostersContainer = getRostersContainer();
const { resources: rosters } = await rostersContainer.items.query(
  "SELECT * FROM c WHERE c.division = 'Gold'"
).fetchAll();
console.log('\n👥 /api/rosters?division=Gold would return:');
console.log('Rosters found:', rosters.length);
rosters.forEach(roster => {
  console.log(`  - ${roster.teamName}: ${roster.players.length} players`);
});

// Test games endpoint  
const gamesContainer = getGamesContainer();
const { resources: games } = await gamesContainer.items.query(
  "SELECT * FROM c WHERE c.division = 'Gold'"
).fetchAll();
console.log('\n📊 /api/games?division=Gold would return:');
console.log('Games found:', games.length);
games.forEach(game => {
  console.log(`  - ${game.awayTeam} @ ${game.homeTeam} on ${new Date(game.gameDate).toLocaleDateString()}`);
});
