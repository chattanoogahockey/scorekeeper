import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import logger from './logger.js';

// Load environment variables from .env file
dotenv.config();

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
  getShotsOnGoalContainer,
  initializeContainers
} from './cosmosClient.js';

// Read package.json for version info
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Import TTS service
import ttsService from './ttsService.js';

// Import rink report generator
import { generateRinkReport } from './rinkReportGenerator.js';

// Conditionally import announcer service to prevent startup failures
let createGoalAnnouncement = null;
let generateGoalAnnouncement = null;
let generateScorelessCommentary = null;
let generateGoalFeedDescription = null;
let generatePenaltyFeedDescription = null;
let generatePenaltyAnnouncement = null;
let generateDualGoalAnnouncement = null;
let generateDualPenaltyAnnouncement = null;
let generateDualRandomCommentary = null;

try {
  const announcerModule = await import('./announcerService.js');
  generateGoalAnnouncement = announcerModule.generateGoalAnnouncement;
  generateScorelessCommentary = announcerModule.generateScorelessCommentary;
  generateGoalFeedDescription = announcerModule.generateGoalFeedDescription;
  generatePenaltyFeedDescription = announcerModule.generatePenaltyFeedDescription;
  generatePenaltyAnnouncement = announcerModule.generatePenaltyAnnouncement;
  generateDualGoalAnnouncement = announcerModule.generateDualGoalAnnouncement;
  generateDualPenaltyAnnouncement = announcerModule.generateDualPenaltyAnnouncement;
  generateDualRandomCommentary = announcerModule.generateDualRandomCommentary;
  
  logger.logAnnouncerAvailability(true, [
    'single-mode-announcements',
    'dual-mode-conversations', 
    'goal-announcements',
    'penalty-announcements',
    'scoreless-commentary'
  ]);
} catch (error) {
  logger.logAnnouncerAvailability(false);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Simple in-memory announcer cache and helpers
// Structure:
// announcerCache.goals: Map<gameId, { lastGoalId, single: { male?: {text,audioPath,voice}, female?: {text,audioPath,voice} }, dual?: { conversation, updatedAt } }>
// announcerCache.penalties: Map<gameId, { lastPenaltyId, single: { male?: {...}, female?: {...} }, dual?: { conversation, updatedAt } }>
// announcerCache.randomDual: Map<key, { conversation, updatedAt }>
const announcerCache = {
  goals: new Map(),
  penalties: new Map(),
  randomDual: new Map()
};

function trimConversationLines(conversation, maxLines = 4) {
  if (!Array.isArray(conversation)) return conversation;
  if (conversation.length <= maxLines) return conversation;
  return conversation.slice(0, maxLines);
}

async function warmupAnnouncer() {
  try {
    // Light-touch warmup: validate TTS client availability and perform a tiny synthesis with both voices
    const { getAnnouncerVoices } = await import('./voiceConfig.js');
    const voices = await getAnnouncerVoices();
    const originalVoice = ttsService.selectedVoice;
    for (const v of [voices.maleVoice, voices.femaleVoice]) {
      try {
        ttsService.selectedVoice = v;
        await ttsService.generateSpeech('Warmup check', 'warmup', 'announcement');
      } catch (_) { /* ignore warmup errors */ }
    }
    ttsService.selectedVoice = originalVoice;
  } catch (_) {
    // Ignore warmup failures; service can operate lazily
  }
  try {
    // Light OpenAI warmup via a tiny dual conversation (ignored if missing API key)
    if (generateDualRandomCommentary) {
      await generateDualRandomCommentary('warmup', { division: 'Warmup' });
    }
  } catch (_) { /* ignore */ }
}

// Schedule warmup shortly after startup
setTimeout(() => {
  warmupAnnouncer();
}, 2000);

// ----- Pre-generation helpers -----
async function preGenerateGoalAssets(gameId) {
  try {
    const goalsContainer = getGoalsContainer();
    const gamesContainer = getGamesContainer();

    const [{ resources: goals }, { resources: gamesByQuery }] = await Promise.all([
      goalsContainer.items.query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC",
        parameters: [{ name: "@gameId", value: gameId }]
      }).fetchAll(),
      gamesContainer.items.query({
        query: "SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      }).fetchAll()
    ]);

    if (!gamesByQuery || gamesByQuery.length === 0 || !goals || goals.length === 0) return;
    const game = gamesByQuery[0];
    const lastGoal = goals[0];

    const homeGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.homeTeam).length;
    const awayGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.awayTeam).length;

    const playerName = lastGoal.playerName || lastGoal.scorer;
    const playerGoalsThisGame = goals.filter(g => (g.playerName || g.scorer) === playerName).length;

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
      goalsThisGame: playerGoalsThisGame - 1,
      seasonGoals: playerGoalsThisGame - 1
    };

    const entry = announcerCache.goals.get(gameId) || { single: {} };
    entry.lastGoalId = lastGoal.id || lastGoal._rid || String(Date.now());

    // Prepare single announcer male/female
    const { getAnnouncerVoices } = await import('./voiceConfig.js');
    const voices = await getAnnouncerVoices();

    for (const [gender, voiceId] of [['male', voices.maleVoice], ['female', voices.femaleVoice]]) {
      try {
        const text = await generateGoalAnnouncement(goalData, playerStats, gender);
        let audioPath = null;
        if (ttsService && ttsService.isAvailable()) {
          const orig = ttsService.selectedVoice;
          try {
            ttsService.selectedVoice = voiceId;
            const audioResult = await ttsService.generateGoalSpeech(text, gameId);
            audioPath = audioResult?.success ? audioResult.filename : null;
          } finally {
            ttsService.selectedVoice = orig;
          }
        }
        entry.single[gender] = { text, audioPath, voice: voiceId, updatedAt: Date.now() };
      } catch (e) {
        // ignore
      }
    }

    // Prepare dual conversation (trim to 4 lines)
    try {
      const convo = await generateDualGoalAnnouncement(goalData, playerStats);
      entry.dual = { conversation: trimConversationLines(convo, 4), updatedAt: Date.now() };
    } catch (_) { /* ignore */ }

    announcerCache.goals.set(gameId, entry);
  } catch (err) {
    // ignore pregen errors
  }
}

async function preGeneratePenaltyAssets(gameId) {
  try {
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    const goalsContainer = getGoalsContainer();

    const [{ resources: penalties }, { resources: gamesByQuery }, { resources: goals }] = await Promise.all([
      penaltiesContainer.items.query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC",
        parameters: [{ name: "@gameId", value: gameId }]
      }).fetchAll(),
      gamesContainer.items.query({
        query: "SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      }).fetchAll(),
      goalsContainer.items.query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: "@gameId", value: gameId }]
      }).fetchAll()
    ]);

    if (!gamesByQuery || gamesByQuery.length === 0 || !penalties || penalties.length === 0) return;
    const game = gamesByQuery[0];
    const lastPenalty = penalties[0];

    const homeGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.homeTeam).length;
    const awayGoals = goals.filter(g => (g.teamName || g.scoringTeam) === game.awayTeam).length;

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
      currentScore: { home: homeGoals, away: awayGoals }
    };

    const entry = announcerCache.penalties.get(gameId) || { single: {} };
    entry.lastPenaltyId = lastPenalty.id || lastPenalty._rid || String(Date.now());

    const { getAnnouncerVoices } = await import('./voiceConfig.js');
    const voices = await getAnnouncerVoices();
    for (const [gender, voiceId] of [['male', voices.maleVoice], ['female', voices.femaleVoice]]) {
      try {
        const text = await generatePenaltyAnnouncement(penaltyData, gameContext, gender);
        let audioPath = null;
        if (ttsService && ttsService.isAvailable()) {
          const orig = ttsService.selectedVoice;
          try {
            ttsService.selectedVoice = voiceId;
            const audioResult = await ttsService.generatePenaltySpeech(text, gameId);
            audioPath = audioResult?.success ? audioResult.filename : null;
          } finally {
            ttsService.selectedVoice = orig;
          }
        }
        entry.single[gender] = { text, audioPath, voice: voiceId, updatedAt: Date.now() };
      } catch (_) { /* ignore */ }
    }

    try {
      const convo = await generateDualPenaltyAnnouncement(penaltyData, gameContext);
      entry.dual = { conversation: trimConversationLines(convo, 4), updatedAt: Date.now() };
    } catch (_) { /* ignore */ }

    announcerCache.penalties.set(gameId, entry);
  } catch (_) { /* ignore */ }
}

async function preGenerateRandomDual(key, gameContext) {
  try {
    if (!generateDualRandomCommentary) return;
    const convo = await generateDualRandomCommentary(gameContext?.gameId || key, gameContext || {});
    announcerCache.randomDual.set(key, { conversation: trimConversationLines(convo, 4), updatedAt: Date.now() });
  } catch (_) { /* ignore */ }
}

