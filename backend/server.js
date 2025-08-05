import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { 
  getGamesContainer, 
  getAttendanceContainer, 
  getRostersContainer, 
  getGoalsContainer, 
  getPenaltiesContainer, 
  getOTShootoutContainer, 
  getRinkReportsContainer,
  getSettingsContainer,
  getAnalyticsContainer,
  getPlayersContainer,
  initializeContainers,
  testDatabaseConnection
} from './cosmosClient.js';

// Import TTS service
import ttsService from './ttsService.js';

// Import rink report generator
import { generateRinkReport, getCurrentWeekId } from './rinkReportGenerator.js';

// Conditionally import announcer service to prevent startup failures
let createGoalAnnouncement = null;
let generateGoalAnnouncement = null;
let generateScorelessCommentary = null;
let generateGoalFeedDescription = null;
let generatePenaltyFeedDescription = null;
let generatePenaltyAnnouncement = null;

try {
  const announcerModule = await import('./announcerService.js');
  generateGoalAnnouncement = announcerModule.generateGoalAnnouncement;
  generateScorelessCommentary = announcerModule.generateScorelessCommentary;
  generateGoalFeedDescription = announcerModule.generateGoalFeedDescription;
  generatePenaltyFeedDescription = announcerModule.generatePenaltyFeedDescription;
  generatePenaltyAnnouncement = announcerModule.generatePenaltyAnnouncement;
  console.log('✅ Announcer service loaded');
} catch (error) {
  console.log('⚠️ Announcer service not available');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Production startup
const startTime = Date.now();
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🚀 Starting Hockey Scorekeeper API (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);

// Initialize database containers
try {
  await initializeContainers();
  await testDatabaseConnection();
  console.log('🗄️ Database ready');
} catch (error) {
  console.error('💥 Database initialization failed:', error.message);
  if (isProduction) {
    process.exit(1);
  }
}

// HEALTH CHECK ENDPOINT for Azure (only at /health, not root)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Hockey Scorekeeper API is running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8080
  });
});

// Utility function for error handling
function handleError(res, error) {
  console.error('API Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred'
  });
}

// Main API endpoints
app.post('/api/attendance', async (req, res) => {
  const { gameId, attendance, totalRoster } = req.body;
  if (!gameId || !attendance || !totalRoster) {
    console.error('❌ Invalid attendance payload:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, attendance, totalRoster }',
      received: req.body
    });
  }
  try {
    const container = getAttendanceContainer();
    
    // Use a consistent ID to ensure we upsert the same record for multiple submissions
    const attendanceRecord = {
      id: `${gameId}-attendance`,
      eventType: 'attendance',
      gameId,
      recordedAt: new Date().toISOString(),
      roster: totalRoster.map(team => ({
        teamName: team.teamName,
        teamId: team.teamId,
        totalPlayers: team.totalPlayers,
        playerCount: team.totalPlayers.length
      })),
      attendance: Object.keys(attendance).map(teamName => ({
        teamName,
        playersPresent: attendance[teamName],
        presentCount: attendance[teamName].length
      })),
      summary: {
        totalTeams: totalRoster.length,
        totalRosterSize: totalRoster.reduce((sum, team) => sum + team.totalPlayers.length, 0),
        totalPresent: Object.values(attendance).reduce((sum, players) => sum + players.length, 0)
      }
    };
    
    // Use upsert to replace any existing attendance record for this game
    const { resource } = await container.items.upsert(attendanceRecord);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});


// Add the `/api/games` endpoint
app.get('/api/games', async (req, res) => {
  const { league } = req.query;
  if (!league) {
    return res.status(400).json({ error: 'Missing required query parameter: league' });
  }

  try {
    const container = getGamesContainer();
    let querySpec;
    
    if (league === 'all') {
      // Return all games to extract leagues
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
    } else {
      // Return games for specific league
      querySpec = {
        query: 'SELECT * FROM c WHERE c.league = @league',
        parameters: [{ name: '@league', value: league }],
      };
    }

    const { resources: games } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Add endpoint for submitted games
app.get('/api/games/submitted', async (req, res) => {
  try {
    const gamesContainer = getGamesContainer();
    
    // Get all submission documents
    const { resources: submissions } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.eventType = 'game-submission'",
        parameters: []
      })
      .fetchAll();
    
    // For each submission, get the corresponding game
    const submittedGames = [];
    for (const submission of submissions) {
      try {
        const { resources: gameQuery } = await gamesContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @gameId",
            parameters: [{ name: "@gameId", value: submission.gameId }]
          })
          .fetchAll();
        
        if (gameQuery.length > 0) {
          const game = gameQuery[0];
          // Add submission info to the game
          submittedGames.push({
            ...game,
            gameStatus: 'submitted',
            submittedAt: submission.submittedAt,
            finalScore: submission.finalScore,
            totalGoals: submission.totalGoals,
            totalPenalties: submission.totalPenalties,
            gameSummary: submission.gameSummary,
            submissionId: submission.id // Add submission ID for admin panel operations
          });
        } else {
          // Game was deleted but submission record still exists - clean it up
          console.log(`🗑️ Cleaning up orphaned submission record for deleted game ${submission.gameId}`);
          try {
            await gamesContainer.item(submission.id, submission.gameId).delete();
          } catch (cleanupError) {
            console.error(`Error cleaning up submission ${submission.id}:`, cleanupError);
          }
        }
      } catch (error) {
        console.error(`Error fetching game ${submission.gameId}:`, error);
      }
    }
    
    res.status(200).json(submittedGames);
  } catch (error) {
    console.error('Error fetching submitted games:', error);
    res.status(500).json({ error: 'Failed to fetch submitted games' });
  }
});

// Add the `/api/rosters` endpoint
app.get('/api/rosters', async (req, res) => {
  const { teamName, season, division } = req.query;

  try {
    const container = getRostersContainer();
    let querySpec;
    
    if (!teamName && !season && !division) {
      // Return all rosters
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (teamName) {
        conditions.push('c.teamName = @teamName');
        parameters.push({ name: '@teamName', value: teamName });
      }
      
      if (season) {
        conditions.push('c.season = @season');
        parameters.push({ name: '@season', value: season });
      }
      
      if (division) {
        conditions.push('c.division = @division');
        parameters.push({ name: '@division', value: division });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters: parameters,
      };
    }

    const { resources: rosters } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(rosters);
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
});

// Add the `/api/game-events` endpoint for goals, assists, penalties, etc.
app.get('/api/game-events', async (req, res) => {
  const { gameId, eventType } = req.query;

  try {
    // const container = getGameEventsContainer(); // Removed gameEvents
    let querySpec;
    
    if (!gameId && !eventType) {
      // Return all game events
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }
      
      if (eventType) {
        conditions.push('c.eventType = @eventType');
        parameters.push({ name: '@eventType', value: eventType });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters: parameters,
      };
    }

    const { resources: events } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching game events:', error);
    res.status(500).json({ error: 'Failed to fetch game events' });
  }
});

// Add the `/api/game-events` POST endpoint for creating game events
app.post('/api/game-events', async (req, res) => {
  const { gameId, eventType, playerId, playerName, teamName, timestamp, details } = req.body;
  
  if (!gameId || !eventType || !teamName) {
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, eventType, teamName, ... }' 
    });
  }

  try {
    // const container = getGameEventsContainer(); // Removed gameEvents
    const gameEvent = {
      id: `${gameId}-${eventType}-${Date.now()}`,
      gameId,
      eventType, // 'goal', 'assist', 'penalty', 'substitution', etc.
      playerId,
      playerName,
      teamName,
      timestamp: timestamp || new Date().toISOString(),
      details: details || {},
      recordedAt: new Date().toISOString()
    };
    
    const { resource } = await container.items.create(gameEvent);
    res.status(201).json(resource);
  } catch (error) {
    handleError(res, error);
  }
});

