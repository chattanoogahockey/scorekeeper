import { getGamesContainer, getGoalsContainer, getPenaltiesContainer, getRinkReportsContainer } from './cosmosClient.js';

// Helper function to get day of year
function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate a comprehensive rink report for a specific division (all submitted games)
 */
export async function generateRinkReport(division) {
  const reportId = `${division}-all-submitted`;
  console.log(`📰 Generating rink report for ${division} division (all submitted games)`);
  
  try {
    const gameData = await aggregateGameData(division);
    const reportContent = await generateReportContent(division, gameData);
    
    // Store the report in Cosmos DB
    const report = {
      id: reportId,
      division,
      publishedAt: new Date().toISOString(),
      author: 'Chattanooga Hockey League Sports Desk',
      title: `${division} Division Weekly Roundup - The Drama Continues!`,
      html: reportContent.html,
      highlights: reportContent.highlights,
      standoutPlayers: reportContent.standoutPlayers,
      leagueUpdates: reportContent.leagueUpdates,
      upcomingPredictions: reportContent.upcomingPredictions,
      generatedBy: 'auto',
      lastUpdated: new Date().toISOString()
    };
    
    const container = getRinkReportsContainer();
    await container.items.upsert(report);
    
    console.log(`✅ Rink report generated and stored for ${division} division`);
    return report;
  } catch (error) {
    console.error(`❌ Error generating rink report for ${division} division:`, error);
    throw error;
  }
}

/**
 * Aggregate all game data for a specific division (all submitted games)
 */
async function aggregateGameData(division) {
  const gamesContainer = getGamesContainer();
  const goalsContainer = getGoalsContainer();
  const penaltiesContainer = getPenaltiesContainer();
  
  // Get all games for this division (for now, including scheduled ones since no games completed yet)
  const gamesQuery = {
    query: `
      SELECT * FROM c 
      WHERE c.division = @division 
      ORDER BY c.gameDate DESC
    `,
    parameters: [
      { name: '@division', value: division }
    ]
  };
  
  const { resources: games } = await gamesContainer.items.query(gamesQuery).fetchAll();
  
  // Get all goals for these games
  const gameIds = games.map(g => g.id || g.gameId);
  let allGoals = [];
  let allPenalties = [];
  
  if (gameIds.length > 0) {
    // Build query for goals
    const goalsQuery = {
      query: `SELECT * FROM c WHERE c.gameId IN (${gameIds.map((_, i) => `@gameId${i}`).join(', ')})`,
      parameters: gameIds.map((id, i) => ({ name: `@gameId${i}`, value: id }))
    };
    
    const { resources: goals } = await goalsContainer.items.query(goalsQuery).fetchAll();
    allGoals = goals;
    
    // Build query for penalties  
    const penaltiesQuery = {
      query: `SELECT * FROM c WHERE c.gameId IN (${gameIds.map((_, i) => `@gameId${i}`).join(', ')})`,
      parameters: gameIds.map((id, i) => ({ name: `@gameId${i}`, value: id }))
    };
    
    const { resources: penalties } = await penaltiesContainer.items.query(penaltiesQuery).fetchAll();
    allPenalties = penalties;
  } else {
    console.log('No games found for goals/penalties query');
  }
  
  return {
    division,
    games,
    goals: allGoals,
    penalties: allPenalties,
    gameStats: calculateGameStats(games, allGoals, allPenalties)
  };
}

/**
 * Generate HTML content and structured data for the report
 */
async function generateReportContent(division, gameData) {
  const { games, goals, penalties, gameStats } = gameData;
  
  // Generate highlights
  const highlights = generateHighlights(games, goals, penalties, gameStats);
  
  // Generate standout players
  const standoutPlayers = generateStandoutPlayers(goals, penalties, gameStats);
  
  // Generate league updates
  const leagueUpdates = generateLeagueUpdates(division, gameStats);
  
  // Generate upcoming predictions (placeholder for now)
  const upcomingPredictions = generateUpcomingPredictions(division, gameStats);
  
  // Generate main article HTML
  const html = generateArticleHTML(division, gameStats, highlights, standoutPlayers);
  
  return {
    html,
    highlights,
    standoutPlayers,
    leagueUpdates,
    upcomingPredictions
  };
}