// Production middleware for request tracking and logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Generate request ID for tracking
  req.requestId = req.headers['x-request-id'] || logger.generateRequestId();
  
  // Add request ID to response headers
  res.set('X-Request-ID', req.requestId);
  
  // Log API requests (exclude health checks to reduce noise)
  if (req.path.startsWith('/api/') && !req.path.includes('/health')) {
    logger.info('API Request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }
  
  // Override res.json to track response time and log completion
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    if (req.path.startsWith('/api/') && !req.path.includes('/health')) {
      logger.logApiMetrics(req.path, req.method, res.statusCode, duration, {
        requestId: req.requestId
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
});

// Global cache-busting middleware for all responses
app.use((req, res, next) => {
  // Force no cache for all API responses and static files
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Last-Modified', new Date().toUTCString());
  next();
});

// Production startup
const startTime = Date.now();

logger.info('Starting Hockey Scorekeeper API', {
  version: pkg.version,
  environment: config.isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
  startTime: new Date().toISOString(),
  nodeEnv: config.env,
  port: config.port,
  nodeVersion: process.version
});

// Add startup safety check using centralized config
const cosmosConfigured = Boolean(config.cosmos.uri && config.cosmos.key && config.cosmos.database);

if (config.isProduction && !cosmosConfigured) {
  logger.error('Missing Cosmos DB configuration', {
    hasUri: !!config.cosmos.uri,
    hasKey: !!config.cosmos.key,
    hasDatabase: !!config.cosmos.database,
    impact: 'DB-dependent features may be unavailable'
  });
} else {
  logger.success('Cosmos DB configuration detected');
}

// Initialize database containers synchronously on startup
try {
  logger.info('Initializing database containers...');
  await initializeContainers();
  logger.success('Database containers initialized successfully');
} catch (error) {
  logger.error('Database initialization failed', {
    error: error.message,
    stack: config.isProduction ? undefined : error.stack
  });
  logger.warn('Continuing in degraded mode - some features may not work');
}

// HEALTH CHECK ENDPOINT for Azure - always available
app.get('/health', (req, res) => {
  // Check service availability
  const services = {
    database: {
      available: config.cosmos.uri && config.cosmos.key && config.cosmos.databaseName,
      status: config.cosmos.uri && config.cosmos.key && config.cosmos.databaseName ? 'connected' : 'unavailable'
    },
    announcer: {
      available: !!generateGoalAnnouncement,
      features: {
        singleMode: !!generateGoalAnnouncement,
        dualMode: !!generateDualGoalAnnouncement,
        penalties: !!generatePenaltyAnnouncement,
        commentary: !!generateScorelessCommentary
      }
    },
    tts: {
      available: !!ttsService,
      provider: 'google-cloud'
    }
  };

  const allServicesHealthy = services.database.available && services.announcer.available && services.tts.available;
  const status = allServicesHealthy ? 'healthy' : 'degraded';

  res.json({ 
    status,
    message: `Hockey Scorekeeper API is running in ${status} mode`,
    timestamp: new Date().toISOString(),
    port: config.port,
    uptime: Math.floor(process.uptime()),
    version: pkg.version,
    environment: config.env,
    services
  });
});

// Root should serve the SPA; remove redirects that hijack the frontend

// VERSION ENDPOINT for deployment verification
app.get('/api/version', (req, res) => {
  // Set aggressive cache-busting headers for version endpoint
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  
  try {
    // Read package.json for version
    const packagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    let gitInfo = {};
    
    // First try environment variables (production deployment)
    if (process.env.BUILD_SOURCEVERSION || process.env.GITHUB_SHA) {
      gitInfo = {
        commit: process.env.BUILD_SOURCEVERSION || process.env.GITHUB_SHA || 'unknown',
        branch: process.env.BUILD_SOURCEBRANCH?.replace('refs/heads/', '') || process.env.GITHUB_REF_NAME || 'main'
      };
    } else {
      // Only try git commands if environment variables are not available (local development)
      try {
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: currentDir }).trim();
        const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: currentDir }).trim();
        gitInfo = {
          commit: gitCommit,
          branch: gitBranch
        };
      } catch (gitError) {
        // Silent fallback for production environments without git
        gitInfo = {
          commit: 'unknown',
          branch: 'main'
        };
      }
    }

    // Prefer explicit deployment timestamp if provided (set by workflow or admin endpoint)
    let deploymentTime;
    let buildTimeSource = 'fallback';
    
    if (process.env.DEPLOYMENT_TIMESTAMP) {
      try {
        deploymentTime = new Date(process.env.DEPLOYMENT_TIMESTAMP);
        buildTimeSource = 'environment';
        console.log('Using deployment timestamp from environment:', process.env.DEPLOYMENT_TIMESTAMP);
      } catch (parseError) {
        console.warn('Invalid deployment timestamp format:', process.env.DEPLOYMENT_TIMESTAMP);
        deploymentTime = new Date();
        buildTimeSource = 'fallback-error';
      }
    } else {
      // Fallback to current time (local dev or first boot before workflow update)
      deploymentTime = new Date();
      buildTimeSource = 'current-time';
      console.log('Using current time for local build');
    }
    
    // Format the time in Eastern timezone with explicit formatting
    const buildTime = deploymentTime.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    console.log(`Final backend buildTime: ${buildTime} (source: ${buildTimeSource})`);

    
    const responseData = {
      version: packageJson.version,
      name: packageJson.name,
      ...gitInfo,
      buildTime: buildTime,
      timestamp: deploymentTime.toISOString(),
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      deploymentEnv: process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'
    };
    

    res.json(responseData);
  } catch (error) {
    console.error('Error getting version info:', error);
    res.status(500).json({ 
      error: 'Unable to retrieve version information',
      message: error.message 
    });
  }
});

// ADMIN ENDPOINT to update deployment timestamp after deployment completes
app.post('/api/admin/update-deployment-time', (req, res) => {
  try {
    const { deploymentTimestamp, githubSha } = req.body;
    
    console.log('🔄 Deployment timestamp update request:', { deploymentTimestamp, githubSha });
    
    if (!deploymentTimestamp) {
      return res.status(400).json({ error: 'Missing deploymentTimestamp' });
    }
    
    // Verify this is a valid GitHub deployment by checking SHA (lenient check)
    if (githubSha && process.env.BUILD_SOURCEVERSION) {
      if (githubSha !== process.env.BUILD_SOURCEVERSION) {
        console.log('ℹ️ GitHub SHA differs (common during concurrent deployments):', { 
          provided: githubSha.substring(0, 8), 
          expected: process.env.BUILD_SOURCEVERSION.substring(0, 8) 
        });
      } else {
        console.log('✅ GitHub SHA matches deployment');
      }
    }
    
    // Update the environment variable for this process instance
    process.env.DEPLOYMENT_TIMESTAMP = deploymentTimestamp;
    console.log('✅ Updated deployment timestamp to:', deploymentTimestamp);
    
    res.json({ 
      success: true, 
      message: 'Deployment timestamp updated',
      timestamp: deploymentTimestamp,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error updating deployment timestamp:', error);
    res.status(500).json({ 
      error: 'Failed to update deployment timestamp',
      message: error.message 
    });
  }
});

// Production-ready error handler with structured responses
function handleError(res, error, context = 'API', requestId = null) {
  const logData = {
    error: error.message,
    context,
    requestId,
    stack: config.isProduction ? undefined : error.stack
  };
  
  logger.error(`${context} Error`, logData);
  
  // Structured error response
  const errorResponse = {
    error: true,
    message: 'An error occurred',
    timestamp: new Date().toISOString(),
    canRetry: true,
    requestId
  };
  
  // Specific error handling
  if (error.message?.includes('not configured') || error.message?.includes('Cosmos')) {
    errorResponse.message = 'Database temporarily unavailable. Please try again later.';
    errorResponse.code = 'DB_UNAVAILABLE';
    errorResponse.userMessage = 'The scorekeeper database is temporarily unavailable. Your data is safe - please try again in a moment.';
    return res.status(503).json(errorResponse);
  }
  
  if (error.message?.includes('Announcer service not available')) {
    errorResponse.message = 'Voice announcements temporarily unavailable';
    errorResponse.code = 'ANNOUNCER_UNAVAILABLE';
    errorResponse.userMessage = 'Voice announcements are temporarily unavailable. Text updates and scoring still work normally.';
    errorResponse.fallback = 'Text mode available';
    return res.status(503).json(errorResponse);
  }
  
  if (error.code === 11000) {
    errorResponse.message = 'Duplicate entry';
    errorResponse.canRetry = false;
    return res.status(409).json(errorResponse);
  }
  
  // Generic server error
  errorResponse.message = error.message || 'Internal server error';
  res.status(500).json(errorResponse);
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


// Add the `/api/games` endpoint - DIVISION ONLY
app.get('/api/games', async (req, res) => {
  const { t, v, rid } = req.query;
  // Provide default division to prevent undefined issues
  const division = (req.query.division || 'all').toLowerCase();
  const requestId = rid || Math.random().toString(36).substr(2, 9);
  

  
  // Add aggressive cache-busting headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'X-Request-ID': requestId
  });

  try {
    const container = getGamesContainer();

    
    let querySpec;
    
    if (division.toLowerCase() === 'all') {
      // Return all games
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: [],
      };
      // Query for all games
    } else {
      // Return games for specific division only
      querySpec = {
        query: 'SELECT * FROM c WHERE LOWER(c.division) = LOWER(@division)',
        parameters: [
          { name: '@division', value: division }
        ],
      };
      // Query for specific division
    }

    const { resources: games } = await container.items.query(querySpec).fetchAll();

    
    if (games.length > 0) {

    }
    
    // Enhanced response with metadata for production
    const responseData = {
      success: true,
      games: games,
      meta: {
        count: games.length,
        division: division,
        requestId: requestId,
        timestamp: new Date().toISOString(),
        queryVersion: v || '1',
        serverVersion: pkg.version
      }
    };
    
    // Return games array directly for backward compatibility, but log structured response

    res.status(200).json(games);
  } catch (error) {
    handleError(res, error, 'Games API');
  }
});