// Add the `/api/goals` POST endpoint for creating goals
app.post('/api/goals', async (req, res) => {
  console.log('🎯 Recording goal...');
  
  const { gameId, team, player, period, time, assist, shotType, goalType, breakaway, gameContext } = req.body;

  if (!gameId || !team || !player || !period || !time) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, team, player, period, time.',
      received: req.body
    });
  }

  try {
    const container = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    
    // Get game information for division context
    let division = 'Unknown';
    try {
      const gameInfoQuery = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      };
      const { resources: gameInfo } = await gamesContainer.items.query(gameInfoQuery).fetchAll();
      if (gameInfo.length > 0) {
        const game = gameInfo[0];
        division = game.division || game.league || 'Unknown';
      }
    } catch (error) {
      console.warn('Could not fetch game division info:', error.message);
    }
    
    // Get existing goals for this game to calculate analytics
    const existingGoalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId AND c.eventType = @eventType ORDER BY c.recordedAt ASC',
      parameters: [
        { name: '@gameId', value: gameId },
        { name: '@eventType', value: 'goal' }
      ]
    };
    const { resources: existingGoals } = await container.items.query(existingGoalsQuery).fetchAll();
    
    // Get recent penalties to determine previous events
    const recentPenaltiesQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC OFFSET 0 LIMIT 5',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: recentPenalties } = await penaltiesContainer.items.query(recentPenaltiesQuery).fetchAll();
    
    // Calculate current score before this goal
    const scoreByTeam = {};
    existingGoals.forEach(goal => {
      const team = goal.teamName || goal.scoringTeam; // Handle both new and legacy field names
      scoreByTeam[team] = (scoreByTeam[team] || 0) + 1;
    });
    
    const awayTeam = Object.keys(scoreByTeam).find(t => t !== team) || 'Unknown';
    const homeTeam = team;
    const scoreBeforeGoal = {
      [homeTeam]: scoreByTeam[homeTeam] || 0,
      [awayTeam]: scoreByTeam[awayTeam] || 0
    };
    const scoreAfterGoal = {
      ...scoreBeforeGoal,
      [team]: scoreBeforeGoal[team] + 1
    };
    
    // Determine goal context
    const goalSequenceNumber = existingGoals.length + 1;
    const teamScoreBefore = scoreBeforeGoal[team];
    const opponentScoreBefore = scoreBeforeGoal[awayTeam] || scoreBeforeGoal[homeTeam === team ? awayTeam : homeTeam];
    
    let goalContext = 'Regular goal';
    if (goalSequenceNumber === 1) {
      goalContext = 'First goal of game';
    } else if (teamScoreBefore < opponentScoreBefore && scoreAfterGoal[team] === opponentScoreBefore) {
      goalContext = 'Tying goal';
    } else if (teamScoreBefore < opponentScoreBefore && scoreAfterGoal[team] > opponentScoreBefore) {
      goalContext = 'Go-ahead goal';
    } else if (teamScoreBefore === opponentScoreBefore) {
      goalContext = 'Go-ahead goal';
    } else if (teamScoreBefore > opponentScoreBefore) {
      goalContext = 'Insurance goal';
    }
    
    // Determine previous event context
    let previousEvent = 'None';
    if (recentPenalties.length > 0) {
      const lastPenalty = recentPenalties[0];
      const timeSinceLastEvent = Date.now() - new Date(lastPenalty.recordedAt).getTime();
      if (timeSinceLastEvent < 300000) { // Within 5 minutes
        previousEvent = `After ${lastPenalty.penaltyType} penalty`;
      }
    }
    
    // Determine strength situation (simplified - can be enhanced)
    let strengthSituation = 'Even strength';
    if (recentPenalties.length > 0) {
      const activePenalties = recentPenalties.filter(p => {
        const penaltyTime = new Date(p.recordedAt).getTime();
        const penaltyDuration = parseInt(p.penaltyLength) * 60000; // Convert minutes to ms
        return Date.now() - penaltyTime < penaltyDuration;
      });
      
      if (activePenalties.length > 0) {
        const teamPenalties = activePenalties.filter(p => p.penalizedTeam === team).length;
        const opponentPenalties = activePenalties.filter(p => p.penalizedTeam !== team).length;
        
        if (teamPenalties > opponentPenalties) {
          strengthSituation = 'Shorthanded';
        } else if (opponentPenalties > teamPenalties) {
          strengthSituation = 'Power play';
        }
      }
    }
    
    const goal = {
      id: `${gameId}-goal-${Date.now()}`,
      eventType: 'goal',
      gameId,
      period,
      division,                    // Add division for consistency
      teamName: team,              // Changed from scoringTeam to teamName (for announcer)
      playerName: player,          // Changed from scorer to playerName (for announcer) 
      assistedBy: assist ? [assist] : [], // Changed from assists to assistedBy (for announcer)
      timeRemaining: time,         // Changed from time to timeRemaining (for announcer)
      shotType: shotType || 'Wrist Shot',
      goalType: goalType || 'even strength', // Changed default to match announcer expectations
      breakaway: breakaway || false,
      recordedAt: new Date().toISOString(),
      gameStatus: 'in-progress', // Will be updated when game is submitted
      
      // Keep legacy fields for backward compatibility
      scoringTeam: team,
      scorer: player,
      assists: assist ? [assist] : [],
      time,
      
      // Advanced Analytics
      analytics: {
        goalSequenceNumber,
        goalContext,
        scoreBeforeGoal,
        scoreAfterGoal,
        leadDeficitBefore: teamScoreBefore - opponentScoreBefore,
        leadDeficitAfter: scoreAfterGoal[team] - (scoreAfterGoal[awayTeam] || scoreAfterGoal[homeTeam === team ? awayTeam : homeTeam]),
        strengthSituation,
        previousEvent,
        totalGoalsInGame: goalSequenceNumber,
        gameSituation: period > 3 ? 'Overtime' : 'Regular',
        absoluteTimestamp: new Date().toISOString(),
        timeRemainingInPeriod: time, // Could be enhanced to calculate actual remaining time
        
        // Enhanced context from frontend (if provided)
        ...(gameContext || {})
      }
    };
    
    const { resource } = await container.items.create(goal);
    console.log('✅ Goal recorded successfully with analytics');
    res.status(201).json(resource);
  } catch (error) {
    console.error('❌ Error creating goal:', error.message);
    handleError(res, error);
  }
});

// Add the `/api/penalties` POST endpoint for creating penalties
app.post('/api/penalties', async (req, res) => {
  console.log('⚠️ Recording penalty...');
  const { gameId, period, team, player, penaltyType, penaltyLength, time, details } = req.body;

  if (!gameId || !team || !player || !period || !time || !penaltyType || !penaltyLength) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, team, player, period, time, penaltyType, penaltyLength.'
    });
  }

  try {
    const container = getPenaltiesContainer();
    const goalsContainer = getGoalsContainer();
    const gamesContainer = getGamesContainer();
    
    // Get game information for division context
    let division = 'Unknown';
    try {
      const gameInfoQuery = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      };
      const { resources: gameInfo } = await gamesContainer.items.query(gameInfoQuery).fetchAll();
      if (gameInfo.length > 0) {
        const game = gameInfo[0];
        division = game.division || game.league || 'Unknown';
      }
    } catch (error) {
      console.warn('Could not fetch game division info:', error.message);
    }
    
    // Get existing penalties for this game to calculate analytics
    const existingPenaltiesQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: existingPenalties } = await container.items.query(existingPenaltiesQuery).fetchAll();
    
    // Get existing goals to determine current score
    const existingGoalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId AND c.eventType = @eventType ORDER BY c.recordedAt ASC',
      parameters: [
        { name: '@gameId', value: gameId },
        { name: '@eventType', value: 'goal' }
      ]
    };
    const { resources: existingGoals } = await goalsContainer.items.query(existingGoalsQuery).fetchAll();
    
    // Calculate current score at time of penalty
    const scoreByTeam = {};
    existingGoals.forEach(goal => {
      const team = goal.teamName || goal.scoringTeam; // Handle both new and legacy field names
      scoreByTeam[team] = (scoreByTeam[team] || 0) + 1;
    });
    
    // Determine penalty context
    const penaltySequenceNumber = existingPenalties.length + 1;
    const teamPenalties = existingPenalties.filter(p => (p.teamName || p.penalizedTeam) === team);
    const playerPenalties = existingPenalties.filter(p => (p.playerName || p.penalizedPlayer) === player);
    
    let penaltyContext = 'Regular penalty';
    if (penaltySequenceNumber === 1) {
      penaltyContext = 'First penalty of game';
    } else if (penaltyType.includes('Major') || penaltyType.includes('Fighting')) {
      penaltyContext = 'Major penalty';
    } else if (penaltyType.includes('Misconduct')) {
      penaltyContext = 'Misconduct penalty';
    } else if (parseInt(penaltyLength) > 2) {
      penaltyContext = 'Double minor penalty';
    }
    
    // Determine current strength situation
    const activePenalties = existingPenalties.filter(p => {
      const penaltyTime = new Date(p.recordedAt).getTime();
      const penaltyDuration = parseInt(p.length || p.penaltyLength) * 60000; // Handle both field names
      return Date.now() - penaltyTime < penaltyDuration;
    });
    
    let strengthSituationBefore = 'Even strength';
    let strengthSituationAfter = 'Penalty kill';
    
    if (activePenalties.length > 0) {
      const teamActivePenalties = activePenalties.filter(p => (p.teamName || p.penalizedTeam) === team).length;
      const opponentActivePenalties = activePenalties.filter(p => (p.teamName || p.penalizedTeam) !== team).length;
      
      if (teamActivePenalties > opponentActivePenalties) {
        strengthSituationBefore = 'Already shorthanded';
        strengthSituationAfter = '5-on-3 or worse';
      } else if (opponentActivePenalties > teamActivePenalties) {
        strengthSituationBefore = 'Power play';
        strengthSituationAfter = 'Even strength';
      }
    }
    
    // Determine previous event
    let previousEvent = 'None';
    if (existingGoals.length > 0) {
      const lastGoal = existingGoals[existingGoals.length - 1];
      const timeSinceLastGoal = Date.now() - new Date(lastGoal.recordedAt).getTime();
      if (timeSinceLastGoal < 120000) { // Within 2 minutes
        const teamName = lastGoal.teamName || lastGoal.scoringTeam; // Handle both field names
        previousEvent = `After goal by ${teamName}`;
      }
    }
    
    // Calculate team totals
    const teamTotalPIM = teamPenalties.reduce((sum, p) => sum + parseInt(p.length || p.penaltyLength || 0), 0);
    const playerTotalPIM = playerPenalties.reduce((sum, p) => sum + parseInt(p.length || p.penaltyLength || 0), 0);
    
    const penalty = {
      id: `${gameId}-penalty-${Date.now()}`,
      gameId,
      period,
      division,                    // Added division field for consistency
      teamName: team,              // Changed from penalizedTeam to teamName (for announcer)
      playerName: player,          // Changed from penalizedPlayer to playerName (for announcer)
      penaltyType,
      length: penaltyLength,       // Changed from penaltyLength to length (for announcer)
      timeRemaining: time,         // Changed from time to timeRemaining (for announcer)
      details: details || {},
      recordedAt: new Date().toISOString(),
      gameStatus: 'in-progress', // Will be updated when game is submitted
      
      // Keep legacy fields for backward compatibility
      penalizedTeam: team,
      penalizedPlayer: player,
      penaltyLength,
      time,
      
      // Advanced Analytics
      analytics: {
        penaltySequenceNumber,
        penaltyContext,
        currentScore: scoreByTeam,
        leadDeficitAtTime: (scoreByTeam[team] || 0) - (Object.values(scoreByTeam).reduce((sum, score) => sum + score, 0) - (scoreByTeam[team] || 0)),
        strengthSituationBefore,
        strengthSituationAfter,
        previousEvent,
        teamTotalPIM: teamTotalPIM + parseInt(penaltyLength),
        playerTotalPIM: playerTotalPIM + parseInt(penaltyLength),
        playerPenaltyCount: playerPenalties.length + 1,
        teamPenaltyCount: teamPenalties.length + 1,
        gameSituation: period > 3 ? 'Overtime' : 'Regular',
        absoluteTimestamp: new Date().toISOString(),
        
        // Penalty impact analysis
        penaltyImpact: strengthSituationBefore === 'Power play' ? 'Negates power play' : 
                      strengthSituationAfter === '5-on-3 or worse' ? 'Creates 5-on-3' : 
                      'Creates power play opportunity'
      }
    };
    
    const { resource } = await container.items.create(penalty);
    console.log('✅ Penalty recorded successfully with analytics');
    
    res.json({ 
      success: true, 
      penalty: resource
    });
  } catch (error) {
    console.error('❌ Error creating penalty:', error.message);
    handleError(res, error);
  }
});

