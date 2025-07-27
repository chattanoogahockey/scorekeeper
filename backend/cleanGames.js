import { getGamesContainer } from './cosmosClient.js';

async function cleanGames() {
  const container = getGamesContainer();

  // Gold games (real team names)
  const goldGames = [
    { id: '1', homeTeam: 'Bachstreet Boys', awayTeam: 'Toe Draggins' },
    { id: '2', homeTeam: 'Purpetrators', awayTeam: 'Skateful Dead' },
    { id: '3', homeTeam: 'Skateful Dead', awayTeam: 'Purpetrators' },
  ];

  // Dummy Silver and Bronze game IDs
  const silverIds = ['dummy-silver-1', 'dummy-silver-2', 'dummy-silver-3'];
  const bronzeIds = ['dummy-bronze-1', 'dummy-bronze-2', 'dummy-bronze-3'];

  // Get all games
  const { resources: games } = await container.items.query({ query: 'SELECT * FROM c', parameters: [] }).fetchAll();

  // Build set of allowed IDs
  const allowedIds = new Set([
    ...goldGames.map(g => g.id),
    ...silverIds,
    ...bronzeIds,
  ]);

  // Delete games not in allowedIds
  let deleted = 0;
  for (const game of games) {
    if (!allowedIds.has(game.id)) {
      await container.item(game.id, game.league).delete();
      deleted++;
      console.log(`🗑️ Deleted extra game: ${game.id} (${game.homeTeam} vs ${game.awayTeam})`);
    }
  }
  console.log(`Cleanup complete. Deleted ${deleted} extra games.`);
}

cleanGames();
