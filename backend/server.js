import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { getGamesContainer, getAttendanceContainer, getRostersContainer, getGoalsContainer, getPenaltiesContainer, getOTShootoutContainer } from './cosmosClient.js';

// Import TTS service
import ttsService from './ttsService.js';

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
  console.log('✅ Announcer service loaded successfully');
} catch (error) {
  console.log('⚠️ Announcer service not available:', error.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Track server start time for diagnostics
const startTime = Date.now();

// Enhanced startup logging
console.log('🚀 Starting Hockey Scorekeeper API...');
console.log('📁 Working directory:', process.cwd());
console.log('🔧 Environment variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  COSMOS_DB_GOALS_CONTAINER:', process.env.COSMOS_DB_GOALS_CONTAINER || 'NOT SET');
console.log('  COSMOS_DB_PENALTIES_CONTAINER:', process.env.COSMOS_DB_PENALTIES_CONTAINER || 'NOT SET');
console.log('  COSMOS_DB_GAMES_CONTAINER:', process.env.COSMOS_DB_GAMES_CONTAINER || 'NOT SET');
console.log('  COSMOS_DB_ROSTERS_CONTAINER:', process.env.COSMOS_DB_ROSTERS_CONTAINER || 'NOT SET');
console.log('  COSMOS_DB_ATTENDANCE_CONTAINER:', process.env.COSMOS_DB_ATTENDANCE_CONTAINER || 'NOT SET');
console.log('  COSMOS_DB_OTSHOOTOUT_CONTAINER:', process.env.COSMOS_DB_OTSHOOTOUT_CONTAINER || 'NOT SET');
console.log('  COSMOS_DB_URI:', process.env.COSMOS_DB_URI ? 'SET' : 'NOT SET');
console.log('  COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY ? 'SET' : 'NOT SET');

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
  console.log('Received attendance POST:', JSON.stringify(req.body, null, 2));
  if (!gameId || !attendance || !totalRoster) {
    console.error('❌ Invalid attendance payload:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({ 
      error: 'Invalid payload. Expected: { gameId, attendance, totalRoster }',
      received: req.body
    });
  }
  try {
    const container = getAttendanceContainer();
    const attendanceRecord = {
      id: `${gameId}-attendance-${Date.now()}`,
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
    const { resource } = await container.items.create(attendanceRecord);
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
            gameSummary: submission.gameSummary
          });
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
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Invalid request. Required: gameId.'
    });
  }

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
        
        // Generate TTS audio for scoreless commentary
        const audioPath = await ttsService.generateSpeech(scorelessCommentary, gameId, 'scoreless');
        
        return res.status(200).json({
          success: true,
          scoreless: true,
          announcement: {
            text: scorelessCommentary,
            audioPath: audioPath
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
    
    // Generate TTS audio for goal announcement
    const audioPath = await ttsService.generateSpeech(announcementText, gameId, 'goal');
    
    console.log('✅ Goal announcement generated successfully');
    
    res.status(200).json({
      success: true,
      goal: lastGoal,
      announcement: {
        text: announcementText,
        audioPath: audioPath
      },
      goalData,
      playerStats
    });
  } catch (error) {
    console.error('❌ Error announcing last goal:', error.message);
    handleError(res, error);
  }
});

