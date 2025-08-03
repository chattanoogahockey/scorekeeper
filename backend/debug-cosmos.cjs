require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

async function debugCosmos() {
  const endpoint = process.env.COSMOS_DB_URI;
  const key = process.env.COSMOS_DB_KEY;
  const databaseName = process.env.COSMOS_DB_NAME;

  console.log('=== COSMOS DB DEBUG ===');
  console.log('Database:', databaseName);
  console.log('Endpoint:', endpoint ? 'Set' : 'Not set');
  console.log('Key:', key ? 'Set' : 'Not set');
  
  if (!endpoint || !key) {
    console.error('Missing Cosmos DB credentials');
    return;
  }

  const client = new CosmosClient({ endpoint, key });
  const database = client.database(databaseName);
  
  try {
    // Check games
    console.log('\n=== GAMES ===');
    const gamesContainer = database.container('games');
    const { resources: games } = await gamesContainer.items.readAll().fetchAll();
    console.log(`Found ${games.length} games:`);
    games.forEach(game => {
      console.log(`- ID: "${game.id}" | League: "${game.league}" | Teams: ${game.homeTeam} vs ${game.awayTeam} | Status: ${game.gameStatus || game.status || 'no status'}`);
      console.log(`  Full game object:`, JSON.stringify(game, null, 2));
    });

    // Check goals for game 1
    console.log('\n=== GOALS FOR GAME 1 ===');
    const goalsContainer = database.container('goals');
    const { resources: goals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: "1" }]
      })
      .fetchAll();
    
    console.log(`Found ${goals.length} goals for game 1:`);
    goals.forEach(goal => {
      console.log(`- Goal by: ${goal.scorer || goal.playerName} | Team: ${goal.scoringTeam || goal.teamName} | Time: ${goal.time || goal.timeRemaining}`);
    });

    // Test game lookup like the announcer does
    console.log('\n=== GAME LOOKUP TEST ===');
    const gameId = "1";
    let game;
    
    try {
      // Try direct lookup first (this is what fails)
      console.log('Trying direct lookup...');
      const { resource: directGame } = await gamesContainer.item(gameId, gameId).read();
      game = directGame;
      console.log('✅ Direct lookup succeeded');
      console.log('Direct game result:', directGame ? 'Found' : 'Not found');
    } catch (err) {
      console.log('❌ Direct lookup failed:', err.message);
      
      // Try query lookup
      console.log('Trying query lookup...');
      const { resources: gamesByQuery } = await gamesContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId",
          parameters: [{ name: "@gameId", value: gameId }]
        })
        .fetchAll();
      
      console.log(`Query found ${gamesByQuery.length} games`);
      if (gamesByQuery.length > 0) {
        game = gamesByQuery[0];
        console.log('✅ Query lookup succeeded');
      } else {
        console.log('❌ Query lookup failed');
      }
    }
    
    if (game) {
      console.log('✅ Game found successfully!');
      console.log('Game teams:', game.homeTeam, 'vs', game.awayTeam);
    } else {
      console.log('❌ No game found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugCosmos().catch(console.error);
