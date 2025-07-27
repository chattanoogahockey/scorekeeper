import { getGamesContainer } from './cosmosClient.js';

// Sample games data with team matchups, times, and leagues
const sampleGames = [
  {
    homeTeam: "Bachstreet Boys",
    awayTeam: "Whiskey Dekes",
    gameDate: "2025-08-01",
    gameTime: "19:00",
    league: "Gold",
    venue: "Ice Arena A",
    status: "scheduled"
  },
  {
    homeTeam: "Purpetrators",
    awayTeam: "Toe Draggins",
    gameDate: "2025-08-01",
    gameTime: "20:30",
    league: "Gold",
    venue: "Ice Arena A",
    status: "scheduled"
  },
  {
    homeTeam: "Skateful Dead",
    awayTeam: "Bachstreet Boys",
    gameDate: "2025-08-02",
    gameTime: "18:30",
    league: "Gold",
    venue: "Ice Arena B",
    status: "scheduled"
  },
  {
    homeTeam: "Whiskey Dekes",
    awayTeam: "Purpetrators",
    gameDate: "2025-08-02",
    gameTime: "20:00",
    league: "Gold",
    venue: "Ice Arena B",
    status: "scheduled"
  },
  {
    homeTeam: "Toe Draggins",
    awayTeam: "Skateful Dead",
    gameDate: "2025-08-03",
    gameTime: "19:00",
    league: "Gold",
    venue: "Ice Arena A",
    status: "scheduled"
  },
  // Add some Silver league games as examples
  {
    homeTeam: "Team Silver 1",
    awayTeam: "Team Silver 2",
    gameDate: "2025-08-04",
    gameTime: "18:00",
    league: "Silver",
    venue: "Ice Arena B",
    status: "scheduled"
  },
  {
    homeTeam: "Team Silver 3",
    awayTeam: "Team Silver 4",
    gameDate: "2025-08-04",
    gameTime: "19:30",
    league: "Silver",
    venue: "Ice Arena B",
    status: "scheduled"
  },
  // Add some Bronze league games as examples
  {
    homeTeam: "Team Bronze 1",
    awayTeam: "Team Bronze 2",
    gameDate: "2025-08-05",
    gameTime: "17:00",
    league: "Bronze",
    venue: "Ice Arena A",
    status: "scheduled"
  }
];

async function loadSampleGames() {
  try {
    const container = getGamesContainer();
    
    console.log('🏒 Loading sample games into Cosmos DB...');
    
    for (let i = 0; i < sampleGames.length; i++) {
      const game = sampleGames[i];
      const gameRecord = {
        id: `game-${game.homeTeam.toLowerCase().replace(/\s+/g, '-')}-vs-${game.awayTeam.toLowerCase().replace(/\s+/g, '-')}-${game.gameDate}`,
        gameId: `${game.gameDate}-${game.gameTime.replace(':', '')}-${i}`,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeTeamId: game.homeTeam.toLowerCase().replace(/\s+/g, '-'),
        awayTeamId: game.awayTeam.toLowerCase().replace(/\s+/g, '-'),
        gameDate: game.gameDate,
        gameTime: game.gameTime,
        gameDateTime: `${game.gameDate}T${game.gameTime}:00`,
        league: game.league,
        leagueId: game.league.toLowerCase(),
        venue: game.venue,
        status: game.status,
        season: "2025",
        homeScore: 0,
        awayScore: 0,
        period: 0,
        gameLength: "3x20", // 3 periods of 20 minutes
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const { resource } = await container.items.create(gameRecord);
      console.log(`✅ Added game: ${game.homeTeam} vs ${game.awayTeam} (${game.league} League) - ${game.gameDate} ${game.gameTime}`);
    }
    
    console.log(`🎉 Successfully loaded ${sampleGames.length} games into the games container!`);
    console.log('\n📋 Leagues available:');
    const leagues = [...new Set(sampleGames.map(g => g.league))];
    leagues.forEach(league => console.log(`   - ${league}`));
    
  } catch (error) {
    console.error('❌ Error loading sample games:', error);
  }
}

// Run the script
loadSampleGames();
