import { getGamesContainer, getGoalsContainer, getPenaltiesContainer, getRinkReportsContainer } from './cosmosClient.js';

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
      author: 'AI Report Generator',
      title: `${division} Division Roundup`,
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
    highlights.push(`High-scoring thriller: ${teamNames} combines for ${game.totalGoals} goals`);
  });
  
  // Hat tricks
  const hatTricks = Object.values(gameStats.players).filter(p => p.goals >= 3);
  hatTricks.forEach(player => {
    highlights.push(`${player.name} records hat trick with ${player.goals} goals`);
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
    highlights.push(`Nail-biter: ${game.teams.join(' edges ')} in one-goal thriller`);
  });
  
  // Penalty-heavy games
  const penaltyHeavyGames = gameStats.gameResults.filter(g => g.totalPenalties >= 8);
  penaltyHeavyGames.forEach(game => {
    highlights.push(`Physical matchup: ${game.teams.join(' vs ')} accumulates ${game.totalPenalties} penalties`);
  });
  
  // Fallback highlights if no specific events
  if (highlights.length === 0) {
    highlights.push(`${weekStats.totalGames} exciting games played this week`);
    highlights.push(`Players combined for ${weekStats.totalGoals} goals across all matchups`);
    if (weekStats.topScorers.length > 0) {
      const topScorer = weekStats.topScorers[0];
      highlights.push(`${topScorer.name} leads weekly scoring with ${topScorer.points} points`);
    }
  }
  
  return highlights.slice(0, 6); // Limit to 6 highlights
}

/**
 * Generate standout players for the week
 */
function generateStandoutPlayers(goals, penalties, weekStats) {
  const players = [];
  
  // Top 3 scorers
  weekStats.topScorers.slice(0, 3).forEach(player => {
    let highlight = '';
    if (player.goals >= 3) {
      highlight = `Hat trick hero with ${player.goals} goals`;
    } else if (player.assists >= 3) {
      highlight = `Playmaker extraordinaire with ${player.assists} assists`;
    } else if (player.points >= 4) {
      highlight = `Consistent performer with ${player.points} points`;
    } else {
      highlight = `Solid contributor with ${player.goals}G, ${player.assists}A`;
    }
    
    players.push({
      name: player.name,
      team: player.team,
      stats: `${player.goals} goals, ${player.assists} assists this week`,
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
  
  return `
    <p>The ${division} Division has showcased exceptional hockey with ${gameStats.totalGames} thrilling matchups. Players combined for ${gameStats.totalGoals} goals, demonstrating the high level of skill and competition in our league.</p>
    
    <h3>Season Highlights</h3>
    <p>The action has been highlighted by outstanding individual performances and team efforts. The competition remains fierce as teams battle for playoff positioning with every game taking on added significance.</p>
    
    ${topScorer ? `
    <h3>Scoring Leader</h3>
    <p>${topScorer.name} leads all ${division} division players with ${topScorer.points} points (${topScorer.goals}G, ${topScorer.assists}A), establishing themselves as a key offensive threat. Their consistent performance has been instrumental in their team's success.</p>
    ` : ''}
    
    
    ${topTeam ? `
    <h3>Team Performance</h3>
    <p>${topTeam.name} has showcased strong offensive capabilities, averaging ${(topTeam.goals / topTeam.games).toFixed(1)} goals per game. Their balanced attack and solid team play have positioned them well in the division standings.</p>
    ` : ''}
    
    <h3>Physical Play</h3>
    <p>The intensity has been evident with ${gameStats.totalPenalties} penalties totaling ${gameStats.totalPIM} minutes. While teams compete hard, the focus remains on skillful, competitive hockey.</p>
    
    <h3>Looking Forward</h3>
    <p>As the season progresses, every game becomes more crucial. Teams are fine-tuning their systems and building chemistry for what promises to be an exciting playoff race. The depth of talent in the ${division} division continues to make for unpredictable and entertaining hockey.</p>
    
    <p>Upcoming matchups will provide more opportunities for players to showcase their skills and for teams to build momentum heading into the final stretch of the regular season.</p>
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