/**
 * Calculate comprehensive statistics for all games
 */
function calculateGameStats(games, goals, penalties) {
  const stats = {
    totalGames: games.length,
    totalGoals: goals.length,
    totalPenalties: penalties.length,
    totalPIM: penalties.reduce((sum, p) => sum + parseInt(p.penaltyLength || p.length || 0), 0),
    teams: {},
    players: {},
    topScorers: [],
    gameResults: []
  };
  
  // Process games
  games.forEach(game => {
    if (game.gameSummary) {
      const result = {
        gameId: game.gameId,
        teams: Object.keys(game.gameSummary.goalsByTeam || {}),
        scores: game.gameSummary.goalsByTeam || {},
        finalScore: game.finalScore || {},
        totalGoals: game.totalGoals || 0,
        totalPenalties: game.totalPenalties || 0
      };
      stats.gameResults.push(result);
    }
  });
  
  // Process goals for player stats
  goals.forEach(goal => {
    const playerName = goal.playerName || goal.scorer;
    const teamName = goal.teamName || goal.scoringTeam;
    
    if (playerName) {
      if (!stats.players[playerName]) {
        stats.players[playerName] = { 
          name: playerName, 
          team: teamName, 
          goals: 0, 
          assists: 0, 
          points: 0, 
          pim: 0 
        };
      }
      stats.players[playerName].goals++;
      stats.players[playerName].points++;
      
      // Count assists
      const assists = goal.assistedBy || goal.assists || [];
      assists.forEach(assist => {
        if (!stats.players[assist]) {
          stats.players[assist] = { 
            name: assist, 
            team: teamName, 
            goals: 0, 
            assists: 0, 
            points: 0, 
            pim: 0 
          };
        }
        stats.players[assist].assists++;
        stats.players[assist].points++;
      });
    }
    
    if (teamName) {
      if (!stats.teams[teamName]) {
        stats.teams[teamName] = { name: teamName, goals: 0, penalties: 0, pim: 0, games: 0 };
      }
      stats.teams[teamName].goals++;
    }
  });
  
  // Process penalties
  penalties.forEach(penalty => {
    const playerName = penalty.playerName || penalty.penalizedPlayer;
    const teamName = penalty.teamName || penalty.penalizedTeam;
    const pim = parseInt(penalty.penaltyLength || penalty.length || 0);
    
    if (playerName && stats.players[playerName]) {
      stats.players[playerName].pim += pim;
    }
    
    if (teamName) {
      if (!stats.teams[teamName]) {
        stats.teams[teamName] = { name: teamName, goals: 0, penalties: 0, pim: 0, games: 0 };
      }
      stats.teams[teamName].penalties++;
      stats.teams[teamName].pim += pim;
    }
  });
  
  // Calculate team games played
  stats.gameResults.forEach(result => {
    result.teams.forEach(teamName => {
      if (stats.teams[teamName]) {
        stats.teams[teamName].games++;
      }
    });
  });
  
  // Generate top scorers list
  stats.topScorers = Object.values(stats.players)
    .filter(p => p.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);
  
  return stats;
}

/**
 * Generate game highlights based on the data
 */