// Add endpoint for submitted games - Filtered to Gold division only
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
    
    // For each submission, get the corresponding game data
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
          
          // Add submission info to the game (no division filtering)
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
            // Ignore 404 errors - the record was already deleted
            if (cleanupError.code !== 404) {
              console.error(`Error cleaning up submission ${submission.id}:`, cleanupError);
            }
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

// Add the `/api/rosters` endpoint with gameId support
app.get('/api/rosters', async (req, res) => {
  const { gameId, teamName, season, division } = req.query;

  try {
    const rostersContainer = getRostersContainer();
    const gamesContainer = getGamesContainer();

    // If gameId is provided, look up the game and fetch the rosters for its teams
    if (gameId) {
      console.log('Fetching rosters for gameId:', gameId);
      
      const gameQuery = {
        query: 'SELECT * FROM c WHERE c.id = @id OR c.gameId = @id',
        parameters: [{ name: '@id', value: gameId }]
      };
      
      const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();
      if (games.length === 0) {
        console.log('Game not found for gameId:', gameId);
        return res.status(404).json({ error: 'Game not found' });
      }
      
      const game = games[0];
      const homeTeam = game.homeTeam || game.homeTeamId;
      const awayTeam = game.awayTeam || game.awayTeamId;
      
      console.log('Looking for rosters for teams:', homeTeam, 'vs', awayTeam);
      
      // Use case-insensitive query for team names
      const rosterQuery = {
        query: 'SELECT * FROM c WHERE LOWER(c.teamName) IN (LOWER(@home), LOWER(@away))',
        parameters: [
          { name: '@home', value: homeTeam },
          { name: '@away', value: awayTeam }
        ]
      };
      
      const { resources: rosterResults } = await rostersContainer.items.query(rosterQuery).fetchAll();
      console.log('Found rosters:', rosterResults.length, 'teams');
      
      // Return 404 with helpful message if rosters are missing
      if (rosterResults.length === 0) {
        console.log(`⚠️ No rosters found for teams: ${homeTeam} vs ${awayTeam}`);
        return res.status(404).json({ 
          error: 'No rosters found for game teams',
          gameId: gameId,
          teams: { home: homeTeam, away: awayTeam },
          message: 'Check that roster data exists for both teams'
        });
      }
      
      if (rosterResults.length < 2) {
        const foundTeams = rosterResults.map(r => r.teamName);
        const missingTeams = [homeTeam, awayTeam].filter(t => 
          !foundTeams.some(f => f.toLowerCase() === t.toLowerCase())
        );
        console.log(`⚠️ Missing rosters for teams: ${missingTeams.join(', ')}`);
        return res.status(404).json({ 
          error: 'Incomplete roster data',
          gameId: gameId,
          foundTeams: foundTeams,
          missingTeams: missingTeams,
          message: `Missing roster data for: ${missingTeams.join(', ')}`
        });
      }
      
      return res.status(200).json(rosterResults);
    }

    // Original filtering by teamName, season, division
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
        conditions.push('LOWER(c.division) = LOWER(@division)');
        parameters.push({ name: '@division', value: division });
      }
      
      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters: parameters,
      };
    }

    const { resources: rosters } = await rostersContainer.items.query(querySpec).fetchAll();
    res.status(200).json(rosters);
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
});

// Create a new roster
app.post('/api/rosters', async (req, res) => {
  try {
    const { teamName, season, division, players } = req.body;
    
    if (!teamName || !season || !division || !players) {
      return res.status(400).json({ error: 'Missing required fields: teamName, season, division, players' });
    }
    
    const container = getRostersContainer();
    const rosterDoc = {
      id: teamName.replace(/\s+/g, '_').toLowerCase(),
      teamName,
      season,
      division,
      players: players.map(player => ({
        name: player.name,
        firstName: player.firstName || player.name.split(' ')[0],
        lastName: player.lastName || player.name.split(' ').slice(1).join(' '),
        jerseyNumber: player.jerseyNumber,
        position: player.position || 'Player'
      })),
      totalPlayers: players.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const { resource } = await container.items.create(rosterDoc);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating roster:', error);
    res.status(500).json({ error: 'Failed to create roster' });
  }
});

// Update a roster by ID
app.put('/api/rosters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const container = getRostersContainer();
    const { resource: existingRoster } = await container.item(id, id).read();
    
    if (!existingRoster) {
      return res.status(404).json({ error: 'Roster not found' });
    }
    
    const updatedRoster = {
      ...existingRoster,
      ...updates,
      id: existingRoster.id, // Preserve ID
      updatedAt: new Date().toISOString()
    };
    
    const { resource } = await container.item(id, id).replace(updatedRoster);
    res.status(200).json(resource);
  } catch (error) {
    console.error('Error updating roster:', error);
    res.status(500).json({ error: 'Failed to update roster' });
  }
});

// Delete a roster by ID
app.delete('/api/rosters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const container = getRostersContainer();
    
    await container.item(id, id).delete();
    res.status(200).json({ message: 'Roster deleted successfully' });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({ error: 'Failed to delete roster' });
  }
});

// Add the `/api/game-events` endpoint for goals and penalties (aggregated view)
app.get('/api/game-events', async (req, res) => {
  const { gameId, eventType } = req.query;

  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();

    // If eventType filters to a specific type, only query that container for efficiency
    const wantsGoals = !eventType || eventType === 'goal' || eventType === 'goals';
    const wantsPenalties = !eventType || eventType === 'penalty' || eventType === 'penalties';

    const goalsQuery = wantsGoals
      ? {
          query: gameId
            ? 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC'
            : 'SELECT * FROM c ORDER BY c.recordedAt DESC',
          parameters: gameId ? [{ name: '@gameId', value: gameId }] : [],
        }
      : null;

    const penaltiesQuery = wantsPenalties
      ? {
          query: gameId
            ? 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC'
            : 'SELECT * FROM c ORDER BY c.recordedAt DESC',
          parameters: gameId ? [{ name: '@gameId', value: gameId }] : [],
        }
      : null;

    // Run allowed queries in parallel
    const [goalsResult, penaltiesResult] = await Promise.all([
      goalsQuery ? goalsContainer.items.query(goalsQuery).fetchAll() : Promise.resolve({ resources: [] }),
      penaltiesQuery ? penaltiesContainer.items.query(penaltiesQuery).fetchAll() : Promise.resolve({ resources: [] }),
    ]);

    // Normalize payloads and include eventType for consumers
    const normalizeRecordedAt = (item) =>
      item.recordedAt || (item._ts ? new Date(item._ts * 1000).toISOString() : new Date(0).toISOString());

    const goals = (goalsResult.resources || []).map((g) => ({
      eventType: 'goal',
      ...g,
      recordedAt: normalizeRecordedAt(g),
    }));
    const penalties = (penaltiesResult.resources || []).map((p) => ({
      eventType: 'penalty',
      ...p,
      recordedAt: normalizeRecordedAt(p),
    }));

    // Merge and sort by recordedAt DESC
    const events = [...goals, ...penalties].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));

    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching game events:', error);
    res.status(500).json({ error: 'Failed to fetch game events' });
  }
});

