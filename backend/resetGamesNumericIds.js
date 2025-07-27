import { getGamesContainer } from './cosmosClient.js';

async function resetGamesNumericIds() {
  const container = getGamesContainer();

  // Gold games (real team names)
  const goldGames = [
    { id: '1', date: '1/30/2025', homeTeam: 'Bachstreet Boys', awayTeam: 'Toe Draggins', league: 'cha-hockey', division: 'Gold' },
    { id: '2', date: '1/30/2025', homeTeam: 'Purpetrators', awayTeam: 'Skateful Dead', league: 'cha-hockey', division: 'Gold' },
    { id: '3', date: '1/30/2025', homeTeam: 'Skateful Dead', awayTeam: 'Purpetrators', league: 'cha-hockey', division: 'Gold' },
  ];

  // Silver dummy games
  const silverTeams = ['Silver Sharks', 'Silver Blades', 'Silver Storm'];
  const silverGames = [
    { id: '4', date: '8/6/2025', homeTeam: silverTeams[0], awayTeam: silverTeams[1], league: 'cha-hockey', division: 'Silver' },
    { id: '5', date: '8/7/2025', homeTeam: silverTeams[1], awayTeam: silverTeams[2], league: 'cha-hockey', division: 'Silver' },
    { id: '6', date: '8/8/2025', homeTeam: silverTeams[2], awayTeam: silverTeams[0], league: 'cha-hockey', division: 'Silver' },
  ];

  // Bronze dummy games
  const bronzeTeams = ['Bronze Bears', 'Bronze Blizzards', 'Bronze Bandits'];
  const bronzeGames = [
    { id: '7', date: '8/9/2025', homeTeam: bronzeTeams[0], awayTeam: bronzeTeams[1], league: 'cha-hockey', division: 'Bronze' },
    { id: '8', date: '8/10/2025', homeTeam: bronzeTeams[1], awayTeam: bronzeTeams[2], league: 'cha-hockey', division: 'Bronze' },
    { id: '9', date: '8/11/2025', homeTeam: bronzeTeams[2], awayTeam: bronzeTeams[0], league: 'cha-hockey', division: 'Bronze' },
  ];

  // Remove all existing games
  const { resources: games } = await container.items.query({ query: 'SELECT * FROM c', parameters: [] }).fetchAll();
  for (const game of games) {
    await container.item(game.id, game.league).delete();
    console.log(`🗑️ Deleted old game: ${game.id} (${game.homeTeam} vs ${game.awayTeam})`);
  }

  // Insert new games with numeric IDs
  let inserted = 0;
  for (const game of [...goldGames, ...silverGames, ...bronzeGames]) {
    game.updatedAt = new Date().toISOString();
    await container.items.create(game);
    inserted++;
    console.log(`✅ Inserted game ${game.id}: ${game.homeTeam} vs ${game.awayTeam} [${game.division}]`);
  }
  console.log(`🎉 Reset complete. Inserted ${inserted} games with numeric IDs.`);
}

resetGamesNumericIds();