// GET endpoint for retrieving goals
app.get('/api/goals', async (req, res) => {
  const { gameId, team, playerId } = req.query;

  try {
    const container = getGoalsContainer();
    let querySpec;
    
    if (!gameId && !team && !playerId) {
      // Return all goals
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }
      
      if (team) {
        conditions.push('c.scoringTeam = @team');
        parameters.push({ name: '@team', value: team });
      }
      
      if (playerId) {
        conditions.push('c.scorer = @playerId');
        parameters.push({ name: '@playerId', value: playerId });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.recordedAt DESC`,
        parameters: parameters,
      };
    }

    const { resources: goals } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// DELETE endpoint for removing specific goal
app.delete('/api/goals/:id', async (req, res) => {
  console.log('🗑️ Deleting goal...');
  const { id } = req.params;
  const { gameId } = req.query;

  if (!id || !gameId) {
    return res.status(400).json({
      error: 'Invalid request. Required: goal ID and gameId.'
    });
  }

  try {
    const container = getGoalsContainer();
    await container.item(id, gameId).delete();
    console.log('✅ Goal deleted successfully');
    res.status(200).json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    console.error('❌ Error deleting goal:', error.message);
    handleError(res, error);
  }
});

// Announce last goal endpoint
app.post('/api/goals/announce-last', async (req, res) => {
  console.log('📢 Announcing last goal...');
  const { gameId, voiceGender } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Invalid request. Required: gameId.'
    });
  }

  // Map voice gender to Google TTS Studio voices using database configuration
  let selectedVoice = 'en-US-Studio-Q'; // Default fallback
  
  try {
    const gamesContainer = getGamesContainer();
    const { resources: configs } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = 'voiceConfig'",
        parameters: []
      })
      .fetchAll();
    
    if (configs.length > 0) {
      const voiceConfig = configs[0];
      if (voiceGender === 'male' && voiceConfig.maleVoice) {
        selectedVoice = voiceConfig.maleVoice;
      } else if (voiceGender === 'female' && voiceConfig.femaleVoice) {
        selectedVoice = voiceConfig.femaleVoice;
      }
    } else {
      // Use defaults based on corrected gender mapping
      const defaultMapping = {
        'male': 'en-US-Studio-Q',    // Studio-Q is male
        'female': 'en-US-Studio-O'   // Studio-O is female  
      };
      selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
    }
  } catch (configError) {
    console.warn('⚠️ Could not fetch voice config, using defaults:', configError.message);
    const defaultMapping = {
      'male': 'en-US-Studio-Q',    // Studio-Q is male
      'female': 'en-US-Studio-O'   // Studio-O is female
    };
    selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
  }
  
  console.log(`🎤 Using voice: ${selectedVoice} (requested: ${voiceGender})`);
  
  // Temporarily set the voice in TTS service for this request
  const originalVoice = ttsService.selectedVoice;
  ttsService.selectedVoice = selectedVoice;

  // Check if announcer service is available
  if (!generateGoalAnnouncement) {
    return res.status(503).json({
      error: 'Announcer service not available. This feature requires additional dependencies.',
      fallback: true
    });
  }

  try {
    const goalsContainer = getGoalsContainer();
    const gamesContainer = getGamesContainer();
    
    // Get the most recent goal for this game
    const { resources: goals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();

    // Get game details for context
    let game;
    
    // Use query lookup since direct lookup doesn't work with partition key
    const { resources: gamesByQuery } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
    
    if (gamesByQuery.length > 0) {
      game = gamesByQuery[0];
    }
    
    if (!game) {
      return res.status(404).json({
        error: 'Game not found.'
      });
    }

    // If no goals, generate scoreless commentary
    if (goals.length === 0) {
      try {
        const scorelessCommentary = await generateScorelessCommentary({
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          period: 1 // Default to first period for scoreless games
        });
        
        // Generate TTS audio for scoreless commentary using admin-selected voice
        const audioResult = await ttsService.generateSpeech(scorelessCommentary, gameId, 'announcement');
        const audioFilename = audioResult?.success ? audioResult.filename : null;
        
        return res.status(200).json({
          success: true,
          scoreless: true,
          announcement: {
            text: scorelessCommentary,
            audioPath: audioFilename
          },
          gameData: {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: 0,
            awayScore: 0
          }
        });
      } catch (error) {
        return res.status(500).json({
          error: 'Failed to generate scoreless commentary'
        });
      }
    }

    const lastGoal = goals[0];
    
    // Calculate current score after this goal (handle both new and legacy field names)
    const homeGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.homeTeam).length;
    const awayGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.awayTeam).length;

    // Get all goals by this player in this game for stats (handle both field names)
    const playerName = lastGoal.playerName || lastGoal.scorer;
    const playerGoalsThisGame = goals.filter(g => (g.playerName || g.scorer) === playerName).length;

    // Prepare goal data for announcement
    const goalData = {
      playerName: lastGoal.playerName || lastGoal.scorer,
      teamName: lastGoal.teamName || lastGoal.scoringTeam,
      period: lastGoal.period,
      timeRemaining: lastGoal.timeRemaining || lastGoal.time,
      assistedBy: lastGoal.assistedBy || lastGoal.assists || [],
      goalType: lastGoal.goalType || 'even strength',
      homeScore: homeGoals,
      awayScore: awayGoals,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    };

    const playerStats = {
      goalsThisGame: playerGoalsThisGame - 1, // Subtract 1 since we're announcing this goal
      seasonGoals: playerGoalsThisGame - 1 // For now, use game stats as season stats
    };

    // Generate the announcement
    const announcementText = await generateGoalAnnouncement(goalData, playerStats);
    
    // Generate TTS audio for goal announcement using optimized goal speech
    const audioResult = await ttsService.generateGoalSpeech(announcementText, gameId);
    const audioFilename = audioResult?.success ? audioResult.filename : null;
    
    console.log('✅ Goal announcement generated successfully');
    
    res.status(200).json({
      success: true,
      goal: lastGoal,
      announcement: {
        text: announcementText,
        audioPath: audioFilename
      },
      goalData,
      playerStats
    });
  } catch (error) {
    console.error('❌ Error announcing last goal:', error.message);
    handleError(res, error);
  } finally {
    // Restore original voice
    ttsService.selectedVoice = originalVoice;
  }
});

// Penalty announcement endpoint
app.post('/api/penalties/announce-last', async (req, res) => {
  const { gameId, voiceGender } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Game ID is required'
    });
  }

  // Map voice gender to Google TTS Studio voices using database configuration
  let selectedVoice = 'en-US-Studio-Q'; // Default fallback
  
  try {
    const gamesContainer = getGamesContainer();
    const { resources: configs } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = 'voiceConfig'",
        parameters: []
      })
      .fetchAll();
    
    if (configs.length > 0) {
      const voiceConfig = configs[0];
      if (voiceGender === 'male' && voiceConfig.maleVoice) {
        selectedVoice = voiceConfig.maleVoice;
      } else if (voiceGender === 'female' && voiceConfig.femaleVoice) {
        selectedVoice = voiceConfig.femaleVoice;
      }
    } else {
      // Use defaults based on corrected gender mapping
      const defaultMapping = {
        'male': 'en-US-Studio-Q',    // Studio-Q is male
        'female': 'en-US-Studio-O'   // Studio-O is female  
      };
      selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
    }
  } catch (configError) {
    console.warn('⚠️ Could not fetch voice config, using defaults:', configError.message);
    const defaultMapping = {
      'male': 'en-US-Studio-Q',    // Studio-Q is male
      'female': 'en-US-Studio-O'   // Studio-O is female
    };
    selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
  }
  
  console.log(`🎤 Using voice for penalty: ${selectedVoice} (requested: ${voiceGender})`);
  
  // Temporarily set the voice in TTS service for this request
  const originalVoice = ttsService.selectedVoice;
  ttsService.selectedVoice = selectedVoice;

  // Check if announcer service is available
  if (!generatePenaltyAnnouncement) {
    return res.status(503).json({
      error: 'Penalty announcer service not available. This feature requires additional dependencies.',
      fallback: true
    });
  }

  try {
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    
    // Get the most recent penalty for this game
    const { resources: penalties } = await penaltiesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();

    // Get game details for context
    let game;
    
    // Use query lookup since direct lookup doesn't work with partition key
    const { resources: gamesByQuery } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
    
    if (gamesByQuery.length > 0) {
      game = gamesByQuery[0];
    }
    
    if (!game) {
      return res.status(404).json({
        error: 'Game not found.'
      });
    }

    if (penalties.length === 0) {
      return res.status(404).json({
        error: 'No penalties found for this game.'
      });
    }

    const lastPenalty = penalties[0];
    
    // Calculate current score for context (handle both new and legacy field names)
    const goalsContainer = getGoalsContainer();
    const { resources: goals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();

    const homeGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.homeTeam).length;
    const awayGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.awayTeam).length;

    // Prepare penalty data for announcement (handle both new and legacy field names)
    const penaltyData = {
      playerName: lastPenalty.playerName || lastPenalty.penalizedPlayer,
      teamName: lastPenalty.teamName || lastPenalty.penalizedTeam,
      penaltyType: lastPenalty.penaltyType,
      period: lastPenalty.period,
      timeRemaining: lastPenalty.timeRemaining || lastPenalty.time,
      length: lastPenalty.length || lastPenalty.penaltyLength || 2
    };

    const gameContext = {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      currentScore: {
        home: homeGoals,
        away: awayGoals
      }
    };

    // Generate the announcement
    const announcementText = await generatePenaltyAnnouncement(penaltyData, gameContext);
    
    // Generate TTS audio for penalty announcement (using special penalty voice)
    const audioResult = await ttsService.generatePenaltySpeech(announcementText, gameId);
    const audioFilename = audioResult?.success ? audioResult.filename : null;
    
    console.log('✅ Penalty announcement generated successfully');
    
    res.status(200).json({
      success: true,
      penalty: lastPenalty,
      announcement: {
        text: announcementText,
        audioPath: audioFilename
      },
      penaltyData,
      gameContext
    });
  } catch (error) {
    console.error('❌ Error announcing last penalty:', error.message);
    handleError(res, error);
  } finally {
    // Restore original voice
    ttsService.selectedVoice = originalVoice;
  }
});

// Random Commentary endpoint
app.post('/api/randomCommentary', async (req, res) => {
  console.log('🎲 Generating random commentary...');
  const { gameId, division, voiceGender } = req.body;

  if (!gameId && !division) {
    return res.status(400).json({
      error: 'Either gameId or division is required.'
    });
  }

  // Map voice gender to Google TTS Studio voices using database configuration
  let selectedVoice = 'en-US-Studio-Q'; // Default fallback
  
  try {
    const gamesContainer = getGamesContainer();
    const { resources: configs } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = 'voiceConfig'",
        parameters: []
      })
      .fetchAll();
    
    if (configs.length > 0) {
      const voiceConfig = configs[0];
      if (voiceGender === 'male' && voiceConfig.maleVoice) {
        selectedVoice = voiceConfig.maleVoice;
      } else if (voiceGender === 'female' && voiceConfig.femaleVoice) {
        selectedVoice = voiceConfig.femaleVoice;
      }
    } else {
      // Use defaults based on corrected gender mapping
      const defaultMapping = {
        'male': 'en-US-Studio-Q',    // Studio-Q is male
        'female': 'en-US-Studio-O'   // Studio-O is female  
      };
      selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
    }
  } catch (configError) {
    console.warn('⚠️ Could not fetch voice config, using defaults:', configError.message);
    const defaultMapping = {
      'male': 'en-US-Studio-Q',    // Studio-Q is male
      'female': 'en-US-Studio-O'   // Studio-O is female
    };
    selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
  }
  
  console.log(`🎤 Using voice for random commentary: ${selectedVoice} (requested: ${voiceGender})`);
  
  // Temporarily set the voice in TTS service for this request
  const originalVoice = ttsService.selectedVoice;
  ttsService.selectedVoice = selectedVoice;

  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    
    // Generate different types of commentary
    const commentaryTypes = ['hot_player', 'leader', 'matchup', 'fact'];
    const selectedType = commentaryTypes[Math.floor(Math.random() * commentaryTypes.length)];
    
    let commentaryText = '';
    
    switch (selectedType) {
      case 'hot_player':
        commentaryText = await generateHotPlayerCommentary(goalsContainer, gameId, division);
        break;
      case 'leader':
        commentaryText = await generateLeaderCommentary(goalsContainer, division);
        break;
      case 'matchup':
        commentaryText = await generateMatchupCommentary(gamesContainer, division);
        break;
      case 'fact':
        commentaryText = await generateFactCommentary(goalsContainer, penaltiesContainer, division);
        break;
      default:
        commentaryText = 'Welcome to hockey night!';
    }
    
    // Generate TTS audio for random commentary
    const audioResult = await ttsService.generateSpeech(commentaryText, gameId || 'random', 'announcement');
    const audioFilename = audioResult?.success ? audioResult.filename : null;
    
    console.log('✅ Random commentary generated successfully');
    
    res.status(200).json({
      success: true,
      type: selectedType,
      text: commentaryText,
      audioPath: audioFilename
    });
  } catch (error) {
    console.error('❌ Error generating random commentary:', error.message);
    res.status(500).json({
      error: 'Failed to generate random commentary',
      message: error.message
    });
  } finally {
    // Restore original voice
    ttsService.selectedVoice = originalVoice;
  }
});

// Helper functions for random commentary generation
async function generateHotPlayerCommentary(goalsContainer, gameId, division) {
  try {
    // Get recent goals (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { resources: recentGoals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c._ts > @timestamp",
        parameters: [{ name: '@timestamp', value: Math.floor(sevenDaysAgo.getTime() / 1000) }]
      })
      .fetchAll();
    
    // Count goals by player
    const playerGoals = {};
    recentGoals.forEach(goal => {
      const player = goal.playerName || goal.scorer;
      if (player) {
        playerGoals[player] = (playerGoals[player] || 0) + 1;
      }
    });
    
    // Find hot players (3+ goals)
    const hotPlayers = Object.entries(playerGoals)
      .filter(([player, goals]) => goals >= 3)
      .sort(([,a], [,b]) => b - a);
    
    if (hotPlayers.length > 0) {
      const [player, goals] = hotPlayers[0];
      const templates = [
        `${player} is on fire with ${goals} goals in the last week!`,
        `Look out for ${player} - ${goals} goals in their last few games!`,
        `${player} has been lighting up the scoreboard with ${goals} recent goals!`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
    
    return 'Players are battling hard on the ice tonight!';
  } catch (error) {
    console.error('Error generating hot player commentary:', error);
    return 'The competition is heating up on the ice!';
  }
}

async function generateLeaderCommentary(goalsContainer, division) {
  try {
    // Get all goals for season leaders
    const { resources: allGoals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c"
      })
      .fetchAll();
    
    // Count total goals by player
    const playerTotals = {};
    allGoals.forEach(goal => {
      const player = goal.playerName || goal.scorer;
      if (player) {
        playerTotals[player] = (playerTotals[player] || 0) + 1;
      }
    });
    
    // Find top scorers
    const leaders = Object.entries(playerTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (leaders.length > 0) {
      const [topPlayer, topGoals] = leaders[0];
      const templates = [
        `${topPlayer} leads the league with ${topGoals} goals this season!`,
        `Current scoring leader ${topPlayer} has found the net ${topGoals} times!`,
        `With ${topGoals} goals, ${topPlayer} is setting the pace this year!`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
    
    return 'The race for the scoring title is heating up!';
  } catch (error) {
    console.error('Error generating leader commentary:', error);
    return 'Great hockey being played across the league!';
  }
}

async function generateMatchupCommentary(gamesContainer, division) {
  try {
    // Get recent games for matchup insights
    const { resources: recentGames } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.eventType = 'game-submission' ORDER BY c._ts DESC"
      })
      .fetchAll();
    
    if (recentGames.length >= 2) {
      const recentGame = recentGames[0];
      const templates = [
        `Earlier today, ${recentGame.gameSummary?.goalsByTeam ? Object.keys(recentGame.gameSummary.goalsByTeam)[0] : 'a team'} put up a strong performance!`,
        `The competition has been intense across all matchups this week!`,
        `Teams are battling for playoff position in every game!`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
    
    return 'Every game matters as teams fight for position!';
  } catch (error) {
    console.error('Error generating matchup commentary:', error);
    return 'The intensity is building as the season progresses!';
  }
}

async function generateFactCommentary(goalsContainer, penaltiesContainer, division) {
  try {
    // Get some fun stats
    const { resources: allGoals } = await goalsContainer.items
      .query({
        query: "SELECT COUNT(1) as totalGoals FROM c"
      })
      .fetchAll();
    
    const { resources: allPenalties } = await penaltiesContainer.items
      .query({
        query: "SELECT COUNT(1) as totalPenalties FROM c"
      })
      .fetchAll();
    
    const totalGoals = allGoals[0]?.totalGoals || 0;
    const totalPenalties = allPenalties[0]?.totalPenalties || 0;
    
    const facts = [
      `Over ${totalGoals} goals have been scored this season!`,
      `Players have accumulated ${totalPenalties} penalty minutes so far!`,
      `Hockey is a game of speed, skill, and determination!`,
      `Every shift could be the difference maker in this game!`,
      `The pace of play keeps getting faster every season!`
    ];
    
    return facts[Math.floor(Math.random() * facts.length)];
  } catch (error) {
    console.error('Error generating fact commentary:', error);
    return 'Hockey continues to be the greatest game on earth!';
  }
}

// Game submission endpoint
app.post('/api/games/submit', async (req, res) => {
  console.log('🏁 Submitting game...');
  const { gameId, finalScore, submittedBy } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId.'
    });
  }

  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    
    // Check if this game has already been submitted
    const existingSubmissionQuery = {
      query: "SELECT * FROM c WHERE c.eventType = 'game-submission' AND c.gameId = @gameId",
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: existingSubmissions } = await gamesContainer.items.query(existingSubmissionQuery).fetchAll();
    
    if (existingSubmissions.length > 0) {
      return res.status(400).json({
        error: 'Game has already been submitted. Use the admin panel to reset the game if you need to re-score it.',
        alreadySubmitted: true
      });
    }
    
    // Get the original game record to extract division/league information
    let division = 'Unknown';
    let league = 'Unknown';
    let homeTeam = 'Unknown';
    let awayTeam = 'Unknown';
    
    try {
      const originalGameQuery = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      };
      const { resources: originalGames } = await gamesContainer.items.query(originalGameQuery).fetchAll();
      
      if (originalGames.length > 0) {
        const game = originalGames[0];
        division = game.division || game.league || 'Unknown';
        league = game.league || game.division || 'Unknown';
        homeTeam = game.homeTeam || 'Unknown';
        awayTeam = game.awayTeam || 'Unknown';
      }
    } catch (error) {
      console.warn('Could not fetch original game record:', error.message);
    }
    
    // Update all goals for this game to mark as submitted
    const goalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: goals } = await goalsContainer.items.query(goalsQuery).fetchAll();
    
    for (const goal of goals) {
      const updatedGoal = {
        ...goal,
        gameStatus: 'submitted',
        submittedAt: new Date().toISOString(),
        submittedBy: submittedBy || 'Unknown'
      };
      await goalsContainer.item(goal.id, goal.gameId).replace(updatedGoal);
    }
    
    // Update all penalties for this game to mark as submitted
    const penaltiesQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: penalties } = await penaltiesContainer.items.query(penaltiesQuery).fetchAll();
    
    for (const penalty of penalties) {
      const updatedPenalty = {
        ...penalty,
        gameStatus: 'submitted',
        submittedAt: new Date().toISOString(),
        submittedBy: submittedBy || 'Unknown'
      };
      await penaltiesContainer.item(penalty.id, penalty.gameId).replace(updatedPenalty);
    }
    
    // Create game summary record with consistent ID format
    const gameSubmissionRecord = {
      id: `${gameId}-submission`, // Use consistent ID without timestamp
      gameId,
      eventType: 'game-submission',
      submittedAt: new Date().toISOString(),
      submittedBy: submittedBy || 'Unknown',
      division,
      league,
      homeTeam,
      awayTeam,
      finalScore: finalScore || {},
      totalGoals: goals.length,
      totalPenalties: penalties.length,
      gameSummary: {
        goalsByTeam: goals.reduce((acc, goal) => {
          acc[goal.scoringTeam] = (acc[goal.scoringTeam] || 0) + 1;
          return acc;
        }, {}),
        penaltiesByTeam: penalties.reduce((acc, penalty) => {
          acc[penalty.penalizedTeam] = (acc[penalty.penalizedTeam] || 0) + 1;
          return acc;
        }, {}),
        totalPIM: penalties.reduce((sum, p) => sum + parseInt(p.penaltyLength || 0), 0)
      }
    };
    
    const { resource } = await gamesContainer.items.create(gameSubmissionRecord);
    console.log('✅ Game submitted successfully');
    
    // Trigger automatic rink report generation
    try {
      console.log('📰 Triggering rink report generation...');
      
      // Get the game details to determine division
      let gameDetails = null;
      try {
        const { resources: gameQuery } = await gamesContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId",
            parameters: [{ name: "@gameId", value: gameId }]
          })
          .fetchAll();
        
        if (gameQuery.length > 0) {
          gameDetails = gameQuery[0];
        }
      } catch (gameQueryError) {
        console.warn('⚠️ Could not fetch game details for report generation:', gameQueryError.message);
      }
      
      if (gameDetails && gameDetails.division) {
        const currentWeek = getCurrentWeekId();
        console.log(`📰 Generating report for ${gameDetails.division} division, week ${currentWeek}`);
        
        // Generate report asynchronously (don't wait for completion)
        generateRinkReport(gameDetails.division, currentWeek)
          .then((report) => {
            console.log(`✅ Rink report generated successfully for ${gameDetails.division} division`);
          })
          .catch((reportError) => {
            console.error(`❌ Failed to generate rink report for ${gameDetails.division}:`, reportError.message);
          });
      } else {
        console.log('ℹ️ Game division not found, skipping report generation');
      }
    } catch (reportGenError) {
      console.error('❌ Error in report generation trigger:', reportGenError.message);
      // Don't fail the game submission if report generation fails
    }
    
    res.status(201).json({
      success: true,
      submissionRecord: resource,
      message: 'Game data has been finalized and submitted'
    });
  } catch (error) {
    console.error('❌ Error submitting game:', error.message);
    handleError(res, error);
  }
});

// DELETE endpoint for resetting game data (admin function)
app.delete('/api/games/:gameId/reset', async (req, res) => {
  console.log('🗑️ Resetting game data...');
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({
      error: 'Game ID is required'
    });
  }

  console.log(`🔍 Attempting to reset game: ${gameId}`);

  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    
    console.log('📊 Querying for goals...');
    // Get all goals for this game
    const { resources: goals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
    
    console.log(`📊 Found ${goals.length} goals to delete`);
    
    console.log('🚨 Querying for penalties...');
    // Get all penalties for this game
    const { resources: penalties } = await penaltiesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
      
    console.log(`🚨 Found ${penalties.length} penalties to delete`);
      
    console.log('📝 Querying for ALL game-related records...');
    // Get ALL records related to this game (including primary game document)
    const { resources: allGameRecords } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
    
    console.log(`📝 Found ${allGameRecords.length} total game records to delete`);
    
    // Also specifically get submission records with different query pattern
    const { resources: submissions } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId AND (c.eventType = 'game-submission' OR c.eventType = 'game-completion')",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
    
    console.log(`📝 Found ${submissions.length} specific submission records to delete`);
    
    // Delete all goals
    console.log('🗑️ Deleting goals...');
    let goalsDeleted = 0;
    let goalsAlreadyGone = 0;
    
    for (const goal of goals) {
      try {
        await goalsContainer.item(goal.id, goal.gameId).delete();
        console.log(`✅ Deleted goal: ${goal.id}`);
        goalsDeleted++;
      } catch (deleteError) {
        if (deleteError.code === 404 || deleteError.message.includes('does not exist')) {
          console.log(`ℹ️  Goal ${goal.id} already removed`);
          goalsAlreadyGone++;
        } else {
          console.error(`❌ Failed to delete goal ${goal.id}:`, deleteError.message);
        }
      }
    }
    
    // Delete all penalties  
    console.log('🗑️ Deleting penalties...');
    let penaltiesDeleted = 0;
    let penaltiesAlreadyGone = 0;
    
    for (const penalty of penalties) {
      try {
        await penaltiesContainer.item(penalty.id, penalty.gameId).delete();
        console.log(`✅ Deleted penalty: ${penalty.id}`);
        penaltiesDeleted++;
      } catch (deleteError) {
        if (deleteError.code === 404 || deleteError.message.includes('does not exist')) {
          console.log(`ℹ️  Penalty ${penalty.id} already removed`);
          penaltiesAlreadyGone++;
        } else {
          console.error(`❌ Failed to delete penalty ${penalty.id}:`, deleteError.message);
        }
      }
    }
    
    // Delete submission records to remove from admin panel
    console.log('🗑️ Deleting specific submission records...');
    let submissionsDeleted = 0;
    let submissionsAlreadyGone = 0;
    
    for (const submission of submissions) {
      try {
        await gamesContainer.item(submission.id, submission.gameId).delete();
        console.log(`✅ Deleted submission: ${submission.id}`);
        submissionsDeleted++;
      } catch (deleteError) {
        if (deleteError.code === 404 || deleteError.message.includes('does not exist')) {
          console.log(`ℹ️  Submission ${submission.id} already removed`);
          submissionsAlreadyGone++;
        } else {
          console.error(`❌ Failed to delete submission ${submission.id}:`, deleteError.message);
        }
      }
    }
    
    // Delete ALL game-related records to ensure complete removal (avoid duplicates)
    console.log('🗑️ Deleting remaining game records...');
    let gameRecordsDeleted = 0;
    let gameRecordsAlreadyGone = 0;
    
    // Filter out records we already processed in submissions
    const submissionIds = new Set(submissions.map(s => s.id));
    const remainingRecords = allGameRecords.filter(record => !submissionIds.has(record.id));
    
    for (const record of remainingRecords) {
      try {
        await gamesContainer.item(record.id, record.gameId || gameId).delete();
        console.log(`✅ Deleted game record: ${record.id} (type: ${record.eventType || 'unknown'})`);
        gameRecordsDeleted++;
      } catch (deleteError) {
        if (deleteError.code === 404 || deleteError.message.includes('does not exist')) {
          console.log(`ℹ️  Game record ${record.id} already removed`);
          gameRecordsAlreadyGone++;
        } else {
          console.error(`❌ Failed to delete game record ${record.id}:`, deleteError.message);
        }
      }
    }
    
    // Also try to delete the primary game record - check for multiple possible structures
    console.log('🗑️ Deleting primary game record...');
    
    // First, try to find the actual game record to get the correct partition key
    const gameQuery = {
      query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: gameRecords } = await gamesContainer.items.query(gameQuery).fetchAll();
    const mainGameRecord = gameRecords.find(record => 
      record.id === gameId || 
      (record.gameId === gameId && !record.eventType) || 
      (record.gameId === gameId && record.eventType === 'game-creation')
    );
    
    if (mainGameRecord) {
      try {
        // Use the correct partition key (likely 'league' field) 
        const partitionKey = mainGameRecord.league || mainGameRecord.gameId || gameId;
        await gamesContainer.item(mainGameRecord.id, partitionKey).delete();
        console.log(`✅ Deleted primary game record: ${mainGameRecord.id} with partition key: ${partitionKey}`);
      } catch (deleteError) {
        if (deleteError.code === 404 || deleteError.message.includes('does not exist')) {
          console.log(`ℹ️  Primary game record ${mainGameRecord.id} already removed`);
        } else {
          console.log(`⚠️ Could not delete primary game record ${mainGameRecord.id}: ${deleteError.message}`);
        }
      }
    } else {
      // Fallback: try with gameId as both id and partition key (original logic)
      try {
        await gamesContainer.item(gameId, gameId).delete();
        console.log(`✅ Deleted primary game record: ${gameId} (fallback method)`);
      } catch (deleteError) {
        if (deleteError.code === 404 || deleteError.message.includes('does not exist')) {
          console.log(`ℹ️  Primary game record ${gameId} already removed (fallback)`);
        } else {
          console.log(`⚠️ Could not delete primary game record ${gameId} (fallback): ${deleteError.message}`);
        }
      }
    }
    
    // Calculate total items processed (deleted + already gone)
    const totalProcessed = goalsDeleted + penaltiesDeleted + submissionsDeleted + gameRecordsDeleted + 
                           goalsAlreadyGone + penaltiesAlreadyGone + submissionsAlreadyGone + gameRecordsAlreadyGone;
    
    console.log(`✅ Reset complete: Successfully deleted ${goalsDeleted} goals, ${penaltiesDeleted} penalties, ${submissionsDeleted} submissions, ${gameRecordsDeleted} game records for ${gameId}`);
    if (goalsAlreadyGone + penaltiesAlreadyGone + submissionsAlreadyGone + gameRecordsAlreadyGone > 0) {
      console.log(`ℹ️  ${goalsAlreadyGone + penaltiesAlreadyGone + submissionsAlreadyGone + gameRecordsAlreadyGone} items were already removed`);
    }
    
    // Show meaningful message even when totalDeleted is 0 due to eventual consistency
    const resultMessage = totalProcessed > 0 
      ? `Game completely removed. Processed ${totalProcessed} records total.`
      : `Game deletion processed. All game data has been marked for removal from the system.`;
    
    res.status(200).json({
      success: true,
      message: resultMessage,
      deletedItems: {
        goals: goalsDeleted,
        penalties: penaltiesDeleted,
        submissions: submissionsDeleted,
        gameRecords: gameRecordsDeleted,
        totalDeleted: goalsDeleted + penaltiesDeleted + submissionsDeleted + gameRecordsDeleted,
        totalProcessed: totalProcessed,
        alreadyRemoved: goalsAlreadyGone + penaltiesAlreadyGone + submissionsAlreadyGone + gameRecordsAlreadyGone
      }
    });
  } catch (error) {
    console.error('❌ Error resetting game:', error.message);
    console.error('Error details:', error);
    
    // Provide more specific error information
    let errorMessage = 'Failed to reset game data';
    if (error.code === 'InvalidPartitionKey') {
      errorMessage = 'Invalid game ID format';
    } else if (error.code === 'NotFound') {
      errorMessage = 'Game not found';
    } else if (error.code === 'Forbidden') {
      errorMessage = 'Database access denied - check Cosmos DB permissions';
    } else if (error.code === 'TooManyRequests') {
      errorMessage = 'Database throttling - please try again in a moment';
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
      details: error.message
    });
  }
});

// GET endpoint for retrieving penalties
app.get('/api/penalties', async (req, res) => {
  const { gameId, team, playerId } = req.query;

  try {
    const container = getPenaltiesContainer();
    let querySpec;
    
    if (!gameId && !team && !playerId) {
      // Return all penalties
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: [],
      };
    } else {
      // Build dynamic query based on provided filters
      let conditions = [];
      let parameters = [];
      
      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }
      
      if (team) {
        conditions.push('c.penalizedTeam = @team');
        parameters.push({ name: '@team', value: team });
      }
      
      if (playerId) {
        conditions.push('c.penalizedPlayer = @playerId');
        parameters.push({ name: '@playerId', value: playerId });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.recordedAt DESC`,
        parameters: parameters,
      };
    }

    const { resources: penalties } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(penalties);
  } catch (error) {
    console.error('Error fetching penalties:', error);
    res.status(500).json({ error: 'Failed to fetch penalties' });
  }
});