// Deprecate generic game-events creation in favor of dedicated endpoints
app.post('/api/game-events', async (req, res) => {
  const { eventType } = req.body || {};
  return res.status(501).json({
    error: 'Use dedicated endpoints to create events',
    next: eventType === 'goal' ? '/api/goals' : eventType === 'penalty' ? '/api/penalties' : undefined,
    supported: ['/api/goals', '/api/penalties']
  });
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
  // Kick off background pre-generation for announcer assets
  preGenerateGoalAssets(gameId);
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
  // Kick off background pre-generation for announcer assets
  preGeneratePenaltyAssets(gameId);
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
  const requestLogger = logger.withRequest(req);
  requestLogger.info('Goal announcement request', { 
    gameId: req.body.gameId, 
    voiceGender: req.body.voiceGender, 
    announcerMode: req.body.announcerMode 
  });
  
  const { gameId, voiceGender, announcerMode } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Invalid request. Required: gameId.'
    });
  }

  // Check if announcer service is available
  if (!generateGoalAnnouncement || (announcerMode === 'dual' && !generateDualGoalAnnouncement)) {
    return res.status(503).json({
      error: true,
      message: 'Voice announcements temporarily unavailable',
      code: 'ANNOUNCER_UNAVAILABLE',
      userMessage: 'Voice announcements are temporarily unavailable due to missing dependencies. Text updates and scoring still work normally.',
      fallback: 'Text mode available',
      details: {
        singleModeAvailable: !!generateGoalAnnouncement,
        dualModeAvailable: !!generateDualGoalAnnouncement,
        requestedMode: announcerMode
      },
      canRetry: true,
      timestamp: new Date().toISOString()
    });
  }

  // Map voice gender to Google TTS Studio voices using UNIFIED voice configuration
  const { getAnnouncerVoices, logTtsUse } = await import('./voiceConfig.js');
  const voiceConfig = await getAnnouncerVoices();
  
  let selectedVoice = voiceGender === 'male' ? voiceConfig.maleVoice : voiceConfig.femaleVoice;
  
  // Log TTS usage for monitoring
  logger.logTtsUsage(selectedVoice, voiceConfig.provider, gameId, {
    where: voiceGender === 'male' ? 'MaleButton' : 'FemaleButton',
    rate: voiceConfig.settings.rate,
    pitch: voiceConfig.settings.pitch,
    style: 'none',
    mode: announcerMode
  });
  
  requestLogger.debug('Voice configuration selected', {
    selectedVoice,
    voiceType: selectedVoice.includes('Studio') ? 'Studio (Professional)' : 
               selectedVoice.includes('Neural2') ? 'Neural2 (Standard)' : 'Unknown',
    mode: announcerMode
  });
  
  // For dual mode, we don't use TTS service - conversation is handled in frontend
  let originalVoice;
  if (announcerMode !== 'dual') {
    // Temporarily set the voice in TTS service for single announcer mode
    originalVoice = ttsService.selectedVoice;
    ttsService.selectedVoice = selectedVoice;
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
        if (announcerMode === 'dual') {
          // For dual mode with no goals, create a conversation about the scoreless game
          const conversationStarter = `Still scoreless between ${game.homeTeam} and ${game.awayTeam}`;
          const scorelessConversation = await generateDualRandomCommentary(gameId, {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            period: 1,
            scoreless: true,
            conversationStarter
          });
          
          return res.status(200).json({
            success: true,
            scoreless: true,
            conversation: scorelessConversation,
            gameData: {
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              homeScore: 0,
              awayScore: 0
            }
          });
        } else {
          const scorelessCommentary = await generateScorelessCommentary({
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            period: 1 // Default to first period for scoreless games
          }, voiceGender);
          
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
        }
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

    // Try to serve from cache now that we have context
    const cached = announcerCache.goals.get(gameId);
    if (cached) {
      if (announcerMode === 'dual' && cached.dual?.conversation) {
        return res.status(200).json({
          success: true,
          cached: true,
          goal: lastGoal,
          conversation: cached.dual.conversation,
          goalData,
          playerStats
        });
      }
      if (announcerMode !== 'dual' && cached.single?.[voiceGender]?.text) {
        return res.status(200).json({
          success: true,
          cached: true,
          goal: lastGoal,
          announcement: {
            text: cached.single[voiceGender].text,
            audioPath: cached.single[voiceGender].audioPath || null
          },
          goalData,
          playerStats
        });
      }
    }

    if (announcerMode === 'dual') {
      // Generate dual announcer conversation
      const conversation = trimConversationLines(await generateDualGoalAnnouncement(goalData, playerStats), 4);
      
      console.log('✅ Dual goal announcement generated successfully');
      // update cache
      const entry = announcerCache.goals.get(gameId) || { single: {} };
      entry.dual = { conversation, updatedAt: Date.now() };
      announcerCache.goals.set(gameId, entry);
      
      res.status(200).json({
        success: true,
        goal: lastGoal,
        conversation,
        goalData,
        playerStats
      });
    } else {
      // Generate single announcer text
      const announcementText = await generateGoalAnnouncement(goalData, playerStats, voiceGender);
      
      // Generate TTS audio for goal announcement using optimized goal speech
      const audioResult = await ttsService.generateGoalSpeech(announcementText, gameId);
      const audioFilename = audioResult?.success ? audioResult.filename : null;
      
      requestLogger.success('Goal announcement generated successfully');

      // update cache
      const entry = announcerCache.goals.get(gameId) || { single: {} };
      entry.single[voiceGender] = { text: announcementText, audioPath: audioFilename, voice: selectedVoice, updatedAt: Date.now() };
      announcerCache.goals.set(gameId, entry);
      
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
    }
  } catch (error) {
    requestLogger.error('Error announcing last goal', { error: error.message });
    handleError(res, error, 'Goal Announcement', req.requestId);
  } finally {
    // Restore original voice for single announcer mode
    if (announcerMode !== 'dual') {
      ttsService.selectedVoice = originalVoice;
    }
  }
});

// Penalty announcement endpoint
app.post('/api/penalties/announce-last', async (req, res) => {
  const requestLogger = logger.withRequest(req);
  requestLogger.info('Penalty announcement request', { 
    gameId: req.body.gameId, 
    voiceGender: req.body.voiceGender, 
    announcerMode: req.body.announcerMode 
  });
  
  const { gameId, voiceGender, announcerMode } = req.body;

  if (!gameId) {
    return res.status(400).json({
      error: 'Game ID is required'
    });
  }

  // Check if announcer service is available
  if (!generatePenaltyAnnouncement || (announcerMode === 'dual' && !generateDualPenaltyAnnouncement)) {
    return res.status(503).json({
      error: true,
      message: 'Voice announcements temporarily unavailable',
      code: 'ANNOUNCER_UNAVAILABLE',
      userMessage: 'Voice announcements are temporarily unavailable due to missing dependencies. Text updates and scoring still work normally.',
      fallback: 'Text mode available',
      details: {
        penaltyModeAvailable: !!generatePenaltyAnnouncement,
        dualModeAvailable: !!generateDualPenaltyAnnouncement,
        requestedMode: announcerMode
      },
      canRetry: true,
      timestamp: new Date().toISOString()
    });
  }

  // Map voice gender to Google TTS Studio voices using UNIFIED voice configuration
  const { getAnnouncerVoices, logTtsUse } = await import('./voiceConfig.js');
  const voiceConfig = await getAnnouncerVoices();
  
  let selectedVoice = voiceGender === 'male' ? voiceConfig.maleVoice : voiceConfig.femaleVoice;
  
  // Log TTS usage for debugging
  logTtsUse({ 
    where: voiceGender === 'male' ? 'MaleButton_Penalty' : 'FemaleButton_Penalty', 
    provider: voiceConfig.provider, 
    voice: selectedVoice, 
    rate: voiceConfig.settings.rate, 
    pitch: voiceConfig.settings.pitch, 
    style: 'none' 
  });
  
  console.log(`🎤 Using voice for penalty: ${selectedVoice} (requested: ${voiceGender}, mode: ${announcerMode})`);
  
  // For dual mode, we don't use TTS service
  let originalVoice;
  if (announcerMode !== 'dual') {
    // Temporarily set the voice in TTS service for single announcer mode
    originalVoice = ttsService.selectedVoice;
    ttsService.selectedVoice = selectedVoice;
  }

  try {
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    const goalsContainer = getGoalsContainer();

  // We'll check cache once we have context below
    
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

    // Try to serve from cache now that we have context
    const cached = announcerCache.penalties.get(gameId);
    if (cached) {
      if (announcerMode === 'dual' && cached.dual?.conversation) {
        return res.status(200).json({
          success: true,
          cached: true,
          penalty: lastPenalty,
          conversation: cached.dual.conversation,
          penaltyData,
          gameContext
        });
      }
      if (announcerMode !== 'dual' && cached.single?.[voiceGender]?.text) {
        return res.status(200).json({
          success: true,
          cached: true,
          penalty: lastPenalty,
          announcement: {
            text: cached.single[voiceGender].text,
            audioPath: cached.single[voiceGender].audioPath || null
          },
          penaltyData,
          gameContext
        });
      }
    }

    if (announcerMode === 'dual') {
      // Generate dual announcer conversation
      const conversation = trimConversationLines(await generateDualPenaltyAnnouncement(penaltyData, gameContext), 4);
      
      console.log('✅ Dual penalty announcement generated successfully');
      const entry = announcerCache.penalties.get(gameId) || { single: {} };
      entry.dual = { conversation, updatedAt: Date.now() };
      announcerCache.penalties.set(gameId, entry);
      
      res.status(200).json({
        success: true,
        penalty: lastPenalty,
        conversation,
        penaltyData,
        gameContext
      });
    } else {
      // Generate single announcer text
      const announcementText = await generatePenaltyAnnouncement(penaltyData, gameContext, voiceGender);
      
      // Generate TTS audio for penalty announcement (using special penalty voice)
      const audioResult = await ttsService.generatePenaltySpeech(announcementText, gameId);
      const audioFilename = audioResult?.success ? audioResult.filename : null;
      
      console.log('✅ Penalty announcement generated successfully');
      const entry = announcerCache.penalties.get(gameId) || { single: {} };
      entry.single[voiceGender] = { text: announcementText, audioPath: audioFilename, voice: selectedVoice, updatedAt: Date.now() };
      announcerCache.penalties.set(gameId, entry);
      
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
    }
  } catch (error) {
    console.error('❌ Error announcing last penalty:', error.message);
    handleError(res, error);
  } finally {
    // Restore original voice for single announcer mode
    if (announcerMode !== 'dual') {
      ttsService.selectedVoice = originalVoice;
    }
  }
});