// Penalty announcement endpoint
app.post('/api/penalties/announce-last', async (req, res) => {
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Game ID is required'
    });
  }

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
    const audioPath = await ttsService.generatePenaltySpeech(announcementText, gameId);
    
    console.log('✅ Penalty announcement generated successfully');
    
    res.status(200).json({
      success: true,
      penalty: lastPenalty,
      announcement: {
        text: announcementText,
        audioPath: audioPath
      },
      penaltyData,
      gameContext
    });
  } catch (error) {
    console.error('❌ Error announcing last penalty:', error.message);
    handleError(res, error);
  }
});

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
    
    // Create game summary record
    const gameSubmissionRecord = {
      id: `${gameId}-submission-${Date.now()}`,
      gameId,
      eventType: 'game-submission',
      submittedAt: new Date().toISOString(),
      submittedBy: submittedBy || 'Unknown',
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
      
    console.log('📝 Querying for game submissions...');
    // Get game submission records
    const { resources: submissions } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId AND (c.eventType = 'game-submission' OR c.eventType = 'game-completion')",
        parameters: [{ name: "@gameId", value: gameId }]
      })
      .fetchAll();
    
    console.log(`📝 Found ${submissions.length} submissions to delete`);
    
    // Delete all goals
    console.log('🗑️ Deleting goals...');
    for (const goal of goals) {
      try {
        await goalsContainer.item(goal.id, goal.gameId).delete();
        console.log(`✅ Deleted goal: ${goal.id}`);
      } catch (deleteError) {
        console.error(`❌ Failed to delete goal ${goal.id}:`, deleteError.message);
      }
    }
    
    // Delete all penalties  
    console.log('🗑️ Deleting penalties...');
    for (const penalty of penalties) {
      try {
        await penaltiesContainer.item(penalty.id, penalty.gameId).delete();
        console.log(`✅ Deleted penalty: ${penalty.id}`);
      } catch (deleteError) {
        console.error(`❌ Failed to delete penalty ${penalty.id}:`, deleteError.message);
      }
    }
    
    // Delete submission records to remove from admin panel
    console.log('🗑️ Deleting submissions...');
    for (const submission of submissions) {
      try {
        await gamesContainer.item(submission.id, submission.gameId).delete();
        console.log(`✅ Deleted submission: ${submission.id}`);
      } catch (deleteError) {
        console.error(`❌ Failed to delete submission ${submission.id}:`, deleteError.message);
      }
    }
    
    console.log(`✅ Reset complete: Deleted ${goals.length} goals, ${penalties.length} penalties, and ${submissions.length} submission records for game ${gameId}`);
    
    res.status(200).json({
      success: true,
      message: `Game data reset successfully. Game removed from completed games list.`,
      deletedItems: {
        goals: goals.length,
        penalties: penalties.length,
        submissions: submissions.length
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

// DELETE endpoint for clearing scoring data (for testing)
app.delete('/api/clear-scoring-data', async (req, res) => {
  console.log('🗑️ Clearing scoring data for testing (keeping rosters and game schedule)...');
  
  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const otShootoutContainer = getOTShootoutContainer();
    const gamesContainer = getGamesContainer();
    
    // Get all scoring-related items (not rosters or original game schedule)
    const [goals, penalties, otShootout, gameSubmissions] = await Promise.all([
      goalsContainer.items.query('SELECT * FROM c').fetchAll(),
      penaltiesContainer.items.query('SELECT * FROM c').fetchAll(),
      otShootoutContainer.items.query('SELECT * FROM c').fetchAll(),
      // Only get submission/completion records, not original games
      gamesContainer.items.query('SELECT * FROM c WHERE c.eventType = "game-submission" OR c.eventType = "game-completion"').fetchAll()
    ]);
    
    // Delete all scoring items
    const deletePromises = [];
    
    goals.resources.forEach(goal => {
      deletePromises.push(goalsContainer.item(goal.id, goal.gameId).delete());
    });
    
    penalties.resources.forEach(penalty => {
      deletePromises.push(penaltiesContainer.item(penalty.id, penalty.gameId).delete());
    });
    
    otShootout.resources.forEach(item => {
      deletePromises.push(otShootoutContainer.item(item.id, item.gameId).delete());
    });
    
    gameSubmissions.resources.forEach(submission => {
      deletePromises.push(gamesContainer.item(submission.id, submission.gameId).delete());
    });
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared ${goals.resources.length} goals, ${penalties.resources.length} penalties, ${otShootout.resources.length} OT/Shootout records, and ${gameSubmissions.resources.length} game submissions`);
    console.log('📅 Game schedule and rosters preserved');
    
    res.status(200).json({
      success: true,
      message: 'Scoring data cleared successfully (game schedule and rosters preserved)',
      deletedCounts: {
        goals: goals.resources.length,
        penalties: penalties.resources.length,
        otShootout: otShootout.resources.length,
        gameSubmissions: gameSubmissions.resources.length
      }
    });
  } catch (error) {
    console.error('❌ Error clearing scoring data:', error.message);
    handleError(res, error);
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

// Serve audio files generated by announcer
app.use('/api/audio', express.static(path.join(__dirname, 'audio-cache')));

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
  console.log('✅ Deployment completed successfully');
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