// DELETE endpoint for removing specific penalty
app.delete('/api/penalties/:id', async (req, res) => {
  console.log('🗑️ Deleting penalty...');
  const { id } = req.params;
  const { gameId } = req.query;

  if (!id || !gameId) {
    return res.status(400).json({
      error: 'Invalid request. Required: penalty ID and gameId.'
    });
  }

  try {
    const container = getPenaltiesContainer();
    await container.item(id, gameId).delete();
    console.log('✅ Penalty deleted successfully');
    res.status(200).json({ success: true, message: 'Penalty deleted' });
  } catch (error) {
    console.error('❌ Error deleting penalty:', error.message);
    handleError(res, error);
  }
});

// OT/Shootout endpoints
app.post('/api/otshootout', async (req, res) => {
  console.log('🏒 Recording OT/Shootout result...');
  const { gameId, winner, gameType, finalScore, submittedBy } = req.body;

  if (!gameId || !winner || !gameType) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, winner, gameType.'
    });
  }

  try {
    const container = getOTShootoutContainer();
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    
    // Get existing goals and penalties for context
    const goalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: goals } = await goalsContainer.items.query(goalsQuery).fetchAll();
    
    const penaltiesQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: penalties } = await penaltiesContainer.items.query(penaltiesQuery).fetchAll();
    
    // Create OT/Shootout record
    const otShootoutRecord = {
      id: `${gameId}-otshootout-${Date.now()}`,
      eventType: 'ot-shootout',
      gameId,
      winner,
      gameType, // 'overtime' or 'shootout'
      finalScore: finalScore || {},
      recordedAt: new Date().toISOString(),
      gameStatus: 'completed', // Game is now completed
      submittedBy: submittedBy || 'Scorekeeper',
      
      // Game summary for analytics
      gameSummary: {
        totalGoals: goals.length,
        totalPenalties: penalties.length,
        goalsByTeam: goals.reduce((acc, goal) => {
          acc[goal.scoringTeam] = (acc[goal.scoringTeam] || 0) + 1;
          return acc;
        }, {}),
        penaltiesByTeam: penalties.reduce((acc, penalty) => {
          acc[penalty.penalizedTeam] = (acc[penalty.penalizedTeam] || 0) + 1;
          return acc;
        }, {}),
        totalPIM: penalties.reduce((sum, p) => sum + parseInt(p.penaltyLength || 0), 0)
      }
    };
    
    const { resource } = await container.items.create(otShootoutRecord);
    
    // Mark all goals and penalties as completed
    for (const goal of goals) {
      const updatedGoal = {
        ...goal,
        gameStatus: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: submittedBy || 'Scorekeeper'
      };
      await goalsContainer.item(goal.id, goal.gameId).replace(updatedGoal);
    }
    
    for (const penalty of penalties) {
      const updatedPenalty = {
        ...penalty,
        gameStatus: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: submittedBy || 'Scorekeeper'
      };
      await penaltiesContainer.item(penalty.id, penalty.gameId).replace(updatedPenalty);
    }
    
    // Create final game completion record
    const gameCompletionRecord = {
      id: `${gameId}-completion-${Date.now()}`,
      gameId,
      eventType: 'game-completion',
      completionType: 'ot-shootout',
      completedAt: new Date().toISOString(),
      completedBy: submittedBy || 'Scorekeeper',
      winner,
      gameType,
      finalScore: finalScore || {},
      totalGoals: goals.length,
      totalPenalties: penalties.length
    };
    
    await gamesContainer.items.create(gameCompletionRecord);
    
    console.log('✅ OT/Shootout result recorded and game completed');
    
    res.status(201).json({
      success: true,
      otShootoutRecord: resource,
      message: `${gameType} winner recorded. Game completed automatically.`
    });
  } catch (error) {
    console.error('❌ Error recording OT/Shootout:', error.message);
    handleError(res, error);
  }
});

