import { getGamesContainer, getGoalsContainer, getPenaltiesContainer, getRinkReportsContainer } from './cosmosClient.js';

/**
 * Generate a comprehensive rink report for a specific division and week
 */
export async function generateRinkReport(division, weekId) {
  console.log(`📰 Generating rink report for ${division} division, week ${weekId}`);
  
  try {
    const weekData = await aggregateWeekData(division, weekId);
    const reportContent = await generateReportContent(division, weekId, weekData);
    
    // Store the report in Cosmos DB
    const report = {
      id: `${division}-${weekId}`,
      division,
      week: weekId,
      weekLabel: getWeekLabel(weekId),
      publishedAt: new Date().toISOString(),
      author: 'AI Report Generator',
      title: `${division} Division Weekly Roundup`,
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
    
    console.log(`✅ Rink report generated and stored for ${division} week ${weekId}`);
    return report;
  } catch (error) {
    console.error(`❌ Error generating rink report for ${division} week ${weekId}:`, error);
    throw error;
  }
}

/**
 * Aggregate all game data for a specific division and week
 */
async function aggregateWeekData(division, weekId) {
  const gamesContainer = getGamesContainer();
  const goalsContainer = getGoalsContainer();
  const penaltiesContainer = getPenaltiesContainer();
  
  // Get week date range
  const { startDate, endDate } = getWeekDateRange(weekId);
  
  // Get all submitted games for this division and week
  const gamesQuery = {
    query: `
      SELECT * FROM c 
      WHERE c.division = @division 
      AND c.eventType = 'game-submission'
      AND c.submittedAt >= @startDate 
      AND c.submittedAt <= @endDate
      ORDER BY c.submittedAt DESC
    `,
    parameters: [
      { name: '@division', value: division },
      { name: '@startDate', value: startDate },
      { name: '@endDate', value: endDate }
    ]
  };
  
  const { resources: games } = await gamesContainer.items.query(gamesQuery).fetchAll();
  
  // Get all goals for these games
  const gameIds = games.map(g => g.gameId);
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
  }
  
  return {
    division,
    weekId,
    games,
    goals: allGoals,
    penalties: allPenalties,
    weekStats: calculateWeekStats(games, allGoals, allPenalties)
  };
}

/**
 * Generate HTML content and structured data for the report
 */
async function generateReportContent(division, weekId, weekData) {
  const { games, goals, penalties, weekStats } = weekData;
  
  // Generate highlights
  const highlights = generateHighlights(games, goals, penalties, weekStats);
  
  // Generate standout players
  const standoutPlayers = generateStandoutPlayers(goals, penalties, weekStats);
  
  // Generate league updates
  const leagueUpdates = generateLeagueUpdates(division, weekStats);
  
  // Generate upcoming predictions (placeholder for now)
  const upcomingPredictions = generateUpcomingPredictions(division, weekStats);
  
  // Generate main article HTML
  const html = generateArticleHTML(division, weekId, weekStats, highlights, standoutPlayers);
  
  return {
    html,
    highlights,
    standoutPlayers,
    leagueUpdates,
    upcomingPredictions
  };
}

/**
 * Calculate comprehensive statistics for the week
 */