function generateHighlights(games, goals, penalties, gameStats) {
  const highlights = [];
  
  // High-scoring games
  const highScoringGames = gameStats.gameResults.filter(g => g.totalGoals >= 8);
  highScoringGames.forEach(game => {
    const teamNames = game.teams.join(' vs ');
    highlights.push(`🔥 GOAL FEST ALERT: ${teamNames} turned it into a ${game.totalGoals}-goal barn burner!`);
  });
  
  // Hat tricks
  const hatTricks = Object.values(gameStats.players).filter(p => p.goals >= 3);
  hatTricks.forEach(player => {
    highlights.push(`🎩 HAT TRICK HERO: ${player.name} lights the lamp ${player.goals} times—what a performance!`);
  });
  
  // Close games (1-goal difference)
  const closeGames = gameStats.gameResults.filter(game => {
    const scores = Object.values(game.scores);
    if (scores.length === 2) {
      return Math.abs(scores[0] - scores[1]) === 1;
    }
    return false;
  });
  closeGames.forEach(game => {
    highlights.push(`⚡ EDGE-OF-YOUR-SEAT THRILLER: ${game.teams.join(' squeaks past ')} in a heart-stopper!`);
  });
  
  // Penalty-heavy games
  const penaltyHeavyGames = gameStats.gameResults.filter(g => g.totalPenalties >= 8);
  penaltyHeavyGames.forEach(game => {
    highlights.push(`🥊 BATTLE ROYALE: ${game.teams.join(' vs ')} threw down with ${game.totalPenalties} penalties—no backing down!`);
  });
  
  // Shutout performances
  const shutouts = gameStats.gameResults.filter(game => {
    const scores = Object.values(game.scores);
    return scores.includes(0) && game.totalGoals > 0;
  });
  shutouts.forEach(game => {
    highlights.push(`🥅 GOALIE CLINIC: Someone got blanked in ${game.teams.join(' vs ')}—defensive masterpiece!`);
  });
  
  // Fallback highlights if no specific events
  if (highlights.length === 0) {
    highlights.push(`🚨 SCOREBOARD WATCH: ${gameStats.totalGames} games delivered ${gameStats.totalGoals} goals worth of pure hockey drama!`);
    highlights.push(`⚡ INTENSITY METER: ${gameStats.totalPenalties} penalties and ${gameStats.totalPIM} PIM—this league doesn't mess around!`);
    if (gameStats.topScorers.length > 0) {
      const topScorer = gameStats.topScorers[0];
      highlights.push(`🌟 POINTS MACHINE: ${topScorer.name} is setting the pace with ${topScorer.points} points—automatic!`);
    }
  }
  
  return highlights.slice(0, 6); // Limit to 6 highlights
}

/**
 * Generate standout players for the week
 */
function generateStandoutPlayers(goals, penalties, gameStats) {
  const players = [];
  
  // Top 3 scorers with dramatic flair
  gameStats.topScorers.slice(0, 3).forEach((player, index) => {
    let highlight = '';
    let nickname = '';
    
    if (player.goals >= 3) {
      highlight = `Hat trick specialist lighting up the scoreboard!`;
      nickname = 'The Sniper';
    } else if (player.assists >= 3) {
      highlight = `Vision machine setting up teammates all game long!`;
      nickname = 'The Playmaker';
    } else if (player.points >= 4) {
      highlight = `Point-per-game pace and showing no signs of slowing down!`;
      nickname = 'Mr. Clutch';
    } else {
      highlight = `Balanced attack keeping opponents guessing!`;
      nickname = index === 0 ? 'The Leader' : index === 1 ? 'The Threat' : 'The X-Factor';
    }
    
    players.push({
      name: player.name,
      team: player.team,
      nickname,
      stats: `${player.goals}G, ${player.assists}A, ${player.points} points`,
      highlight
    });
  });
  
  return players;
}

/**
 * Generate league updates
 */
function generateLeagueUpdates(division, weekStats) {
  const updates = [];
  
  updates.push(`${division} division completed ${weekStats.totalGames} games this week`);
  updates.push(`Players scored ${weekStats.totalGoals} goals across all matchups`);
  
  if (weekStats.totalPIM > 0) {
    updates.push(`${weekStats.totalPIM} penalty minutes assessed this week`);
  }
  
  if (weekStats.topScorers.length > 0) {
    const avgGoalsPerGame = (weekStats.totalGoals / Math.max(weekStats.totalGames, 1)).toFixed(1);
    updates.push(`Average of ${avgGoalsPerGame} goals per game this week`);
  }
  
  updates.push('Playoff race continues to intensify as season progresses');
  updates.push('Teams preparing for upcoming championship tournament');
  
  return updates;
}

/**
 * Generate upcoming predictions (placeholder for now)
 */
function generateUpcomingPredictions(division, weekStats) {
  // This could be enhanced to look at upcoming scheduled games
  return [
    {
      matchup: 'Top Teams Face Off',
      prediction: 'Expecting high-intensity matchups as playoff race heats up',
      keyFactor: 'Special teams performance will be crucial'
    },
    {
      matchup: 'Divisional Showdowns',
      prediction: 'Key games that could determine playoff seeding',
      keyFactor: 'Consistent scoring and strong defensive play'
    }
  ];
}

/**
 * Generate the main article HTML content
 */