app.get('/api/otshootout', async (req, res) => {
  const { gameId } = req.query;

  try {
    const container = getOTShootoutContainer();
    let querySpec;
    
    if (!gameId) {
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: [],
      };
    } else {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC',
        parameters: [{ name: '@gameId', value: gameId }],
      };
    }

    const { resources: otShootoutRecords } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(otShootoutRecords);
  } catch (error) {
    console.error('Error fetching OT/Shootout records:', error);
    res.status(500).json({ error: 'Failed to fetch OT/Shootout records' });
  }
});

// Health check endpoint for debugging production issues
app.get('/api/health', (req, res) => {
  const envVars = {
    COSMOS_DB_URI: !!process.env.COSMOS_DB_URI,
    COSMOS_DB_KEY: !!process.env.COSMOS_DB_KEY,
    COSMOS_DB_NAME: !!process.env.COSMOS_DB_NAME,
    COSMOS_DB_GAMES_CONTAINER: process.env.COSMOS_DB_GAMES_CONTAINER,
    COSMOS_DB_ROSTERS_CONTAINER: process.env.COSMOS_DB_ROSTERS_CONTAINER,
    COSMOS_DB_ATTENDANCE_CONTAINER: process.env.COSMOS_DB_ATTENDANCE_CONTAINER,
    COSMOS_DB_GOALS_CONTAINER: process.env.COSMOS_DB_GOALS_CONTAINER,
    COSMOS_DB_PENALTIES_CONTAINER: process.env.COSMOS_DB_PENALTIES_CONTAINER,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  };
  
  // Check TTS service status
  const ttsStatus = {
    available: ttsService.client !== null,
    credentialsSource: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'Azure Environment JSON' : 
                      process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'File Path' : 'None',
    studioVoicesExpected: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    googleCloudProject: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 
      (() => {
        try {
          const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          return creds.project_id;
        } catch {
          return 'Invalid JSON';
        }
      })() : 'Not configured'
  };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: envVars,
    tts: ttsStatus,
    announcer: {
      available: !!generateGoalAnnouncement,
      features: ['Goal announcements', 'Penalty announcements', 'Commentary']
    },
    endpoints: {
      goals: '/api/goals',
      penalties: '/api/penalties',
      games: '/api/games', 
      playerStats: '/api/player-stats',
      health: '/api/health',
      tts: '/api/tts/generate'
    }
  });
});