function calculateWeekStats(games, goals, penalties) {
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
 * Generate game highlights based on the week's data
 */
function generateHighlights(games, goals, penalties, weekStats) {
  const highlights = [];
  
  // High-scoring games
  const highScoringGames = weekStats.gameResults.filter(g => g.totalGoals >= 8);
  highScoringGames.forEach(game => {
    const teamNames = game.teams.join(' vs ');
    highlights.push(`High-scoring thriller: ${teamNames} combines for ${game.totalGoals} goals`);
  });
  
  // Hat tricks
  const hatTricks = Object.values(weekStats.players).filter(p => p.goals >= 3);
  hatTricks.forEach(player => {
    highlights.push(`${player.name} records hat trick with ${player.goals} goals`);
  });
  
  // Close games (1-goal difference)
  const closeGames = weekStats.gameResults.filter(game => {
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
  const penaltyHeavyGames = weekStats.gameResults.filter(g => g.totalPenalties >= 8);
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
function generateArticleHTML(division, weekId, weekStats, highlights, standoutPlayers) {
  const weekLabel = getWeekLabel(weekId);
  const topScorer = weekStats.topScorers[0];
  const topTeam = Object.values(weekStats.teams)
    .filter(t => t.games > 0)
    .sort((a, b) => (b.goals / b.games) - (a.goals / a.games))[0];
  
  return `
    <p>The ${division} Division showcased exceptional hockey during ${weekLabel} with ${weekStats.totalGames} thrilling matchups. Players combined for ${weekStats.totalGoals} goals, demonstrating the high level of skill and competition in our league.</p>
    
    <h3>Week Highlights</h3>
    <p>This week's action was highlighted by outstanding individual performances and team efforts. The competition remains fierce as teams battle for playoff positioning with every game taking on added significance.</p>
    
    ${topScorer ? `
    <h3>Scoring Leader</h3>
    <p>${topScorer.name} led all ${division} division players with ${topScorer.points} points (${topScorer.goals}G, ${topScorer.assists}A), establishing themselves as a key offensive threat. Their consistent performance has been instrumental in their team's success this week.</p>
    ` : ''}
    
    ${topTeam ? `
    <h3>Team Performance</h3>
    <p>${topTeam.name} showcased strong offensive capabilities, averaging ${(topTeam.goals / topTeam.games).toFixed(1)} goals per game. Their balanced attack and solid team play have positioned them well in the division standings.</p>
    ` : ''}
    
    <h3>Physical Play</h3>
    <p>The intensity was evident with ${weekStats.totalPenalties} penalties totaling ${weekStats.totalPIM} minutes. While teams competed hard, the focus remained on skillful, competitive hockey.</p>
    
    <h3>Looking Forward</h3>
    <p>As the season progresses, every game becomes more crucial. Teams are fine-tuning their systems and building chemistry for what promises to be an exciting playoff race. The depth of talent in the ${division} division continues to make for unpredictable and entertaining hockey.</p>
    
    <p>Next week's matchups will provide more opportunities for players to showcase their skills and for teams to build momentum heading into the final stretch of the regular season.</p>
  `;
}

/**
 * Get week date range for a given week ID
 */
function getWeekDateRange(weekId) {
  const now = new Date();
  let startDate, endDate;
  
  if (weekId === 'current') {
    // Current week - Monday to Sunday
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    startDate = monday.toISOString();
    endDate = sunday.toISOString();
  } else if (weekId.startsWith('week-')) {
    // Previous weeks
    const weeksBack = parseInt(weekId.split('-')[1]);
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - (weeksBack * 7));
    
    const dayOfWeek = targetDate.getDay();
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    startDate = monday.toISOString();
    endDate = sunday.toISOString();
  } else {
    // ISO week format (e.g., "2025-W32")
    const [year, week] = weekId.split('-W');
    const weekNum = parseInt(week);
    
    // Calculate the start of the year
    const yearStart = new Date(parseInt(year), 0, 1);
    const firstMonday = new Date(yearStart);
    const daysToMonday = (8 - yearStart.getDay()) % 7;
    firstMonday.setDate(yearStart.getDate() + daysToMonday);
    
    // Calculate the target week
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
    
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);
    targetSunday.setHours(23, 59, 59, 999);
    
    startDate = targetMonday.toISOString();
    endDate = targetSunday.toISOString();
  }
  
  return { startDate, endDate };
}

/**
 * Get a human-readable week label
 */
function getWeekLabel(weekId) {
  if (weekId === 'current') return 'This Week';
  if (weekId === 'week-1') return 'Last Week';
  if (weekId === 'week-2') return '2 Weeks Ago';
  if (weekId === 'week-3') return '3 Weeks Ago';
  if (weekId.includes('-W')) return `Week ${weekId.split('-W')[1]}, ${weekId.split('-W')[0]}`;
  return weekId;
}

/**
 * Get the current ISO week string (e.g., "2025-W32")
 */
export function getCurrentWeekId() {
  const now = new Date();
  const year = now.getFullYear();
  
  // Calculate ISO week number
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
  const weekNumber = Math.ceil(dayOfYear / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Trigger report generation for all divisions for the current week
 */
export async function generateWeeklyReportsForAllDivisions() {
  const divisions = ['Gold', 'Silver', 'Bronze'];
  const currentWeek = getCurrentWeekId();
  
  console.log(`📰 Generating weekly reports for all divisions - week ${currentWeek}`);
  
  const results = [];
  for (const division of divisions) {
    try {
      const report = await generateRinkReport(division, currentWeek);
      results.push({ division, success: true, report });
    } catch (error) {
      console.error(`Failed to generate report for ${division}:`, error);
      results.push({ division, success: false, error: error.message });
    }
  }
  
  return results;
}