// Random Commentary endpoint
// Random Commentary endpoint
app.post('/api/randomCommentary', async (req, res) => {
  const requestLogger = logger.withRequest(req);
  requestLogger.info('Random commentary request', { 
    gameId: req.body.gameId, 
    division: req.body.division,
    voiceGender: req.body.voiceGender, 
    announcerMode: req.body.announcerMode 
  });
  
  const { gameId, division, voiceGender, announcerMode } = req.body;

  if (!gameId && !division) {
    return res.status(400).json({
      error: 'Either gameId or division is required.'
    });
  }

  // Check if dual announcer mode is requested and available
  if (announcerMode === 'dual' && !generateDualRandomCommentary) {
    return res.status(503).json({
      error: true,
      message: 'Voice announcements temporarily unavailable',
      code: 'ANNOUNCER_UNAVAILABLE',
      userMessage: 'Voice announcements are temporarily unavailable due to missing dependencies. Text updates and scoring still work normally.',
      fallback: 'Text mode available',
      details: {
        dualModeAvailable: !!generateDualRandomCommentary,
        requestedMode: announcerMode
      },
      canRetry: true,
      timestamp: new Date().toISOString()
    });
  }

  // Handle dual announcer mode
  if (announcerMode === 'dual') {
    try {
      let gameContext = { gameId, division };
      
      // Try to get database context, but provide fallback if database is not available
      try {
        const goalsContainer = getGoalsContainer();
        const penaltiesContainer = getPenaltiesContainer();
        const gamesContainer = getGamesContainer();
        
        if (gameId) {
          // Get game details
          const { resources: gameDetails } = await gamesContainer.items
            .query({
              query: "SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId",
              parameters: [{ name: '@gameId', value: gameId }]
            })
            .fetchAll();
          
          if (gameDetails.length > 0) {
            const game = gameDetails[0];
            gameContext.homeTeam = game.homeTeam;
            gameContext.awayTeam = game.awayTeam;
            gameContext.division = game.division || game.league;
          }
          
          // Get recent goals and penalties for context
          const { resources: goals } = await goalsContainer.items
            .query({
              query: "SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC",
              parameters: [{ name: '@gameId', value: gameId }]
            })
            .fetchAll();
          
          const { resources: penalties } = await penaltiesContainer.items
            .query({
              query: "SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC",
              parameters: [{ name: '@gameId', value: gameId }]
            })
            .fetchAll();
          
          gameContext.goalsCount = goals.length;
          gameContext.penaltiesCount = penalties.length;
          
          if (goals.length > 0) {
            const homeGoals = goals.filter(g => (g.teamName || g.scoringTeam) === gameContext.homeTeam).length;
            const awayGoals = goals.filter(g => (g.teamName || g.scoringTeam) === gameContext.awayTeam).length;
            gameContext.currentScore = { home: homeGoals, away: awayGoals };
          }
        }
        
        console.log('✅ Retrieved database context for dual random commentary');
        
      } catch (dbError) {
        // Fallback to simple game context when database is not available (local development)
        console.log('⚠️ Database not available for dual mode, using fallback context:', dbError.message);
        
        // Provide minimal context for dual announcer conversation
        if (gameId) {
          gameContext.homeTeam = 'Home Team';
          gameContext.awayTeam = 'Away Team';
          gameContext.division = division || 'Hockey League';
          gameContext.goalsCount = 0;
          gameContext.penaltiesCount = 0;
          gameContext.currentScore = { home: 0, away: 0 };
        }
      }
      
      // Serve on-deck cached conversation if available
      const key = gameId ? `game-${gameId}` : `div-${division || 'global'}`;
      const cached = announcerCache.randomDual.get(key);
      let conversation;
      if (cached?.conversation) {
        conversation = cached.conversation;
      } else {
        // Generate the dual announcer conversation
        console.log('🎙️ Calling generateDualRandomCommentary with context:', gameContext);
        conversation = await generateDualRandomCommentary(gameId, gameContext);
        conversation = trimConversationLines(conversation, 4);
      }
      // Pre-generate the next one in background
      preGenerateRandomDual(key, gameContext);
      console.log('🎙️ Received conversation from generateDualRandomCommentary:', conversation?.length, 'lines');
      
      console.log('✅ Dual random commentary conversation generated successfully');
      
      res.status(200).json({
        success: true,
        type: 'dual_conversation',
        conversation,
        gameContext
      });
      
    } catch (error) {
      console.error('❌ Error generating dual random commentary:', {
        message: error.message,
        stack: error.stack,
        gameId,
        announcerMode,
        voiceGender
      });
      res.status(500).json({
        error: 'Failed to generate dual random conversation',
        message: error.message,
        details: {
          gameId,
          announcerMode,
          voiceGender,
          timestamp: new Date().toISOString()
        }
      });
    }
    return;
  }

  // Single announcer mode continues as before
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
        'male': 'en-US-Studio-Q',    // Studio-Q is Al (male)
        'female': 'en-US-Studio-O'   // Studio-O is Linda (female)  
      };
      selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
    }
  } catch (configError) {
    console.warn('⚠️ Could not fetch voice config, using defaults:', configError.message);
    const defaultMapping = {
      'male': 'en-US-Studio-Q',    // Studio-Q is Al (male)
      'female': 'en-US-Studio-O'   // Studio-O is Linda (female)
    };
    selectedVoice = defaultMapping[voiceGender] || 'en-US-Studio-Q';
  }
  
  console.log(`🎤 Using voice for random commentary: ${selectedVoice} (requested: ${voiceGender})`);
  
  // Temporarily set the voice in TTS service for this request
  const originalVoice = ttsService.selectedVoice;
  ttsService.selectedVoice = selectedVoice;

  try {
    let commentaryText = '';
    
    // Try to access database containers for rich commentary
    try {
      const goalsContainer = getGoalsContainer();
      const penaltiesContainer = getPenaltiesContainer();
      const gamesContainer = getGamesContainer();
      
      // Generate different types of commentary, prioritizing game-specific content when gameId is provided
      let commentaryTypes = ['hot_player', 'leader', 'matchup', 'fact'];
      
      // If we have a gameId, add game-specific commentary types and prioritize them
      if (gameId) {
        commentaryTypes = ['game_specific', 'hot_player', 'game_specific', 'leader', 'game_specific', 'matchup', 'fact'];
      }
      
      const selectedType = commentaryTypes[Math.floor(Math.random() * commentaryTypes.length)];
      
      switch (selectedType) {
        case 'game_specific':
          commentaryText = await generateGameSpecificCommentary(goalsContainer, penaltiesContainer, gamesContainer, gameId);
          break;
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
      
      console.log(`✅ Generated ${selectedType} commentary from database`);
      
    } catch (dbError) {
      // Fallback to simple commentary when database is not available (local development)
      console.log('⚠️ Database not available, using fallback commentary:', dbError.message);
      
      const fallbackCommentaries = [
        'The players are battling hard on the ice tonight! What an exciting game we have here!',
        'Both teams are showing incredible determination! The energy in the arena is electric!',
        'What a fantastic display of hockey skills! These players are giving it their all!',
        'The pace of this game is incredible! Both teams are playing with such intensity!',
        'This is why we love hockey! Fast-paced action and skilled players making great plays!',
        'The competition is fierce tonight! Every shift matters in this exciting matchup!',
        'Watch these athletes showcase their talent! Pure hockey excellence on display!'
      ];
      
      commentaryText = fallbackCommentaries[Math.floor(Math.random() * fallbackCommentaries.length)];
      console.log('✅ Using fallback commentary for local development');
    }
    
    // Generate TTS audio for random commentary
    const audioResult = await ttsService.generateSpeech(commentaryText, gameId || 'random', 'announcement');
    const audioFilename = audioResult?.success ? audioResult.filename : null;
    
    console.log('🔊 TTS Result:', { audioResult, audioFilename });
    console.log('✅ Random commentary generated successfully');
    
    res.status(200).json({
      success: true,
      type: 'random',
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
async function generateGameSpecificCommentary(goalsContainer, penaltiesContainer, gamesContainer, gameId) {
  try {
    // Get game details first
    const { resources: gameDetails } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId",
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();
    
    if (gameDetails.length === 0) {
      return 'Both teams are battling hard on the ice tonight!';
    }
    
    const game = gameDetails[0];
    const homeTeam = game.homeTeam || 'Home Team';
    const awayTeam = game.awayTeam || 'Away Team';
    
    // Get goals for this specific game
    const { resources: gameGoals } = await goalsContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();
    
    // Get penalties for this game
    const { resources: gamePenalties } = await penaltiesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.gameId = @gameId",
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();
    
    // Generate commentary based on current game state
    const templates = [];
    
    if (gameGoals.length > 0) {
      const recentGoal = gameGoals[gameGoals.length - 1];
      const scorer = recentGoal.playerName || recentGoal.scorer || 'a player';
      const team = recentGoal.teamName || recentGoal.scoringTeam || 'their team';
      templates.push(`What a goal by ${scorer} for ${team}!`);
      templates.push(`${team} finds the back of the net with that goal from ${scorer}!`);
    }
    
    if (gamePenalties.length > 0) {
      templates.push(`We've seen some physical play out there with ${gamePenalties.length} penalties tonight!`);
    }
    
    // Add general game-specific templates
    templates.push(`It's a great matchup between ${awayTeam} and ${homeTeam} tonight!`);
    templates.push(`${homeTeam} and ${awayTeam} are giving it their all on home ice!`);
    templates.push(`The intensity is building between these two teams!`);
    
    if (gameGoals.length === 0) {
      templates.push(`Both goaltenders are standing on their heads - no goals scored yet!`);
      templates.push(`Defensive battle out there between ${homeTeam} and ${awayTeam}!`);
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  } catch (error) {
    console.error('Error generating game-specific commentary:', error);
    return 'What an exciting game we have here tonight!';
  }
}

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
    
    // Update the original game record to mark it as submitted
    try {
      const originalGameQuery = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      };
      const { resources: originalGames } = await gamesContainer.items.query(originalGameQuery).fetchAll();
      
      if (originalGames.length > 0) {
        const originalGame = originalGames[0];
        const updatedGame = {
          ...originalGame,
          status: 'completed', // Change from 'scheduled' to 'completed'
          submittedAt: new Date().toISOString(),
          submittedBy: submittedBy || 'Unknown',
          finalScore: finalScore || {},
          totalGoals: goals.length,
          totalPenalties: penalties.length
        };
        
        await gamesContainer.item(originalGame.id, originalGame.gameId || originalGame.id).replace(updatedGame);
        console.log('✅ Original game record updated to completed status');
      }
    } catch (updateError) {
      console.warn('⚠️ Could not update original game record:', updateError.message);
      // Continue with submission creation even if original update fails
    }
    
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
        console.log(`📰 Generating report for ${gameDetails.division} division`);
        
        // Generate report asynchronously (don't wait for completion)
        generateRinkReport(gameDetails.division) // Generate for all submitted games
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

// DELETE endpoint for cleaning up Silver/Bronze and invalid games (admin function)
app.delete('/api/games/cleanup', async (req, res) => {
  console.log('🧹 Cleaning up invalid games...');

  try {
    const gamesContainer = getGamesContainer();
    
    // Get all games
    const { resources: allGames } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c",
        parameters: []
      })
      .fetchAll();
    
    console.log(`📊 Found ${allGames.length} total records to examine`);
    
    // Filter for problematic games
    const problematicGames = allGames.filter(game => {
      // Games with Silver or Bronze division
      const isSilverOrBronze = game.division === 'Silver' || game.division === 'Bronze';
      
      // Games with missing or invalid team names
      const missingTeams = !game.homeTeam || !game.awayTeam || 
                          game.homeTeam.trim() === '' || game.awayTeam.trim() === '' ||
                          game.homeTeam === 'vs' || game.awayTeam === 'vs';
      
      // Games with "Date TBD" or invalid dates
      const invalidDate = !game.gameDate || game.gameDate === 'Date TBD';
      
      return isSilverOrBronze || missingTeams || invalidDate;
    });
    
    console.log(`🎯 Found ${problematicGames.length} problematic games to delete`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const game of problematicGames) {
      try {
        // Try different partition key strategies
        const partitionKey = game.league || game.division || game.gameId || game.id;
        await gamesContainer.item(game.id, partitionKey).delete();
        console.log(`✅ Deleted game: ${game.homeTeam || 'Unknown'} vs ${game.awayTeam || 'Unknown'} (${game.division})`);
        deletedCount++;
      } catch (deleteError) {
        if (deleteError.code === 404) {
          console.log(`ℹ️  Game ${game.id} already removed`);
          deletedCount++; // Count as successful since it's gone
        } else {
          console.error(`❌ Failed to delete game ${game.id}:`, deleteError.message);
          errorCount++;
        }
      }
    }
    
    console.log(`✅ Cleanup complete: Successfully deleted ${deletedCount} problematic games`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} games had deletion errors`);
    }
    
    res.status(200).json({
      success: true,
      message: `Cleanup complete. Deleted ${deletedCount} problematic games.`,
      deletedCount,
      errorCount,
      totalExamined: allGames.length,
      problematicFound: problematicGames.length
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to cleanup games',
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
    credentialsSource: config.googleTts.credentialsJson ? 'Azure Environment JSON' : 
                      config.googleTts.credentialsPath ? 'File Path' : 'None',
    studioVoicesExpected: !!config.googleTts.credentialsJson,
    googleCloudProject: config.googleTts.credentialsJson ? 
      (() => {
        try {
          const creds = JSON.parse(config.googleTts.credentialsJson);
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
      console.warn('Player stats refresh requested but not implemented in this deployment.');
      return res.status(501).json({
        error: 'Player stats refresh is disabled',
        message: 'The refresh operation is not available in this deployment.'
      });
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

// Shots on Goal API endpoints
app.post('/api/shots-on-goal', async (req, res) => {
  console.log('🥅 Recording shot on goal...');
  const { gameId, team } = req.body;
  
  try {
    const container = getShotsOnGoalContainer();
    
    // Try to find existing record for this game
    const query = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: existingRecords } = await container.items.query(query).fetchAll();
    let shotRecord;
    
    if (existingRecords.length > 0) {
      // Update existing record
      shotRecord = existingRecords[0];
      shotRecord[team] = (shotRecord[team] || 0) + 1;
      shotRecord.lastUpdated = new Date().toISOString();
      
      // Ensure team data is populated for existing records that might not have it
      if (!shotRecord.homeTeam || !shotRecord.awayTeam || !shotRecord.homeTeamId || !shotRecord.awayTeamId) {
        try {
          const gamesContainer = getGamesContainer();
          const gameQuery = {
            query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
            parameters: [{ name: '@gameId', value: gameId }]
          };
          const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();
          if (games.length > 0) {
            const game = games[0];
            shotRecord.homeTeam = shotRecord.homeTeam || game.homeTeam || '';
            shotRecord.awayTeam = shotRecord.awayTeam || game.awayTeam || '';
            shotRecord.homeTeamId = shotRecord.homeTeamId || game.homeTeamId || game.homeTeam || '';
            shotRecord.awayTeamId = shotRecord.awayTeamId || game.awayTeamId || game.awayTeam || '';
            console.log(`📊 Backfilled team data for existing shot record: ${shotRecord.homeTeam} vs ${shotRecord.awayTeam}`);
          }
        } catch (gameError) {
          console.log('Could not backfill team data:', gameError.message);
        }
      }
      
      await container.item(shotRecord.id, shotRecord.gameId).replace(shotRecord);
      console.log(`✅ Updated shot count for ${team} in game ${gameId}: ${shotRecord[team]}`);
    } else {
      // Create new record
      shotRecord = {
        id: `shots_${gameId}`,
        gameId: gameId,
        type: 'shots-on-goal-summary',
        home: team === 'home' ? 1 : 0,
        away: team === 'away' ? 1 : 0,
        homeTeam: '',      // Team display name
        awayTeam: '',      // Team display name  
        homeTeamId: '',    // Team ID for database relationships
        awayTeamId: '',    // Team ID for database relationships
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      // Try to get team names and IDs from game data
      try {
        const gamesContainer = getGamesContainer();
        const gameQuery = {
          query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
          parameters: [{ name: '@gameId', value: gameId }]
        };
        const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();
        if (games.length > 0) {
          const game = games[0];
          // Store both display names and IDs for complete data structure
          shotRecord.homeTeam = game.homeTeam || '';
          shotRecord.awayTeam = game.awayTeam || '';
          shotRecord.homeTeamId = game.homeTeamId || game.homeTeam || '';
          shotRecord.awayTeamId = game.awayTeamId || game.awayTeam || '';
          console.log(`📊 Enriched shot record with team data: ${shotRecord.homeTeam} vs ${shotRecord.awayTeam}`);
        }
      } catch (gameError) {
        console.log('Could not fetch game details for team names:', gameError.message);
      }
      
      await container.items.create(shotRecord);
      console.log(`✅ Created new shot record for game ${gameId}, ${team}: 1`);
    }
    
    res.status(201).json({
      gameId: shotRecord.gameId,
      home: shotRecord.home,
      away: shotRecord.away,
      homeTeam: shotRecord.homeTeam,
      awayTeam: shotRecord.awayTeam,
      homeTeamId: shotRecord.homeTeamId,
      awayTeamId: shotRecord.awayTeamId,
      lastUpdated: shotRecord.lastUpdated
    });
  } catch (error) {
    console.error('❌ Error recording shot on goal:', error);
    handleError(res, error);
  }
});

app.get('/api/shots-on-goal/game/:gameId', async (req, res) => {
  const { gameId } = req.params;
  
  try {
    const container = getShotsOnGoalContainer();
    
    const query = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [
        { name: '@gameId', value: gameId }
      ]
    };
    
    const { resources: shots } = await container.items.query(query).fetchAll();
    
    let shotCounts = { home: 0, away: 0 };
    
    if (shots.length > 0) {
      const shotRecord = shots[0];
      shotCounts = {
        id: shotRecord.id,
        home: shotRecord.home || 0,
        away: shotRecord.away || 0,
        gameId: shotRecord.gameId
      };
    }
    
    console.log(`✅ Found shot counts for game ${gameId}: Home: ${shotCounts.home}, Away: ${shotCounts.away}`);
    res.status(200).json(shotCounts);
  } catch (error) {
    console.error('❌ Error fetching shots on goal for game:', error);
    handleError(res, error);
  }
});

// Delete shots on goal record
app.delete('/api/shots-on-goal/:id', async (req, res) => {
  const { id } = req.params;
  const { gameId } = req.query;
  
  try {
    const container = getShotsOnGoalContainer();
    
    console.log(`🗑️ Deleting shots on goal record ${id} for game ${gameId}`);
    
    await container.item(id, gameId).delete();
    
    console.log('✅ Shots on goal record deleted successfully');
    res.status(200).json({ message: 'Shots on goal record deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting shots on goal record:', error);
    if (error.code === 404) {
      res.status(404).json({ error: 'Shots on goal record not found' });
    } else {
      handleError(res, error);
    }
  }
});

// Undo Last Action API endpoint (robust, PK-safe)
app.post('/api/undo-last-action', async (req, res) => {
  console.log('↩️ Undoing last action...');
  const { gameId } = req.body;

  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const shotsContainer = getShotsOnGoalContainer();

    // Prefer recordedAt; fall back to legacy timeRecorded
    const goalsQuery = {
      query: 'SELECT TOP 1 * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const penaltiesQuery = {
      query: 'SELECT TOP 1 * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const shotsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };

    const [goalsResult, penaltiesResult, shotsResult] = await Promise.all([
      goalsContainer.items.query(goalsQuery).fetchAll(),
      penaltiesContainer.items.query(penaltiesQuery).fetchAll(),
      shotsContainer.items.query(shotsQuery).fetchAll()
    ]);

    const lastGoal = goalsResult.resources?.[0] || null;
    const lastPenalty = penaltiesResult.resources?.[0] || null;
    const shotRecord = shotsResult.resources?.[0] || null;

    const candidates = [];
    if (lastGoal) {
      const ts = new Date(lastGoal.recordedAt || lastGoal.timeRecorded || lastGoal._ts * 1000);
      candidates.push({ type: 'goal', ts, item: lastGoal, container: goalsContainer, pk: lastGoal.gameId });
    }
    if (lastPenalty) {
      const ts = new Date(lastPenalty.recordedAt || lastPenalty.timeRecorded || lastPenalty._ts * 1000);
      candidates.push({ type: 'penalty', ts, item: lastPenalty, container: penaltiesContainer, pk: lastPenalty.gameId });
    }
    if (shotRecord && ((shotRecord.home || 0) > 0 || (shotRecord.away || 0) > 0)) {
      const ts = new Date(shotRecord.lastUpdated || shotRecord._ts * 1000 || Date.now());
      candidates.push({ type: 'shot', ts, item: shotRecord, container: shotsContainer, pk: shotRecord.gameId });
    }

    if (candidates.length === 0) {
      return res.status(404).json({ error: 'No actions found to undo for this game' });
    }

    candidates.sort((a, b) => b.ts - a.ts);
    const mostRecent = candidates[0];

    if (mostRecent.type === 'shot') {
      const rec = { ...mostRecent.item };
      if ((rec.home || 0) >= (rec.away || 0)) {
        rec.home = Math.max(0, (rec.home || 0) - 1);
      } else {
        rec.away = Math.max(0, (rec.away || 0) - 1);
      }
      rec.lastUpdated = new Date().toISOString();

      if ((rec.home || 0) === 0 && (rec.away || 0) === 0) {
        await mostRecent.container.item(rec.id, mostRecent.pk).delete();
      } else {
        await mostRecent.container.item(rec.id, mostRecent.pk).replace(rec);
      }

      console.log(`✅ Undid last shot for game ${gameId}`);
      return res.status(200).json({
        message: 'Successfully undid last shot on goal',
        gameId,
        home: rec.home || 0,
        away: rec.away || 0,
        lastUpdated: rec.lastUpdated
      });
    }

    // Goal or penalty: delete record with correct PK
    await mostRecent.container.item(mostRecent.item.id, mostRecent.pk).delete();
    console.log(`✅ Undid last ${mostRecent.type} for game ${gameId}`);

    return res.status(200).json({
      message: `Successfully undid last ${mostRecent.type}`,
      deletedAction: {
        type: mostRecent.type,
        id: mostRecent.item.id,
        timeRecorded: mostRecent.item.recordedAt || mostRecent.item.timeRecorded
      }
    });
  } catch (error) {
    console.error('❌ Error undoing last action:', error);
    handleError(res, error);
  }
});

// Undo specific shot on goal
app.post('/api/undo-shot-on-goal', async (req, res) => {
  console.log('↩️ Undoing shot on goal...');
  const { gameId, team } = req.body;
  
  try {
    const container = getShotsOnGoalContainer();
    
    // Find the shot record for this game
    const query = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    
    const { resources: shots } = await container.items.query(query).fetchAll();
    
    if (shots.length === 0) {
      return res.status(404).json({ error: 'No shot records found for this game' });
    }
    
    const shotRecord = shots[0];
    const currentCount = shotRecord[team] || 0;
    
    if (currentCount === 0) {
      return res.status(400).json({ error: `No shots to undo for team ${team}` });
    }
    
    // Decrement the count
    shotRecord[team] = currentCount - 1;
    shotRecord.lastUpdated = new Date().toISOString();
    
    if ((shotRecord.home || 0) === 0 && (shotRecord.away || 0) === 0) {
      // If no shots left, delete the record
      await container.item(shotRecord.id, shotRecord.gameId).delete();
      console.log(`✅ Deleted empty shot record for game ${gameId}`);
    } else {
      // Update the record with decremented count
      await container.item(shotRecord.id, shotRecord.gameId).replace(shotRecord);
      console.log(`✅ Undid shot for ${team} in game ${gameId}: ${shotRecord[team]}`);
    }
    
    res.status(200).json({
      message: `Successfully undid shot for ${team}`,
      gameId: shotRecord.gameId,
      home: shotRecord.home || 0,
      away: shotRecord.away || 0,
      lastUpdated: shotRecord.lastUpdated
    });
  } catch (error) {
    console.error('❌ Error undoing shot on goal:', error);
    handleError(res, error);
  }
});

// Rink Reports API endpoint
app.get('/api/rink-reports', async (req, res) => {
  console.log('📰 Fetching rink reports...');
  const { division } = req.query;
  
  try {
    const container = getRinkReportsContainer();
    let querySpec;
    
    if (division) {
      // Get report for specific division
      querySpec = {
        query: 'SELECT * FROM c WHERE c.division = @division ORDER BY c.lastUpdated DESC',
        parameters: [{ name: '@division', value: division }]
      };
    } else {
      // Get all reports, ordered by last updated (most recent first)
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.lastUpdated DESC'
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
  const { division } = req.body;
  
  try {
    if (!division) {
      return res.status(400).json({
        error: 'Division is required',
        example: { division: 'Gold' }
      });
    }
    
    console.log(`📰 Generating report for ${division} division`);
    
    const report = await generateRinkReport(division);
    
    res.status(201).json({
      success: true,
      message: `Rink report generated for ${division} division`,
      report: {
        id: report.id,
        division: report.division,
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

// Explicit sounds mapping in production to ensure reliable asset delivery
if (config.isProduction) {
  const frontendDistForSounds = path.resolve(__dirname, 'frontend');
  const soundsDir = path.join(frontendDistForSounds, 'sounds');

  if (!fs.existsSync(soundsDir)) {
    console.warn('⚠️  Sounds directory not found in production dist:', soundsDir);
  }

  app.use('/sounds', (req, _res, next) => {
    // Minimal tracing for sound fetches
    console.log(`🔊 SOUND request: /sounds${req.path}`);
    next();
  });

  app.use('/sounds', express.static(soundsDir, {
    maxAge: '30d',
    etag: true
  }));
}

// Dynamic listing of organ sounds for the frontend DJ panels
app.get('/api/sounds/organs', (req, res) => {
  try {
    // In production, the built assets live under backend/frontend/sounds
    const prodDir = path.join(__dirname, 'frontend', 'sounds', 'organs');
    // In development, they live under frontend/public/sounds
    const devDir = path.join(__dirname, '..', 'frontend', 'public', 'sounds', 'organs');
    const baseDir = config.isProduction ? prodDir : devDir;

    if (!fs.existsSync(baseDir)) {
      return res.json({ files: [], urls: [] });
    }

    const files = fs
      .readdirSync(baseDir)
      .filter(f => /\.(mp3|wav|ogg)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // Return both filenames and absolute URLs (from site root)
    return res.json({
      files,
      urls: files.map(f => `/sounds/organs/${f}`)
    });
  } catch (error) {
    console.error('❌ Error listing organ sounds:', error);
    return res.status(500).json({ error: 'Failed to list organ sounds' });
  }
});

// Dynamic listing of fanfare sounds for the frontend DJ panels
app.get('/api/sounds/fanfare', (req, res) => {
  try {
    const prodDir = path.join(__dirname, 'frontend', 'sounds', 'fanfare');
    const devDir = path.join(__dirname, '..', 'frontend', 'public', 'sounds', 'fanfare');
    const baseDir = config.isProduction ? prodDir : devDir;

    if (!fs.existsSync(baseDir)) {
      return res.json({ files: [], urls: [] });
    }

    const files = fs
      .readdirSync(baseDir)
      .filter(f => /\.(mp3|wav|ogg)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return res.json({
      files,
      urls: files.map(f => `/sounds/fanfare/${f}`)
    });
  } catch (error) {
    console.error('❌ Error listing fanfare sounds:', error);
    return res.status(500).json({ error: 'Failed to list fanfare sounds' });
  }
});

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

// Admin endpoint to clean up duplicate games
app.post('/api/admin/cleanup-games', async (req, res) => {
  try {
    console.log('🧹 Admin requested game cleanup...');
    
    const { cleanupDuplicateGames } = await import('./cleanupDuplicateGames.js');
    
    // Run cleanup and capture results
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    try {
      await cleanupDuplicateGames();
      
      res.json({
        success: true,
        message: 'Game cleanup completed successfully',
        logs: logs
      });
    } finally {
      console.log = originalLog;
    }
    
  } catch (error) {
    console.error('❌ Game cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Game cleanup failed',
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

// Dual announcer TTS endpoint - Generate Studio voice audio for individual conversation lines
app.post('/api/tts/dual-line', async (req, res) => {
  try {
    const { text, speaker, gameId } = req.body;
    
    if (!text || !speaker) {
      return res.status(400).json({ 
        error: 'Text and speaker are required for dual announcer TTS' 
      });
    }
    
    // Check if TTS client is available
    if (!ttsService.client) {
      return res.status(503).json({
        error: 'Google Cloud TTS not available',
        message: 'Studio voices require Google Cloud credentials to be configured'
      });
    }
    
    console.log(`🎤 Generating ${speaker === 'male' ? 'Al' : 'Linda'} TTS: "${text.substring(0, 50)}..."`);
    
    // Use the UNIFIED voice configuration system - same as individual buttons
    const { getAnnouncerVoices, logTtsUse } = await import('./voiceConfig.js');
    const voiceConfig = await getAnnouncerVoices();
    
    // Select studio voice based on speaker using the SAME voices as individual buttons
    const selectedVoice = speaker === 'male' ? voiceConfig.maleVoice : voiceConfig.femaleVoice;
    
    // Log TTS usage for debugging
    logTtsUse({ 
      where: `DualAnnouncer_${speaker}`, 
      provider: voiceConfig.provider, 
      voice: selectedVoice, 
      rate: voiceConfig.settings.rate, 
      pitch: voiceConfig.settings.pitch, 
      style: 'none' 
    });
    
    console.log(`🎙️ Using ${speaker} studio voice: ${selectedVoice}`);
    console.log(`🎯 Voice mapping - male: ${voiceConfig.maleVoice}, female: ${voiceConfig.femaleVoice}`);
    console.log(`🔧 TTS client status: ${ttsService.client ? 'Connected' : 'Not connected'}`);
    console.log(`🌍 Google credentials: ${config.googleTts.credentialsPath ? 'File path set' : 'Using JSON env var'}`);
    console.log(`🎚️ Expected voice type: ${selectedVoice.includes('Studio') ? 'Studio (Professional)' : selectedVoice.includes('Neural2') ? 'Neural2 (Standard)' : 'Unknown'}`);
    
    // Temporarily set the voice in TTS service for this request
    const originalVoice = ttsService.selectedVoice;
    ttsService.selectedVoice = selectedVoice;
    
    try {
      // Generate TTS audio using the dual-announcer scenario
      const audioResult = await ttsService.generateSpeech(text, gameId || 'dual', 'announcement');
      
      if (audioResult.success) {
        console.log(`✅ Generated ${speaker === 'male' ? 'Al' : 'Linda'} TTS using ${selectedVoice}`);
        console.log(`📊 Audio stats: ${audioResult.size} bytes, settings: ${JSON.stringify(audioResult.settings)}`);
        res.json({
          success: true,
          audioPath: audioResult.filename, // return filename instead of undefined audioPath
          speaker: speaker,
          voice: selectedVoice,
          size: audioResult.size,
          settings: audioResult.settings
        });
      } else {
        console.error('❌ Failed to generate dual announcer TTS:', audioResult.error);
        res.status(500).json({
          success: false,
          error: audioResult.error || 'Failed to generate dual announcer TTS'
        });
      }
    } finally {
      // Restore original voice
      ttsService.selectedVoice = originalVoice;
    }
    
  } catch (error) {
    console.error('❌ Error in dual announcer TTS endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error generating dual announcer TTS'
    });
  }
});

// Voice Configuration Endpoint
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
            femaleVoice: 'en-US-Studio-O' // Studio-O is Linda (female)
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
    // Provide a list of Google TTS Studio and Neural voices for the dropdowns
    const studioVoices = [
      { id: 'en-US-Studio-Q', name: 'Studio Q (Al - Authoritative Sports Announcer)', gender: 'male', type: 'Studio' },
      { id: 'en-US-Studio-O', name: 'Studio O (Linda - Professional Broadcaster)', gender: 'female', type: 'Studio' },
      { id: 'en-US-Studio-M', name: 'Studio M (Male - Dynamic Play-by-Play)', gender: 'male', type: 'Studio' },
      { id: 'en-US-Studio-F', name: 'Studio F (Female - Energetic Commentator)', gender: 'female', type: 'Studio' }
    ];

    const neuralVoices = [
      { id: 'en-US-Neural2-A', name: 'Neural A (Male - Natural Conversational)', gender: 'male', type: 'Neural' },
      { id: 'en-US-Neural2-C', name: 'Neural C (Female - Natural Friendly)', gender: 'female', type: 'Neural' },
      { id: 'en-US-Neural2-D', name: 'Neural D (Male - Deep Authoritative)', gender: 'male', type: 'Neural' },
      { id: 'en-US-Neural2-F', name: 'Neural F (Female - Warm Engaging)', gender: 'female', type: 'Neural' },
      { id: 'en-US-Neural2-G', name: 'Neural G (Female - Calm Professional)', gender: 'female', type: 'Neural' },
      { id: 'en-US-Neural2-H', name: 'Neural H (Female - Confident Clear)', gender: 'female', type: 'Neural' },
      { id: 'en-US-Neural2-I', name: 'Neural I (Male - Casual Relaxed)', gender: 'male', type: 'Neural' },
      { id: 'en-US-Neural2-J', name: 'Neural J (Male - Energetic Upbeat)', gender: 'male', type: 'Neural' }
    ];

    const allVoices = [...studioVoices, ...neuralVoices];
    
    res.json({
      success: true,
      voices: allVoices
    });
  } catch (error) {
    console.error('❌ Error getting available voices:', error);
    res.status(500).json({
      error: 'Failed to get available voices',
      message: error.message
    });
  }
});

// Serve static frontend files only in production (after all API routes)
if (config.isProduction) {
  const frontendDist = path.resolve(__dirname, 'frontend');
  app.use(express.static(frontendDist, { 
    maxAge: '0', // Force no cache for immediate deployment updates
    setHeaders: (res, path) => {
      if (path.endsWith('version.json')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (path.endsWith('.js') || path.endsWith('.css')) {
        // Force no cache for JS/CSS to ensure immediate updates
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      } else if (path.endsWith('.html')) {
        // No cache for HTML files
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Catch-all route to serve index.html for SPA (production only, MUST be last!)
  app.get('*', (req, res) => {
    // Force no cache for index.html to ensure fresh app loads
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Development mode: log that frontend should be served separately
  logger.info('Development mode: Frontend should be served by Vite dev server');
}

const server = app.listen(config.port, () => {
  const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  
  logger.success('Hockey Scorekeeper API started successfully', {
    port: config.port,
    environment: config.env,
    version: pkg.version,
    nodeVersion: process.version,
    memoryUsage: `${memUsage}MB`,
    endpoints: {
      server: `http://localhost:${config.port}`,
      health: '/health',
      version: '/api/version',
      api: '/api/*'
    },
    features: {
      database: !!cosmosConfigured,
      announcer: !!generateGoalAnnouncement,
      dualAnnouncer: !!generateDualGoalAnnouncement,
      tts: !!ttsService
    }
  });
  console.log('⏱️  Server started in', Math.floor((Date.now() - startTime) / 1000), 'seconds');
  console.log('✅ Deployment completed successfully - Studio voice authentication enabled');
  
  // Production-ready banner
  console.log('\n');
  console.log('████████ ██   ██ ███████     ███████  ██████  ██████  ██████  ███████ ██   ██ ███████ ███████ ██████  ███████ ██████  ');
  console.log('   ██    ██   ██ ██          ██      ██      ██    ██ ██   ██ ██      ██  ██  ██      ██      ██   ██ ██      ██   ██ ');
  console.log('   ██    ███████ █████       ███████ ██      ██    ██ ██████  █████   █████   █████   █████   ██████  █████   ██████  ');
  console.log('   ██    ██   ██ ██               ██ ██      ██    ██ ██   ██ ██      ██  ██  ██      ██      ██      ██      ██   ██ ');
  console.log('   ██    ██   ██ ███████     ███████  ██████  ██████  ██   ██ ███████ ██   ██ ███████ ███████ ██      ███████ ██   ██ ');
  console.log('\n🏒 Production Hockey Scorekeeper System Ready! 🏒');
  console.log('🎙️  AI Commentary & Studio Voice TTS Active');
  console.log('🥅 Production-ready with enhanced error handling! 🥅\n');

  // Echo banner for Log Stream visibility
  setTimeout(() => {
    console.log(`\n[Production Echo] THE SCOREKEEPER v${pkg.version} is live at ${new Date().toISOString()}`);
    console.log(`[System Status] Memory: ${memUsage}MB, Uptime: ${Math.floor(process.uptime())}s`);
  }, 5000);
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