// Player Stats API endpoint for AI announcer
app.get('/api/player-stats', async (req, res) => {
  const { playerName, teamName, playerId, refresh } = req.query;
  
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const database = await getDatabase();
    const playerStatsContainer = database.container('playerStats');
    
    // If refresh is requested, recalculate stats
    if (refresh === 'true') {
      console.log('Refreshing player stats...');
      const { default: calculateStats } = await import('./calculateStats.js');
      await calculateStats();
    }
    
    let querySpec;
    
    if (playerId) {
      // Get specific player by ID
      querySpec = {
        query: "SELECT * FROM c WHERE c.playerId = @playerId",
        parameters: [{ name: "@playerId", value: playerId }]
      };
    } else if (playerName && teamName) {
      // Get specific player by name and team
      querySpec = {
        query: "SELECT * FROM c WHERE c.playerName = @playerName AND c.teamName = @teamName",
        parameters: [
          { name: "@playerName", value: playerName },
          { name: "@teamName", value: teamName }
        ]
      };
    } else if (teamName) {
      // Get all players for a team
      querySpec = {
        query: "SELECT * FROM c WHERE c.teamName = @teamName",
        parameters: [{ name: "@teamName", value: teamName }]
      };
    } else {
      // Get all player stats
      querySpec = {
        query: "SELECT * FROM c"
      };
    }
    
    const { resources: playerStats } = await playerStatsContainer.items.query(querySpec).fetchAll();
    
    // Add AI announcer ready insights
    const enrichedStats = playerStats.map(player => ({
      ...player,
      announcer: {
        quickFacts: [
          `${player.playerName} has ${player.attendance?.attendancePercentage || 0}% attendance this season`,
          `Attended ${player.attendance?.gamesAttended || 0} of ${player.attendance?.totalTeamGames || 0} games`,
          player.insights?.reliability ? `Reliability: ${player.insights.reliability}` : null
        ].filter(Boolean),
        soundBites: player.insights?.announcements || [],
        metrics: {
          attendance: player.attendance?.attendancePercentage || 0,
          gamesPlayed: player.attendance?.gamesAttended || 0,
          reliability: player.insights?.reliability || 'Unknown'
        }
      }
    }));
    
    res.status(200).json(enrichedStats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch player stats',
      message: error.message 
    });
  }
});

