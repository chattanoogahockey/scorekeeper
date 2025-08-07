import { getGamesContainer, getRostersContainer, initializeContainers } from './cosmosClient.js';

console.log('🔍 Checking Cosmos DB data...');
await initializeContainers();

// Check games container
console.log('\n📊 GAMES CONTAINER:');
const gamesContainer = getGamesContainer();
const { resources: games } = await gamesContainer.items.query('SELECT * FROM c').fetchAll();
console.log('Total games in Cosmos:', games.length);
if (games.length > 0) {
  games.forEach((g, i) => {
    console.log(`  ${i+1}. ${g.awayTeam} vs ${g.homeTeam} - Division: ${g.division} - Date: ${g.gameDate}`);
  });
} else {
  console.log('  No games found in Cosmos DB');
}

// Check rosters container  
console.log('\n👥 ROSTERS CONTAINER:');
const rostersContainer = getRostersContainer();
const { resources: rosters } = await rostersContainer.items.query('SELECT * FROM c').fetchAll();
console.log('Total rosters in Cosmos:', rosters.length);
if (rosters.length > 0) {
  rosters.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.teamName} - ${r.players.length} players - Division: ${r.division}`);
  });
} else {
  console.log('  No rosters found in Cosmos DB');
}
