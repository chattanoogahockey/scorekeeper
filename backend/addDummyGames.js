import { getGamesContainer } from './cosmosClient.js';

async function addDummyGames() {
  const container = getGamesContainer();
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');

  // Helper to get a future date string
  function futureDate(days) {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  }

  const silverTeams = ['Silver Sharks', 'Silver Blades', 'Silver Storm'];
  const bronzeTeams = ['Bronze Bears', 'Bronze Blizzards', 'Bronze Bandits'];

  const dummyGames = [
    // Silver games
    {
      id: 'dummy-silver-1',
      date: futureDate(10),
      homeTeam: silverTeams[0],
      awayTeam: silverTeams[1],
      league: 'cha-hockey',
      division: 'Silver',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dummy-silver-2',
      date: futureDate(11),
      homeTeam: silverTeams[1],
      awayTeam: silverTeams[2],
      league: 'cha-hockey',
      division: 'Silver',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dummy-silver-3',
      date: futureDate(12),
      homeTeam: silverTeams[2],
      awayTeam: silverTeams[0],
      league: 'cha-hockey',
      division: 'Silver',
      updatedAt: new Date().toISOString(),
    },
    // Bronze games
    {
      id: 'dummy-bronze-1',
      date: futureDate(13),
      homeTeam: bronzeTeams[0],
      awayTeam: bronzeTeams[1],
      league: 'cha-hockey',
      division: 'Bronze',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dummy-bronze-2',
      date: futureDate(14),
      homeTeam: bronzeTeams[1],
      awayTeam: bronzeTeams[2],
      league: 'cha-hockey',
      division: 'Bronze',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dummy-bronze-3',
      date: futureDate(15),
      homeTeam: bronzeTeams[2],
      awayTeam: bronzeTeams[0],
      league: 'cha-hockey',
      division: 'Bronze',
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const game of dummyGames) {
    await container.items.create(game);
    console.log(`✅ Inserted ${game.division} game: ${game.homeTeam} vs ${game.awayTeam}`);
  }
  console.log('🎉 Dummy Silver and Bronze games added!');
}

addDummyGames();