// Game feed description endpoints
app.post('/api/generate-goal-feed', async (req, res) => {
  const { goalData, gameContext } = req.body;

  if (!generateGoalFeedDescription) {
    return res.status(503).json({
      error: 'Feed description service not available.',
      fallback: true
    });
  }

  try {
    const description = await generateGoalFeedDescription(goalData, gameContext);
    res.status(200).json({
      success: true,
      description
    });
  } catch (error) {
    console.error('Error generating goal feed description:', error);
    res.status(500).json({ error: 'Failed to generate feed description' });
  }
});

app.post('/api/generate-penalty-feed', async (req, res) => {
  const { penaltyData, gameContext } = req.body;

  if (!generatePenaltyFeedDescription) {
    return res.status(503).json({
      error: 'Feed description service not available.',
      fallback: true
    });
  }

  try {
    const description = await generatePenaltyFeedDescription(penaltyData, gameContext);
    res.status(200).json({
      success: true,
      description
    });
  } catch (error) {
    console.error('Error generating penalty feed description:', error);
    res.status(500).json({ error: 'Failed to generate feed description' });
  }
});

// Add other unique routes from app.js as needed
// ...

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// EDIT GAME ENDPOINTS
// =============================================================================

// Get individual game details
app.get('/api/games/:gameId', async (req, res) => {
  console.log(`🎮 Getting game details for ID: ${req.params.gameId}`);
  
  try {
    const { gameId } = req.params;
    const container = getGamesContainer();
    
    // Try to find the game using query
    const query = {
      query: 'SELECT * FROM c WHERE c.id = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: games } = await container.items.query(query).fetchAll();
    
    if (games.length === 0) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      });
    }
    
    const game = games[0];
    console.log(`✅ Found game: ${game.awayTeam} vs ${game.homeTeam}`);
    
    res.status(200).json(game);
  } catch (error) {
    console.error('❌ Error fetching game details:', error);
    handleError(res, error);
  }
});

// Update game details
app.put('/api/games/:gameId', async (req, res) => {
  console.log(`🎮 Updating game details for ID: ${req.params.gameId}`);
  
  try {
    const { gameId } = req.params;
    const updateData = req.body;
    const container = getGamesContainer();
    
    // Get the existing game
    const query = {
      query: 'SELECT * FROM c WHERE c.id = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: games } = await container.items.query(query).fetchAll();
    
    if (games.length === 0) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      });
    }
    
    const existingGame = games[0];
    
    // Update the game with new data
    const updatedGame = {
      ...existingGame,
      ...updateData,
      lastModified: new Date().toISOString()
    };
    
    await container.item(gameId, gameId).replace(updatedGame);
    
    console.log(`✅ Updated game: ${updatedGame.awayTeam} vs ${updatedGame.homeTeam}`);
    
    res.status(200).json({
      success: true,
      message: 'Game updated successfully',
      game: updatedGame
    });
  } catch (error) {
    console.error('❌ Error updating game:', error);
    handleError(res, error);
  }
});

// Get goals for a specific game
app.get('/api/goals/game/:gameId', async (req, res) => {
  console.log(`⚽ Getting goals for game ID: ${req.params.gameId}`);
  
  try {
    const { gameId } = req.params;
    const container = getGoalsContainer();
    
    const query = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.timeScored ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: goals } = await container.items.query(query).fetchAll();
    
    console.log(`✅ Found ${goals.length} goals for game ${gameId}`);
    
    res.status(200).json(goals);
  } catch (error) {
    console.error('❌ Error fetching goals for game:', error);
    handleError(res, error);
  }
});

// Get penalties for a specific game  
app.get('/api/penalties/game/:gameId', async (req, res) => {
  console.log(`⚠️ Getting penalties for game ID: ${req.params.gameId}`);
  
  try {
    const { gameId } = req.params;
    const container = getPenaltiesContainer();
    
    const query = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.timeRecorded ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: penalties } = await container.items.query(query).fetchAll();
    
    console.log(`✅ Found ${penalties.length} penalties for game ${gameId}`);
    
    res.status(200).json(penalties);
  } catch (error) {
    console.error('❌ Error fetching penalties for game:', error);
    handleError(res, error);
  }
});

// Rink Reports API endpoint
app.get('/api/rink-reports', async (req, res) => {
  console.log('📰 Fetching rink reports...');
  const { division, week } = req.query;
  
  try {
    const container = getRinkReportsContainer();
    let querySpec;
    
    if (division && week) {
      // Get specific report by division and week
      querySpec = {
        query: 'SELECT * FROM c WHERE c.division = @division AND c.week = @week',
        parameters: [
          { name: '@division', value: division },
          { name: '@week', value: week }
        ]
      };
    } else if (division) {
      // Get all reports for a division
      querySpec = {
        query: 'SELECT * FROM c WHERE c.division = @division ORDER BY c.week DESC',
        parameters: [{ name: '@division', value: division }]
      };
    } else {
      // Get all reports, ordered by week (most recent first)
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.week DESC, c.division ASC'
      };
    }
    
    const { resources: reports } = await container.items.query(querySpec).fetchAll();
    
    console.log(`✅ Found ${reports.length} rink reports`);
    res.status(200).json(reports);
  } catch (error) {
    console.error('❌ Error fetching rink reports:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rink reports',
      message: error.message 
    });
  }
});