function generateArticleHTML(division, gameStats, highlights, standoutPlayers) {
  const topScorer = gameStats.topScorers[0];
  const topTeam = Object.values(gameStats.teams)
    .filter(t => t.games > 0)
    .sort((a, b) => (b.goals / b.games) - (a.goals / a.games))[0];
  
  const weekNumber = Math.ceil(getDayOfYear() / 7);
  
  return `
    <div class="rink-report">
      <h1>WEEK ${weekNumber} ROUNDUP: ${division.toUpperCase()} DIVISION DELIVERS THE DRAMA!</h1>
      
      <p>Hockey fans, buckle up! The ${division} Division just served up another week of roller hockey that had everything—precision shooting, defensive battles, and enough plot twists to keep us all guessing. With ${gameStats.totalGames} games in the books, players lit the lamp ${gameStats.totalGoals} times while racking up ${gameStats.totalPIM} penalty minutes. Translation? This league means business.</p>
      
      <h2>🚨 SCORESHEET SUPERSTARS</h2>
      
      ${topScorer ? `
      <p><strong>${topScorer.name}</strong> continues their tear through the ${division} Division with ${topScorer.points} points (${topScorer.goals}G, ${topScorer.assists}A). This isn't just stat-stuffing—this is game-changing hockey from a player who's rewriting what it means to dominate on wheels. Every shift, every shot, every assist carries playoff implications.</p>
      ` : `
      <p>The scoring race is heating up, with multiple players battling for supremacy. Early season goals are already making statements about who's ready to carry their team when it matters most.</p>
      `}
      
      ${topTeam ? `
      <h2>⚡ TEAM SPOTLIGHT</h2>
      <p><strong>${topTeam.name}</strong> is setting the pace with ${(topTeam.goals / topTeam.games).toFixed(1)} goals per game—but here's the thing about this division: nobody's running away with anything. These teams are trading punches game after game, and that offensive firepower means every matchup could explode into a barn burner.</p>
      ` : ''}
      
      <h2>🥊 INTENSITY METER</h2>
      <p>Think this league's gone soft? Think again. ${gameStats.totalPenalties} penalties and ${gameStats.totalPIM} minutes in the box tell the story of teams that refuse to back down. This isn't reckless hockey—it's competitive fire burning at exactly the right temperature. When playoff spots are on the line, every battle along the boards matters.</p>
      
      <h2>📈 WHAT'S AT STAKE</h2>
      <p>Here's the reality check: every game from here on out is a playoff audition. Teams are fine-tuning their systems, finding their identity, and figuring out who steps up when the pressure cranks to eleven. The ${division} Division isn't just building toward something—it's arriving there fast.</p>
      
      <h2>🔮 CRYSTAL BALL TIME</h2>
      <p>Next week's slate promises more fireworks. Teams are hitting their stride, rivalries are heating up, and with standings this tight, one hot streak could flip the entire division upside down. The question isn't whether we'll see drama—it's how much drama we can handle.</p>
      
      <p><strong>Bottom line:</strong> The ${division} Division is appointment viewing, and we're just getting started. Lace 'em up, because this ride's about to get wild.</p>
    </div>
    
    <style>
      .rink-report {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .rink-report h1 {
        color: #d32f2f;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 3px solid #d32f2f;
        padding-bottom: 10px;
      }
      
      .rink-report h2 {
        color: #1976d2;
        font-size: 18px;
        font-weight: bold;
        margin-top: 25px;
        margin-bottom: 10px;
      }
      
      .rink-report p {
        margin-bottom: 15px;
        font-size: 16px;
      }
      
      .rink-report strong {
        color: #d32f2f;
        font-weight: bold;
      }
    </style>
  `;
}

/**
 * Trigger report generation for all divisions (all submitted games)
 */
export async function generateReportsForAllDivisions() {
  const divisions = ['Gold', 'Silver', 'Bronze'];
  
  console.log(`📰 Generating reports for all divisions (all submitted games)`);
  
  const results = [];
  for (const division of divisions) {
    try {
      const report = await generateRinkReport(division);
      results.push({ division, success: true, report });
    } catch (error) {
      console.error(`Failed to generate report for ${division}:`, error);
      results.push({ division, success: false, error: error.message });
    }
  }
  
  return results;
}