// Manual rink report generation endpoint
app.post('/api/rink-reports/generate', async (req, res) => {
  console.log('📰 Manual rink report generation triggered...');
  const { division, week } = req.body;
  
  try {
    if (!division) {
      return res.status(400).json({
        error: 'Division is required',
        example: { division: 'Gold', week: '2025-W32' }
      });
    }
    
    const targetWeek = week || getCurrentWeekId();
    console.log(`📰 Generating report for ${division} division, week ${targetWeek}`);
    
    const report = await generateRinkReport(division, targetWeek);
    
    res.status(201).json({
      success: true,
      message: `Rink report generated for ${division} division, week ${targetWeek}`,
      report: {
        id: report.id,
        division: report.division,
        week: report.week,
        title: report.title,
        publishedAt: report.publishedAt,
        generatedBy: report.generatedBy
      }
    });
  } catch (error) {
    console.error('❌ Error generating rink report:', error);
    res.status(500).json({
      error: 'Failed to generate rink report',
      message: error.message
    });
  }
});

// Serve audio files generated by announcer
app.use('/api/audio', express.static(path.join(__dirname, 'audio-cache')));

// Voice management endpoints for admin panel
app.get('/api/admin/voices', (req, res) => {
  try {
    const availableVoices = ttsService.getAvailableVoices();
    const currentVoice = ttsService.selectedVoice;
    
    res.json({
      currentVoice,
      availableVoices,
      total: availableVoices.length
    });
  } catch (error) {
    console.error('❌ Error fetching available voices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available voices',
      message: error.message 
    });
  }
});

app.post('/api/admin/voices/select', (req, res) => {
  try {
    const { voiceId } = req.body;
    
    if (!voiceId) {
      return res.status(400).json({ 
        error: 'Voice ID is required',
        example: { voiceId: 'en-US-Studio-O' }
      });
    }
    
    const success = ttsService.setAnnouncerVoice(voiceId);
    
    if (success) {
      console.log(`🎤 Voice changed to: ${voiceId}`);
      res.json({ 
        success: true,
        message: `Announcer voice changed to ${voiceId}`,
        currentVoice: ttsService.selectedVoice
      });
    } else {
      res.status(400).json({ 
        error: 'Invalid voice ID',
        currentVoice: ttsService.selectedVoice,
        availableVoices: ttsService.getAvailableVoices().map(v => v.id)
      });
    }
  } catch (error) {
    console.error('❌ Error setting voice:', error);
    res.status(500).json({ 
      error: 'Failed to set voice',
      message: error.message 
    });
  }
});

app.post('/api/admin/voices/test', async (req, res) => {
  try {
    const { voiceId, text, scenario } = req.body;
    
    if (!voiceId) {
      return res.status(400).json({ 
        error: 'Voice ID is required for testing' 
      });
    }
    
    // Check if TTS client is available
    if (!ttsService.client) {
      return res.status(503).json({
        error: 'Google Cloud TTS not available',
        message: 'Studio voices require Google Cloud credentials to be configured'
      });
    }
    
    console.log(`🎤 Testing voice: ${voiceId} with optimal ${scenario || 'test'} settings`);
    
    // Use the new optimal testing method
    const result = await ttsService.testVoiceWithOptimalSettings(voiceId, scenario || 'test');
    
    if (result && result.success) {
      console.log(`🎯 Voice test successful with optimized settings:`);
      console.log(`   - Voice: ${result.voice}`);
      console.log(`   - Scenario: ${result.scenario}`);
      console.log(`   - Settings: Rate=${result.settings.speakingRate}, Pitch=${result.settings.pitch}, Volume=${result.settings.volumeGainDb}`);
      
      res.json({
        success: true,
        message: 'Test audio generated with optimal announcer settings',
        audioUrl: `/api/audio/${result.filename}`,
        voiceId,
        scenario: result.scenario,
        settings: result.settings,
        size: result.size
      });
    } else {
      const errorMsg = result?.error || 'TTS synthesis failed - check server logs for details';
      console.error(`❌ Test voice failed: ${errorMsg}`);
      res.status(500).json({
        error: 'Failed to generate test audio',
        message: errorMsg,
        voiceId
      });
    }
  } catch (error) {
    console.error('❌ Voice test error:', error);
    res.status(500).json({
      error: 'Voice test failed',
      message: error.message,
      voiceId: req.body.voiceId
    });
  }
});

// Voice configuration endpoints for male/female voice mapping
app.get('/api/admin/voice-config', async (req, res) => {
  try {
    const gamesContainer = getGamesContainer();
    
    // Try to get existing voice configuration
    try {
      const { resources: configs } = await gamesContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.id = 'voiceConfig'",
          parameters: []
        })
        .fetchAll();
      
      if (configs.length > 0) {
        res.json({
          success: true,
          config: configs[0]
        });
      } else {
        // Return default configuration
        res.json({
          success: true,
          config: {
            id: 'voiceConfig',
            maleVoice: 'en-US-Studio-Q', // Studio-Q is male 
            femaleVoice: 'en-US-Studio-O' // Studio-O is female
          }
        });
      }
    } catch (error) {
      console.error('Error fetching voice config:', error);
      // Return default configuration on error
      res.json({
        success: true,
        config: {
          id: 'voiceConfig',
          maleVoice: 'en-US-Studio-Q',
          femaleVoice: 'en-US-Studio-O'
        }
      });
    }
  } catch (error) {
    console.error('❌ Error getting voice config:', error);
    res.status(500).json({
      error: 'Failed to get voice configuration',
      message: error.message
    });
  }
});

app.post('/api/admin/voice-config', async (req, res) => {
  try {
    const { maleVoice, femaleVoice } = req.body;
    
    if (!maleVoice || !femaleVoice) {
      return res.status(400).json({
        error: 'Both maleVoice and femaleVoice are required'
      });
    }
    
    const gamesContainer = getGamesContainer();
    
    const voiceConfig = {
      id: 'voiceConfig',
      maleVoice,
      femaleVoice,
      updatedAt: new Date().toISOString()
    };
    
    // Use upsert to create or update the configuration
    const { resource } = await gamesContainer.items.upsert(voiceConfig);
    
    console.log(`✅ Voice configuration updated: Male=${maleVoice}, Female=${femaleVoice}`);
    
    res.json({
      success: true,
      message: 'Voice configuration saved successfully',
      config: resource
    });
  } catch (error) {
    console.error('❌ Error saving voice config:', error);
    res.status(500).json({
      error: 'Failed to save voice configuration',
      message: error.message
    });
  }
});

app.get('/api/admin/available-voices', (req, res) => {
  try {
    // Provide a list of Google TTS Studio voices for the dropdowns
    const studioVoices = [
      { id: 'en-US-Studio-Q', name: 'Studio Q (Male - Professional)', gender: 'male', type: 'Studio' },
      { id: 'en-US-Studio-O', name: 'Studio O (Female - Professional)', gender: 'female', type: 'Studio' },
      { id: 'en-US-Studio-M', name: 'Studio M (Male - Dynamic)', gender: 'male', type: 'Studio' },
      { id: 'en-US-Studio-F', name: 'Studio F (Female - Dynamic)', gender: 'female', type: 'Studio' }
    ];
    
    res.json({
      success: true,
      voices: studioVoices
    });
  } catch (error) {
    console.error('❌ Error getting available voices:', error);
    res.status(500).json({
      error: 'Failed to get available voices',
      message: error.message
    });
  }
});

// Serve static frontend files (after all API routes)
const frontendDist = path.resolve(__dirname, 'frontend');
app.use(express.static(frontendDist));

// Catch-all route to serve index.html for SPA (MUST be last!)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const server = app.listen(process.env.PORT || 8080, () => {
  console.log(`🚀 Hockey Scorekeeper API running on port ${process.env.PORT || 8080}`);
  console.log('🏥 Health check available at /health');
  console.log('🎯 API endpoints available at /api/*');
  console.log('✅ Deployment completed successfully - Studio voice authentication enabled');
  
  // Custom banner for The Scorekeeper
  console.log('\n');
  console.log('████████ ██   ██ ███████     ███████  ██████  ██████  ██████  ███████ ██   ██ ███████ ███████ ██████  ███████ ██████  ');
  console.log('   ██    ██   ██ ██          ██      ██      ██    ██ ██   ██ ██      ██  ██  ██      ██      ██   ██ ██      ██   ██ ');
  console.log('   ██    ███████ █████       ███████ ██      ██    ██ ██████  █████   █████   █████   █████   ██████  █████   ██████  ');
  console.log('   ██    ██   ██ ██               ██ ██      ██    ██ ██   ██ ██      ██  ██  ██      ██      ██      ██      ██   ██ ');
  console.log('   ██    ██   ██ ███████     ███████  ██████  ██████  ██   ██ ███████ ██   ██ ███████ ███████ ██      ███████ ██   ██ ');
  console.log('\n🏒 Hockey Announcer & Scorekeeper System Ready! 🏒');
  console.log('🎙️  AI Commentary & Studio Voice TTS Active');
  console.log('⚡ Let\'s drop the puck and track some goals! ⚡\n');
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Add graceful shutdown logic after server is created
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received at', new Date().toISOString());
  console.log('🔍 Server has been running for approximately', Math.floor((Date.now() - startTime) / 1000), 'seconds');
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received at', new Date().toISOString());
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
