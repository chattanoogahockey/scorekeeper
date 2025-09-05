import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import OpenAI from 'openai';
import logger from './logger.js';

// Load environment variables from .env file
dotenv.config();

// Production environment validation
if (!process.env.COSMOS_DB_URI || !process.env.COSMOS_DB_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Initialize OpenAI client (optional for chat functionality)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI client initialized');
} else {
  console.log('⚠️  OpenAI API key not found - chat functionality will be disabled');
}

import {
  getGamesContainer,
  getAttendanceContainer,
  getRostersContainer,
  getGoalsContainer,
  getPenaltiesContainer,
  getOTShootoutContainer,
  getRinkReportsContainer,
  getPlayerStatsContainer,
  getShotsOnGoalContainer,
  initializeContainers,
  getHistoricalPlayerStatsContainer
} from './cosmosClient.js';

// Read package.json for version info
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Import TTS service
import ttsService from './ttsService.js';

// Import rink report generator
import { generateRinkReport } from './rinkReportGenerator.js';

// Conditionally import announcer service to prevent startup failures
const createGoalAnnouncement = null;
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

// Security middleware - Add before other middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
});

// Compression middleware - Reduce bandwidth usage
app.use(compression({
  level: 6, // Good balance between compression and speed
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
}));

// Configure CORS with restrictions
const corsOptions = {
  origin (origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // In production, allow Azure domains and common origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS ?
      process.env.ALLOWED_ORIGINS.split(',') : [];

    // Always allow Azure App Service domains
    const azureOrigins = [
      'https://scorekeeper.azurewebsites.net',
      'https://www.scorekeeper.azurewebsites.net',
      'http://scorekeeper.azurewebsites.net',
      'http://www.scorekeeper.azurewebsites.net'
    ];

    if (allowedOrigins.includes(origin) || azureOrigins.includes(origin)) {
      return callback(null, true);
    }

    // For debugging, log the rejected origin but don't fail
    console.log(`CORS origin check: ${origin} (rejected, but allowing for Azure compatibility)`);
    // In production, be more permissive to avoid deployment issues
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Simple in-memory cache for frequently accessed data
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(req) {
  return `${req.method}:${req.url}:${JSON.stringify(req.query)}`;
}

function getCachedResponse(cacheKey) {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    apiCache.delete(cacheKey); // Remove expired cache
  }
  return null;
}

function setCachedResponse(cacheKey, data) {
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

// Cache middleware for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && req.url.startsWith('/api/')) {
    const cacheKey = getCacheKey(req);
    const cachedResponse = getCachedResponse(cacheKey);

    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      // Use res.send instead of res.json to ensure performance monitoring works
      return res.send(JSON.stringify(cachedResponse));
    }

    // Intercept response to cache it
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        setCachedResponse(cacheKey, data);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };
  }

  next();
});

// Performance monitoring middleware - Move after cache middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(data) {
    const duration = Date.now() - start;
    const size = Buffer.isBuffer(data) ? data.length : (data ? data.length : 0);

    // Log slow requests (>500ms)
    if (duration > 500) {
      logger.warn('Slow API Request', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        responseSize: `${size} bytes`,
        userAgent: req.get('User-Agent')
      });
    }

    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Response-Size', `${size} bytes`);

    originalSend.call(this, data);
  };

  // Also intercept res.json for consistency
  res.json = function(data) {
    const duration = Date.now() - start;
    const size = JSON.stringify(data).length;

    // Log slow requests (>500ms)
    if (duration > 500) {
      logger.warn('Slow API Request', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        responseSize: `${size} bytes`,
        userAgent: req.get('User-Agent')
      });
    }

    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Response-Size', `${size} bytes`);

    originalJson.call(this, data);
  };

  next();
});

// Input validation middleware
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Basic JSON validation
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Rate limiting for AI endpoints
const aiRateLimit = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute for AI endpoints

function checkRateLimit(endpoint, identifier) {
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();

  if (!aiRateLimit[key]) {
    aiRateLimit[key] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return true;
  }

  if (now > aiRateLimit[key].resetTime) {
    aiRateLimit[key] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return true;
  }

  if (aiRateLimit[key].count >= RATE_LIMIT_MAX) {
    return false;
  }

  aiRateLimit[key].count++;
  return true;
}

// Middleware to check rate limits on AI endpoints
function aiRateLimitMiddleware(req, res, next) {
  const identifier = req.ip || req.connection.remoteAddress || 'unknown';
  const endpoint = req.path;

  if (!checkRateLimit(endpoint, identifier)) {
    logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      endpoint,
      identifier,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      limit: RATE_LIMIT_MAX,
      window: `${RATE_LIMIT_WINDOW}ms`
    });
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((aiRateLimit[`${endpoint}:${identifier}`].resetTime - Date.now()) / 1000)
    });
  }

  next();
}

// In-memory announcer metrics (non-persistent)
const announcerMetrics = {
  cache: {
    goals: { hits: 0, misses: 0 },
    penalties: { hits: 0, misses: 0 },
    randomDual: { hits: 0, misses: 0 }
  },
  generation: { goals: 0, penalties: 0, random: 0 },
  timings: { goals: [], penalties: [], random: [] },
  hygiene: { fluffStripped: 0, namesSanitized: 0, conversationsTrimmed: 0 },
  lastReset: Date.now()
};
// Expose for announcerService (non-breaking if not used)
globalThis.__ANNOUNCER_METRICS__ = announcerMetrics;

// Authentication middleware for admin endpoints
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    logger.logSecurityEvent('ADMIN_AUTH_CONFIG_ERROR', {
      endpoint: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(500).json({ error: 'Admin authentication not configured' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.logSecurityEvent('ADMIN_AUTH_MISSING_TOKEN', {
      endpoint: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      hasAuthHeader: !!authHeader
    });
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Admin token required for this endpoint'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (token !== adminToken) {
    logger.logSecurityEvent('ADMIN_AUTH_INVALID_TOKEN', {
      endpoint: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tokenLength: token.length
    });
    return res.status(403).json({
      error: 'Authentication failed',
      message: 'Invalid admin token'
    });
  }

  next();
}

// Input sanitization middleware
function sanitizeInput(req, res, next) {
  // Recursively sanitize string inputs
  function sanitize(obj) {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters and scripts
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  }

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
}

// Apply input sanitization to all routes
app.use(sanitizeInput);

function recordTiming(kind, ms) {
  const arr = announcerMetrics.timings[kind];
  if (!arr) {
    return;
  }
  arr.push(ms);
  if (arr.length > 250) {
    arr.shift();
  }
}
function average(arr) {
  return arr.length ? +(arr.reduce((a,b) => a + b,0) / arr.length).toFixed(1) : 0;
}

// Adaptive line gap heuristic for dual lines (ms)
function computeAdaptiveLineGap({ period, timeRemaining, homeScore, awayScore, contextType } = {}) {
  let base = 180;
  if (contextType === 'random') {
    base = 200;
  }
  if (contextType === 'penalty') {
    base = 190;
  }
  // Parse timeRemaining (MM:SS) -> seconds
  let secondsRem = 0;
  if (typeof timeRemaining === 'string' && /:\d{2}$/.test(timeRemaining)) {
    const [m, s] = timeRemaining.split(':').map(n => parseInt(n, 10));
    if (!isNaN(m) && !isNaN(s)) {
      secondsRem = m * 60 + s;
    }
  }
  const scoreDiff = (typeof homeScore === 'number' && typeof awayScore === 'number') ? Math.abs(homeScore - awayScore) : 99;
  if (period === 3 && secondsRem <= 300 && scoreDiff <= 1) {
    base -= 30;
  } // late & very close
  else if (period === 3 && secondsRem <= 600 && scoreDiff <= 2) {
    base -= 20;
  } // mid-late close
  if (base < 140) {
    base = 140;
  }
  if (base > 260) {
    base = 260;
  }
  return base;
}

function trimConversationLines(conversation, maxLines = 4) {
  if (!Array.isArray(conversation)) {
    return conversation;
  }
  if (conversation.length <= maxLines) {
    return conversation;
  }
  announcerMetrics.hygiene.conversationsTrimmed++;
  return conversation.slice(0, maxLines);
}

async function initializeAnnouncer() {
  try {
    // Light-touch warmup: validate TTS client availability and perform a tiny synthesis with both voices
    const { getAnnouncerVoices } = await import('./voice-config.js');
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
// setTimeout(() => {
//   initializeAnnouncer();
// }, 2000);

// ----- Pre-generation helpers -----
async function preGenerateGoalAssets(gameId) {
  try {
    const goalsContainer = getGoalsContainer();
    const gamesContainer = getGamesContainer();
    let historicalContainer = null;
    try {
      const mod = await import('./cosmosClient.js'); historicalContainer = mod.getHistoricalPlayerStatsContainer?.();
    } catch (_) {}

    const [{ resources: goals }, { resources: gamesByQuery }] = await Promise.all([
      goalsContainer.items.query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC',
        parameters: [{ name: '@gameId', value: gameId }]
      }).fetchAll(),
      gamesContainer.items.query({
        query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      }).fetchAll()
    ]);

    if (!gamesByQuery || gamesByQuery.length === 0 || !goals || goals.length === 0) {
      return;
    }
    const game = gamesByQuery[0];
    const lastGoal = goals[0];

    const homeGoals = goals.filter(g => g.teamName === game.hometeam).length;
    const awayGoals = goals.filter(g => g.teamName === game.awayteam).length;

    const playerName = lastGoal.playerName;
    const playerGoalsThisGame = goals.filter(g => (g.playerName) === playerName).length;

    const goalData = {
      playerName: lastGoal.playerName,
      teamName: lastGoal.teamName || lastGoal.scoringTeam,
      period: lastGoal.period,
      timeRemaining: lastGoal.timeRemaining || lastGoal.time,
      assistedBy: lastGoal.assistedBy || [],
      goalType: lastGoal.goalType || 'even strength',
      homeScore: homeGoals,
      awayScore: awayGoals,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    };

    const playerStats = {
      goalsThisGame: playerGoalsThisGame - 1,
      seasonGoals: playerGoalsThisGame - 1,
      // Career goals baseline (historical + simplistic current season approximation) loaded below
      careerGoalsBefore: null,
      includeCareerLine: false
    };

    // In-memory caches for career lookups (per process)
    if (!globalThis.__CAREER_GOAL_CACHE__) {
      globalThis.__CAREER_GOAL_CACHE__ = new Map();
    }
    if (!globalThis.__CAREER_MENTION_CACHE__) {
      globalThis.__CAREER_MENTION_CACHE__ = new Map();
    } // key: gameId|player
    try {
      const cacheKey = (goalData.playerName || '').toLowerCase();
      let careerBaseline = globalThis.__CAREER_GOAL_CACHE__.get(cacheKey);
      if (careerBaseline == null && historicalContainer) {
        const { resources: histRows } = await historicalContainer.items.query({
          query: 'SELECT c.goals FROM c WHERE c.playerName = @p',
          parameters: [{ name: '@p', value: goalData.playerName }]
        }).fetchAll();
        careerBaseline = histRows.reduce((a,r) => a + (r.goals || 0),0);
        globalThis.__CAREER_GOAL_CACHE__.set(cacheKey, careerBaseline);
      }
      if (careerBaseline != null) {
        playerStats.careerGoalsBefore = careerBaseline + playerStats.seasonGoals; // seasonGoals here is per game so far; approximates if no season container
        const mentionKey = `${gameId}::${cacheKey}`;
        const alreadyMentioned = globalThis.__CAREER_MENTION_CACHE__.has(mentionKey);
        if (!alreadyMentioned && playerStats.careerGoalsBefore >= 5 && Math.random() < 0.3) {
          playerStats.includeCareerLine = true;
          globalThis.__CAREER_MENTION_CACHE__.set(mentionKey, true);
        }
      }
    } catch (_) { /* ignore career enrichment errors */ }

    const entry = announcerCache.goals.get(gameId) || { single: {} };
    entry.lastGoalId = lastGoal.id || lastGoal._rid || String(Date.now());

    // Prepare single announcer male/female (text + audio)
    const { getAnnouncerVoices } = await import('./voice-config.js');
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

    // Prepare dual conversation (trim to 4 lines) and attach synthetic minimal inter-line delay metadata
    try {
      const convo = await generateDualGoalAnnouncement(goalData, playerStats);
      const gap = computeAdaptiveLineGap({
        period: goalData.period,
        timeRemaining: goalData.timeRemaining,
        homeScore: goalData.homeScore,
        awayScore: goalData.awayScore,
        contextType: 'goal'
      });
      entry.dual = { conversation: trimConversationLines(convo, 4), updatedAt: Date.now(), lineGapMs: gap };
      logger.info('Pre-generated dual goal conversation', { gameId, lineGapMs: gap, lines: entry.dual.conversation.length });
      announcerMetrics.generation.goals++;
    } catch (_) { /* ignore */ }

    // Opportunistically pre-generate a fresh random dual commentary (used if user triggers random)
    try {
      if (generateDualRandomCommentary) {
        const randomKey = `${gameId}-random-${Date.now()}`;
        const randomConvo = await generateDualRandomCommentary(gameId, { context: 'post-goal', homeTeam: game.hometeam, awayTeam: game.awayteam });
        const randomGap = computeAdaptiveLineGap({ contextType: 'random', period: goalData.period, timeRemaining: goalData.timeRemaining });
        announcerCache.randomDual.set(randomKey, { conversation: trimConversationLines(randomConvo, 4), updatedAt: Date.now(), lineGapMs: randomGap });
        // Keep the map from growing unbounded: prune oldest after 10
        if (announcerCache.randomDual.size > 10) {
          const oldestKey = Array.from(announcerCache.randomDual.entries()).sort((a,b) => a[1].updatedAt - b[1].updatedAt)[0][0];
          announcerCache.randomDual.delete(oldestKey);
        }
      }
    } catch (_) { /* ignore random pregen errors */ }

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
        query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC',
        parameters: [{ name: '@gameId', value: gameId }]
      }).fetchAll(),
      gamesContainer.items.query({
        query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      }).fetchAll(),
      goalsContainer.items.query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      }).fetchAll()
    ]);

    if (!gamesByQuery || gamesByQuery.length === 0 || !penalties || penalties.length === 0) {
      return;
    }
    const game = gamesByQuery[0];
    const lastPenalty = penalties[0];

    const homeGoals = goals.filter(g => g.teamName === game.hometeam).length;
    const awayGoals = goals.filter(g => g.teamName === game.awayteam).length;

    const penaltyData = {
      playerName: lastPenalty.playerName,
      teamName: lastPenalty.teamName,
      penaltyType: lastPenalty.penaltyType,
      period: lastPenalty.period,
      timeRemaining: lastPenalty.timeRemaining,
      length: lastPenalty.length || 2
    };

    const gameContext = {
      homeTeam: game.hometeam,
      awayTeam: game.awayteam,
      currentScore: { home: homeGoals, away: awayGoals }
    };

    const entry = announcerCache.penalties.get(gameId) || { single: {} };
    entry.lastPenaltyId = lastPenalty.id || lastPenalty._rid || String(Date.now());

    const { getAnnouncerVoices } = await import('./voice-config.js');
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
      const gap = computeAdaptiveLineGap({
        period: penaltyData.period,
        timeRemaining: penaltyData.timeRemaining,
        homeScore: gameContext.currentScore.home,
        awayScore: gameContext.currentScore.away,
        contextType: 'penalty'
      });
      entry.dual = { conversation: trimConversationLines(convo, 4), updatedAt: Date.now(), lineGapMs: gap };
      logger.info('Pre-generated dual penalty conversation', { gameId, lineGapMs: gap, lines: entry.dual.conversation.length });
      // Second pass refinement similar to goal pre-generation
      setTimeout(async () => {
        try {
          const refined = await generateDualPenaltyAnnouncement(penaltyData, gameContext);
          const refinedGap = computeAdaptiveLineGap({
            period: penaltyData.period,
            timeRemaining: penaltyData.timeRemaining,
            homeScore: gameContext.currentScore.home,
            awayScore: gameContext.currentScore.away,
            contextType: 'penalty'
          });
          entry.dual = { conversation: trimConversationLines(refined, 4), updatedAt: Date.now(), lineGapMs: refinedGap };
          announcerCache.penalties.set(gameId, entry);
          logger.info('Refined dual penalty conversation', { gameId, lineGapMs: refinedGap });
        } catch (_) { /* ignore refinement */ }
      }, 1500);
    } catch (_) { /* ignore */ }

    announcerCache.penalties.set(gameId, entry);
  } catch (_) { /* ignore */ }
}

async function preGenerateRandomDual(key, gameContext) {
  try {
    if (!generateDualRandomCommentary) {
      return;
    }
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
    const buildTime = deploymentTime.toLocaleString('en-US', {
      timeZone: 'America/New_York',
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
      buildTime,
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
app.post('/api/admin/update-deployment-time', requireAdminAuth, (req, res) => {
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
    // Check if database is configured - if not, return demo data
    const { getDatabase } = await import('./cosmosClient.js');
    let db = null;
    try {
      db = getDatabase();
    } catch (error) {
      logger.warn('Database not configured, returning demo games');
    }

    if (!db) {
      // Return demo games data
      const demoGames = [
        {
          id: 'demo-game-1',
          division: 'Gold',
          homeTeam: 'Demo Team A',
          awayTeam: 'Demo Team B',
          homeScore: 3,
          awayScore: 2,
          gameDate: new Date().toISOString(),
          status: 'completed',
          submittedAt: new Date().toISOString()
        },
        {
          id: 'demo-game-2',
          division: 'Silver',
          homeTeam: 'Demo Team C',
          awayTeam: 'Demo Team D',
          homeScore: 1,
          awayScore: 1,
          gameDate: new Date().toISOString(),
          status: 'completed',
          submittedAt: new Date().toISOString()
        }
      ];

      const filteredGames = division.toLowerCase() === 'all' ? demoGames :
        demoGames.filter(game => game.division.toLowerCase() === division.toLowerCase());

      return res.json(filteredGames);
    }

    const container = getGamesContainer();


    let querySpec;

    if (division.toLowerCase() === 'all') {
      // Return all games
      querySpec = {
        query: 'SELECT * FROM c',
        parameters: []
      };
      // Query for all games
    } else {
      // Return games for specific division only
      querySpec = {
        query: 'SELECT * FROM c WHERE LOWER(c.division) = LOWER(@division)',
        parameters: [
          { name: '@division', value: division }
        ]
      };
      // Query for specific division
    }

    const { resources: games } = await container.items.query(querySpec).fetchAll();

    // Enhanced response with metadata for production
    const responseData = {
      success: true,
      games,
      meta: {
        count: games.length,
        division,
        requestId,
        timestamp: new Date().toISOString(),
        queryVersion: v || '1',
        serverVersion: pkg.version
      }
    };

    // Return games array directly for backward compatibility, but log structured response
    logger.info('Games API Response', {
      endpoint: '/api/games',
      count: games.length,
      requestId
    });
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
        query: 'SELECT * FROM c WHERE c.eventType = \'game-submission\'',
        parameters: []
      })
      .fetchAll();

    // For each submission, get the corresponding game data
    const submittedGames = [];
    for (const submission of submissions) {
      try {
        const { resources: gameQuery } = await gamesContainer.items
          .query({
            query: 'SELECT * FROM c WHERE c.id = @gameId',
            parameters: [{ name: '@gameId', value: submission.gameId }]
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
    // Check if database is configured - if not, return demo data
    const { getDatabase } = await import('./cosmosClient.js');
    let db = null;
    try {
      db = getDatabase();
    } catch (error) {
      logger.warn('Database not available, returning demo rosters');
    }

    if (!db) {
      logger.warn('Database not available, returning demo rosters');

      // Return demo rosters data
      const demoRosters = [
        {
          teamName: 'Demo Team A',
          division: 'Gold',
          season: '2024',
          players: [
            { playerId: 'p1', name: 'Player One', position: 'Forward' },
            { playerId: 'p2', name: 'Player Two', position: 'Defense' },
            { playerId: 'p3', name: 'Player Three', position: 'Goalie' }
          ]
        },
        {
          teamName: 'Demo Team B',
          division: 'Silver',
          season: '2024',
          players: [
            { playerId: 'p4', name: 'Player Four', position: 'Forward' },
            { playerId: 'p5', name: 'Player Five', position: 'Defense' },
            { playerId: 'p6', name: 'Player Six', position: 'Goalie' }
          ]
        }
      ];

      let filteredRosters = demoRosters;

      if (teamName) {
        filteredRosters = filteredRosters.filter(roster => roster.teamName === teamName);
      }
      if (division) {
        filteredRosters = filteredRosters.filter(roster => roster.division === division);
      }
      if (season) {
        filteredRosters = filteredRosters.filter(roster => roster.season === season);
      }

      return res.json(filteredRosters);
    }

    const rostersContainer = getRostersContainer();
    const gamesContainer = getGamesContainer();

    // If gameId is provided, look up the game and fetch the rosters for its teams
    if (gameId) {
      const gameQuery = {
        query: 'SELECT * FROM c WHERE c.id = @id OR c.gameId = @id',
        parameters: [{ name: '@id', value: gameId }]
      };

      const { resources: games } = await gamesContainer.items.query(gameQuery).fetchAll();
      if (games.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = games[0];
      const homeTeam = game.hometeam || game.homeTeam || game.homeTeamId;
      const awayTeam = game.awayteam || game.awayTeam || game.awayTeamId;

      // Use case-insensitive query for team names
      const rosterQuery = {
        query: 'SELECT * FROM c WHERE LOWER(c.teamName) IN (LOWER(@home), LOWER(@away))',
        parameters: [
          { name: '@home', value: homeTeam },
          { name: '@away', value: awayTeam }
        ]
      };

      const { resources: rosterResults } = await rostersContainer.items.query(rosterQuery).fetchAll();

      // Return 404 with helpful message if rosters are missing
      if (rosterResults.length === 0) {
        return res.status(404).json({
          error: 'No rosters found for game teams',
          gameId,
          teams: { home: homeTeam, away: awayTeam },
          message: 'Check that roster data exists for both teams'
        });
      }

      if (rosterResults.length < 2) {
        const foundTeams = rosterResults.map(r => r.teamName);
        const missingTeams = [homeTeam, awayTeam].filter(t =>
          !foundTeams.some(f => f.toLowerCase() === t.toLowerCase())
        );
        return res.status(404).json({
          error: 'Incomplete roster data',
          gameId,
          foundTeams,
          missingTeams,
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
        parameters: []
      };
    } else {
      // Build dynamic query based on provided filters
      const conditions = [];
      const parameters = [];

      if (teamName) {
        conditions.push('c.teamName = @teamName');
        parameters.push({ name: '@teamName', value: teamName });
      }

      if (season) {
        // Handle both old format ("2025 Fall") and new structured queries
        const seasonParts = season.trim().split(/\s+/);
        if (seasonParts.length === 2) {
          // New format: parse year and seasonType
          const year = parseInt(seasonParts[0]);
          const seasonType = seasonParts[1];
          conditions.push('(c.season = @season OR (c.year = @year AND LOWER(c.seasonType) = LOWER(@seasonType)))');
          parameters.push({ name: '@season', value: season });
          parameters.push({ name: '@year', value: year });
          parameters.push({ name: '@seasonType', value: seasonType });
        } else {
          // Old format or single value
          conditions.push('c.season = @season');
          parameters.push({ name: '@season', value: season });
        }
      }

      if (division) {
        conditions.push('LOWER(c.division) = LOWER(@division)');
        parameters.push({ name: '@division', value: division });
      }

      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters
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

    // Import validation functions
    const { validateRosterData, generatePlayerId } = await import('./eventValidation.js');

    // Validate roster data
    const validationErrors = await validateRosterData({
      teamName,
      season,
      division,
      players
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Parse season format (e.g., "2025 Fall" -> year: 2025, seasonType: "Fall")
    const seasonParts = season.trim().split(/\s+/);
    const year = seasonParts[0];
    const seasonType = seasonParts[1] || 'Fall'; // Default to Fall if not specified

    const container = getRostersContainer();
    const rosterDoc = {
      id: `${teamName.replace(/\s+/g, '_').toLowerCase()}_${year}_${seasonType.toLowerCase()}`,
      teamName,
      season, // Keep original format for backward compatibility
      year: parseInt(year),
      seasonType,
      division,
      players: players.map(player => ({
        name: player.name,
        firstName: player.firstName || player.name.split(' ')[0],
        lastName: player.lastName || player.name.split(' ').slice(1).join(' '),
        jerseyNumber: player.jerseyNumber,
        position: player.position || 'Player',
        playerId: player.playerId || generatePlayerId(teamName, player.name)
      })),
      totalPlayers: players.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await container.items.create(rosterDoc);

    res.status(201).json({
      success: true,
      roster: resource
    });
  } catch (error) {
    console.error('Error creating roster:', error);
    res.status(500).json({
      error: 'Failed to create roster',
      details: error.message
    });
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
          ? 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.sequenceNumber ASC'
          : 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: gameId ? [{ name: '@gameId', value: gameId }] : []
      }
      : null;

    const penaltiesQuery = wantsPenalties
      ? {
        query: gameId
          ? 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.sequenceNumber ASC'
          : 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: gameId ? [{ name: '@gameId', value: gameId }] : []
      }
      : null;

    // Run allowed queries in parallel
    const [goalsResult, penaltiesResult] = await Promise.all([
      goalsQuery ? goalsContainer.items.query(goalsQuery).fetchAll() : Promise.resolve({ resources: [] }),
      penaltiesQuery ? penaltiesContainer.items.query(penaltiesQuery).fetchAll() : Promise.resolve({ resources: [] })
    ]);

    // Normalize payloads and include eventType for consumers
    const normalizeRecordedAt = (item) =>
      item.recordedAt || (item._ts ? new Date(item._ts * 1000).toISOString() : new Date(0).toISOString());

    const goals = (goalsResult.resources || []).map((g) => ({
      eventType: 'goal',
      ...g,
      recordedAt: normalizeRecordedAt(g),
      // Ensure standardized fields are present
      playerName: g.playerName || g.scorer || '',
      teamName: g.teamName || g.scoringTeam || '',
      timeRemaining: g.timeRemaining || g.time || '',
      assistedBy: g.assistedBy || g.assists || [],
      gameMetadata: g.gameMetadata || {},
      sequenceNumber: g.sequenceNumber || 0,
      playerId: g.playerId || null
    }));

    const penalties = (penaltiesResult.resources || []).map((p) => ({
      eventType: 'penalty',
      ...p,
      recordedAt: normalizeRecordedAt(p),
      // Ensure standardized fields are present
      playerName: p.playerName || p.penalizedPlayer || '',
      teamName: p.teamName || p.penalizedTeam || '',
      timeRemaining: p.timeRemaining || p.time || '',
      penaltyLength: p.penaltyLength || p.length || 0,
      infraction: p.infraction || p.penaltyType || '',
      servedBy: p.servedBy || p.playerName || '',
      gameMetadata: p.gameMetadata || {},
      sequenceNumber: p.sequenceNumber || 0,
      playerId: p.playerId || null
    }));

    // Merge and sort by sequenceNumber ASC (chronological order)
    const events = [...goals, ...penalties].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));

    res.status(200).json({
      success: true,
      events,
      total: events.length,
      gameId: gameId || null
    });
  } catch (error) {
    console.error('Error fetching game events:', error);
    res.status(500).json({
      error: 'Failed to fetch game events',
      details: error.message
    });
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
  const {
    gameId,
    teamName,
    playerName,
    period,
    timeRemaining,
    assistedBy,
    shotType,
    goalType,
    breakaway,
    gameContext,
    playerId
  } = req.body;

  // Input validation
  if (!gameId || !teamName || !playerName || !period || !timeRemaining) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, teamName, playerName, period, timeRemaining.',
      received: req.body
    });
  }

  try {
    // Import validation functions
    const { validateGoalEvent, getNextSequenceNumber, generatePlayerId } = await import('./eventValidation.js');

    // Validate the goal event
    const validationErrors = await validateGoalEvent({
      gameId,
      teamName,
      playerName,
      period,
      timeRemaining
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const container = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    const rostersContainer = getRostersContainer();

    // Get game information for embedded metadata
    let gameMetadata = {};
    try {
      const gameInfoQuery = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      };
      const { resources: gameInfo } = await gamesContainer.items.query(gameInfoQuery).fetchAll();
      if (gameInfo.length > 0) {
        const game = gameInfo[0];
        gameMetadata = {
          division: game.division || game.league || 'Unknown',
          season: game.season || 'Unknown',
          year: game.year || new Date().getFullYear(),
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          gameDate: game.gameDate || game.scheduledDate
        };
      }
    } catch (error) {
      console.warn('Could not fetch game metadata:', error.message);
    }

    // Get player ID from roster if not provided
    let finalPlayerId = playerId;
    if (!finalPlayerId) {
      try {
        const rosterQuery = {
          query: 'SELECT * FROM c WHERE c.teamName = @teamName',
          parameters: [{ name: '@teamName', value: teamName }]
        };
        const { resources: rosters } = await rostersContainer.items.query(rosterQuery).fetchAll();

        if (rosters.length > 0) {
          const roster = rosters[0];
          const player = roster.players.find(p => p.name === playerName);
          if (player && player.playerId) {
            finalPlayerId = player.playerId;
          } else {
            // Generate new player ID if not found
            finalPlayerId = generatePlayerId(teamName, playerName);
          }
        }
      } catch (error) {
        console.warn('Could not get player ID from roster:', error.message);
        finalPlayerId = generatePlayerId(teamName, playerName);
      }
    }

    // Get sequence number for this game
    const sequenceNumber = await getNextSequenceNumber(gameId);

    // Get existing goals for analytics
    const existingGoalsQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: existingGoals } = await container.items.query(existingGoalsQuery).fetchAll();

    // Calculate current score
    const scoreByTeam = {};
    existingGoals.forEach(goal => {
      const team = goal.teamName;
      scoreByTeam[team] = (scoreByTeam[team] || 0) + 1;
    });

    const opponentTeam = gameMetadata.homeTeam === teamName ? gameMetadata.awayTeam : gameMetadata.homeTeam;
    const scoreBeforeGoal = {
      [teamName]: scoreByTeam[teamName] || 0,
      [opponentTeam]: scoreByTeam[opponentTeam] || 0
    };
    const scoreAfterGoal = {
      ...scoreBeforeGoal,
      [teamName]: scoreBeforeGoal[teamName] + 1
    };

    // Determine goal context
    const goalSequenceNumber = existingGoals.length + 1;
    let goalContext = 'Regular goal';
    if (goalSequenceNumber === 1) {
      goalContext = 'First goal of game';
    } else if (scoreBeforeGoal[teamName] < scoreBeforeGoal[opponentTeam] &&
               scoreAfterGoal[teamName] === scoreBeforeGoal[opponentTeam]) {
      goalContext = 'Tying goal';
    } else if (scoreBeforeGoal[teamName] <= scoreBeforeGoal[opponentTeam]) {
      goalContext = 'Go-ahead goal';
    } else if (scoreBeforeGoal[teamName] > scoreBeforeGoal[opponentTeam]) {
      goalContext = 'Insurance goal';
    }

    const goal = {
      id: `${gameId}-goal-${Date.now()}`,
      eventType: 'goal',
      gameId,
      sequenceNumber,
      gameMetadata,
      teamName,
      playerName,
      playerId: finalPlayerId,
      period,
      timeRemaining,
      assistedBy: Array.isArray(assistedBy) ? assistedBy : (assistedBy ? [assistedBy] : []),
      shotType: shotType || 'wrist_shot',
      goalType: goalType || 'even_strength',
      breakaway: breakaway || false,
      recordedAt: new Date().toISOString(),
      gameStatus: 'in-progress',

      // Enhanced analytics
      analytics: {
        goalSequenceNumber,
        goalContext,
        scoreBeforeGoal,
        scoreAfterGoal,
        leadDeficitBefore: scoreBeforeGoal[teamName] - scoreBeforeGoal[opponentTeam],
        leadDeficitAfter: scoreAfterGoal[teamName] - scoreAfterGoal[opponentTeam],
        totalGoalsInGame: goalSequenceNumber,
        gameSituation: period > 3 ? 'Overtime' : 'Regular',
        absoluteTimestamp: new Date().toISOString(),
        ...(gameContext || {})
      }
    };

    const { resource } = await container.items.create(goal);

    // Kick off background pre-generation for announcer assets
    // preGenerateGoalAssets(gameId);
    // setTimeout(() => preGenerateGoalAssets(gameId), 1500);

    res.status(201).json({
      success: true,
      goal: resource
    });
  } catch (error) {
    console.error('❌ Error creating goal:', error.message);
    handleError(res, error);
  }
});

// Add the `/api/penalties` POST endpoint for creating penalties
app.post('/api/penalties', async (req, res) => {
  console.log('🚨 Recording penalty...');

  const {
    gameId,
    teamName,
    playerName,
    period,
    timeRemaining,
    penaltyType,
    penaltyLength,
    infraction,
    servedBy,
    gameContext,
    playerId
  } = req.body;

  // Input validation
  if (!gameId || !teamName || !playerName || !period || !timeRemaining || !penaltyType || !penaltyLength) {
    return res.status(400).json({
      error: 'Invalid payload. Required: gameId, teamName, playerName, period, timeRemaining, penaltyType, penaltyLength.',
      received: req.body
    });
  }

  try {
    // Import validation functions
    const { validatePenaltyEvent, getNextSequenceNumber, generatePlayerId } = await import('./eventValidation.js');

    // Validate the penalty event
    const validationErrors = await validatePenaltyEvent({
      gameId,
      teamName,
      playerName,
      period,
      timeRemaining,
      penaltyType,
      penaltyLength
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const container = getPenaltiesContainer();
    const gamesContainer = getGamesContainer();
    const rostersContainer = getRostersContainer();

    // Get game information for embedded metadata
    let gameMetadata = {};
    try {
      const gameInfoQuery = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      };
      const { resources: gameInfo } = await gamesContainer.items.query(gameInfoQuery).fetchAll();
      if (gameInfo.length > 0) {
        const game = gameInfo[0];
        gameMetadata = {
          division: game.division || game.league || 'Unknown',
          season: game.season || 'Unknown',
          year: game.year || new Date().getFullYear(),
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          gameDate: game.gameDate || game.scheduledDate
        };
      }
    } catch (error) {
      console.warn('Could not fetch game metadata:', error.message);
    }

    // Get player ID from roster if not provided
    let finalPlayerId = playerId;
    if (!finalPlayerId) {
      try {
        const rosterQuery = {
          query: 'SELECT * FROM c WHERE c.teamName = @teamName',
          parameters: [{ name: '@teamName', value: teamName }]
        };
        const { resources: rosters } = await rostersContainer.items.query(rosterQuery).fetchAll();

        if (rosters.length > 0) {
          const roster = rosters[0];
          const player = roster.players.find(p => p.name === playerName);
          if (player && player.playerId) {
            finalPlayerId = player.playerId;
          } else {
            // Generate new player ID if not found
            finalPlayerId = generatePlayerId(teamName, playerName);
          }
        }
      } catch (error) {
        console.warn('Could not get player ID from roster:', error.message);
        finalPlayerId = generatePlayerId(teamName, playerName);
      }
    }

    // Get sequence number for this game
    const sequenceNumber = await getNextSequenceNumber(gameId);

    // Get existing penalties for analytics
    const existingPenaltiesQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt ASC',
      parameters: [{ name: '@gameId', value: gameId }]
    };
    const { resources: existingPenalties } = await container.items.query(existingPenaltiesQuery).fetchAll();

    // Calculate penalty analytics
    const penaltySequenceNumber = existingPenalties.length + 1;
    const teamPenalties = existingPenalties.filter(p => p.teamName === teamName).length + 1;

    // Determine penalty context
    let penaltyContext = 'Regular penalty';
    if (penaltySequenceNumber === 1) {
      penaltyContext = 'First penalty of game';
    } else if (teamPenalties === 1) {
      penaltyContext = 'First penalty for team';
    }

    const penalty = {
      id: `${gameId}-penalty-${Date.now()}`,
      eventType: 'penalty',
      gameId,
      sequenceNumber,
      gameMetadata,
      teamName,
      playerName,
      playerId: finalPlayerId,
      period,
      timeRemaining,
      penaltyType,
      penaltyLength,
      infraction: infraction || penaltyType,
      servedBy: servedBy || playerName,
      recordedAt: new Date().toISOString(),
      gameStatus: 'in-progress',

      // Enhanced analytics
      analytics: {
        penaltySequenceNumber,
        penaltyContext,
        teamPenaltyCount: teamPenalties,
        totalPenaltiesInGame: penaltySequenceNumber,
        gameSituation: period > 3 ? 'Overtime' : 'Regular',
        absoluteTimestamp: new Date().toISOString(),
        ...(gameContext || {})
      }
    };

    const { resource } = await container.items.create(penalty);
    console.log('✅ Penalty recorded successfully with enhanced metadata');

    // Kick off background pre-generation for announcer assets
    // preGeneratePenaltyAssets(gameId);
    // setTimeout(() => preGeneratePenaltyAssets(gameId), 1500);

    res.status(201).json({
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
        parameters: []
      };
    } else {
      // Build dynamic query based on provided filters
      const conditions = [];
      const parameters = [];

      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }

      if (team) {
        conditions.push('c.scoringTeam = @team');
        parameters.push({ name: '@team', value: team });
      }

      if (playerId) {
        conditions.push('c.playerName = @playerId');
        parameters.push({ name: '@playerId', value: playerId });
      }

      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.recordedAt DESC`,
        parameters
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
app.post('/api/goals/announce-last', aiRateLimitMiddleware, async (req, res) => {
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
  const { getAnnouncerVoices, logTtsUse } = await import('./voice-config.js');
  const voiceConfig = await getAnnouncerVoices();

  const selectedVoice = voiceGender === 'male' ? voiceConfig.maleVoice : voiceConfig.femaleVoice;

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
        query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    // Get game details for context
    let game;

    // Use query lookup since direct lookup doesn't work with partition key
    const { resources: gamesByQuery } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
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

    // Calculate current score after this goal
    const homeGoals = goals.filter(g => g.teamName === game.homeTeam).length;
    const awayGoals = goals.filter(g => g.teamName === game.awayTeam).length;

    // Get all goals by this player in this game for stats
    const playerName = lastGoal.playerName;
    const playerGoalsThisGame = goals.filter(g => (g.playerName) === playerName).length;

    // Prepare goal data for announcement
    const goalData = {
      playerName: lastGoal.playerName,
      teamName: lastGoal.teamName || lastGoal.scoringTeam,
      period: lastGoal.period,
      timeRemaining: lastGoal.timeRemaining || lastGoal.time,
      assistedBy: lastGoal.assistedBy || [],
      goalType: lastGoal.goalType || 'even strength',
      homeScore: homeGoals,
      awayScore: awayGoals,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    };

    const playerStats = {
      goalsThisGame: playerGoalsThisGame - 1, // Subtract 1 since we're announcing this goal
      seasonGoals: playerGoalsThisGame - 1, // For now, use game stats as season stats
      careerGoalsBefore: null,
      includeCareerLine: false
    };

    // Career enrichment (same logic as pregen if not cached)
    try {
      let historicalContainer = null;
      try {
        const mod = await import('./cosmosClient.js'); historicalContainer = mod.getHistoricalPlayerStatsContainer?.();
      } catch (_) {}
      if (historicalContainer) {
        if (!globalThis.__CAREER_GOAL_CACHE__) {
          globalThis.__CAREER_GOAL_CACHE__ = new Map();
        }
        if (!globalThis.__CAREER_MENTION_CACHE__) {
          globalThis.__CAREER_MENTION_CACHE__ = new Map();
        }
        const cacheKey = (goalData.playerName || '').toLowerCase();
        let careerBaseline = globalThis.__CAREER_GOAL_CACHE__.get(cacheKey);
        if (careerBaseline == null) {
          const { resources: histRows } = await historicalContainer.items.query({
            query: 'SELECT c.goals FROM c WHERE c.playerName = @p',
            parameters: [{ name: '@p', value: goalData.playerName }]
          }).fetchAll();
          careerBaseline = histRows.reduce((a,r) => a + (r.goals || 0),0);
          globalThis.__CAREER_GOAL_CACHE__.set(cacheKey, careerBaseline);
        }
        playerStats.careerGoalsBefore = careerBaseline + playerStats.seasonGoals;
        const mentionKey = `${gameId}::${cacheKey}`;
        const alreadyMentioned = globalThis.__CAREER_MENTION_CACHE__.has(mentionKey);
        if (!alreadyMentioned && playerStats.careerGoalsBefore >= 5 && Math.random() < 0.3) {
          playerStats.includeCareerLine = true;
          globalThis.__CAREER_MENTION_CACHE__.set(mentionKey, true);
        }
      }
    } catch (_) { /* ignore */ }

    // Try to serve from cache only if it matches the most recent goal id
    const latestGoalId = lastGoal.id || lastGoal._rid;
    const cached = announcerCache.goals.get(gameId);
    if (cached && cached.lastGoalId === latestGoalId) {
      if (announcerMode === 'dual' && cached.dual?.conversation) {
        announcerMetrics.cache.goals.hits++; // metrics
        return res.status(200).json({
          success: true,
          cached: true,
          goal: lastGoal,
          conversation: cached.dual.conversation,
          lineGapMs: cached.dual.lineGapMs || 180,
          goalData,
          playerStats
        });
      }
      // Only use single-mode cache if the cached voice matches the currently selected voice id
      const { getAnnouncerVoices } = await import('./voice-config.js');
      const voices = await getAnnouncerVoices();
      const requestedVoiceId = voiceGender === 'male' ? voices.maleVoice : voices.femaleVoice;
      if (announcerMode !== 'dual' && cached.single?.[voiceGender]?.text && (!cached.single[voiceGender].voice || cached.single[voiceGender].voice === requestedVoiceId)) {
        announcerMetrics.cache.goals.hits++;
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
    } else {
      announcerMetrics.cache.goals.misses++;
      // If we have a cached entry but it's stale, queue a background refresh (will overwrite after response)
      // if (cached && cached.lastGoalId !== latestGoalId) {
      //   setTimeout(() => preGenerateGoalAssets(gameId), 50);
      // }
    }

    if (announcerMode === 'dual') {
      // Generate dual announcer conversation (adaptive gap)
      const lineGapMs = computeAdaptiveLineGap({
        period: goalData.period,
        timeRemaining: goalData.timeRemaining,
        homeScore: goalData.homeScore,
        awayScore: goalData.awayScore,
        contextType: 'goal'
      });
      const conversation = trimConversationLines(await generateDualGoalAnnouncement(goalData, playerStats), 4);

      console.log('✅ Dual goal announcement generated successfully');
      // update cache (ensure lastGoalId set)
      const entry = announcerCache.goals.get(gameId) || { single: {} };
      entry.lastGoalId = latestGoalId;
      entry.dual = { conversation, updatedAt: Date.now(), lineGapMs };
      announcerCache.goals.set(gameId, entry);
      announcerMetrics.generation.goals++;

      res.status(200).json({
        success: true,
        goal: lastGoal,
        conversation,
        lineGapMs,
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

      // update cache (ensure lastGoalId set)
      const entry = announcerCache.goals.get(gameId) || { single: {} };
      entry.lastGoalId = latestGoalId;
      entry.single[voiceGender] = { text: announcementText, audioPath: audioFilename, voice: selectedVoice, updatedAt: Date.now() };
      announcerCache.goals.set(gameId, entry);
      announcerMetrics.generation.goals++;

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
app.post('/api/penalties/announce-last', aiRateLimitMiddleware, async (req, res) => {
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
  const { getAnnouncerVoices, logTtsUse } = await import('./voice-config.js');
  const voiceConfig = await getAnnouncerVoices();

  const selectedVoice = voiceGender === 'male' ? voiceConfig.maleVoice : voiceConfig.femaleVoice;

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
        query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    // Get game details for context
    let game;

    // Use query lookup since direct lookup doesn't work with partition key
    const { resources: gamesByQuery } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
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
        query: 'SELECT * FROM c WHERE c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    const homeGoals = goals.filter(g => g.teamName === game.homeTeam).length;
    const awayGoals = goals.filter(g => g.teamName === game.awayTeam).length;

    // Prepare penalty data for announcement
    const penaltyData = {
      playerName: lastPenalty.playerName,
      teamName: lastPenalty.teamName,
      penaltyType: lastPenalty.penaltyType,
      period: lastPenalty.period,
      timeRemaining: lastPenalty.timeRemaining,
      length: lastPenalty.length || 2
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
      const { getAnnouncerVoices } = await import('./voice-config.js');
      const voices = await getAnnouncerVoices();
      const requestedVoiceId = voiceGender === 'male' ? voices.maleVoice : voices.femaleVoice;
      if (announcerMode !== 'dual' && cached.single?.[voiceGender]?.text && (!cached.single[voiceGender].voice || cached.single[voiceGender].voice === requestedVoiceId)) {
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
app.post('/api/randomCommentary', aiRateLimitMiddleware, async (req, res) => {
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
      const gameContext = { gameId, division };

      // Try to get database context, but provide fallback if database is not available
      try {
        const goalsContainer = getGoalsContainer();
        const penaltiesContainer = getPenaltiesContainer();
        const gamesContainer = getGamesContainer();

        if (gameId) {
          // Get game details
          const { resources: gameDetails } = await gamesContainer.items
            .query({
              query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
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
              query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC',
              parameters: [{ name: '@gameId', value: gameId }]
            })
            .fetchAll();

          const { resources: penalties } = await penaltiesContainer.items
            .query({
              query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c._ts DESC',
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
        announcerMetrics.cache.randomDual.hits++;
        conversation = cached.conversation;
      } else {
        announcerMetrics.cache.randomDual.misses++;
        // Generate the dual announcer conversation
        console.log('🎙️ Calling generateDualRandomCommentary with context:', gameContext);
        const genStart = Date.now();
        conversation = await generateDualRandomCommentary(gameId, gameContext);
        recordTiming('random', Date.now() - genStart);
        announcerMetrics.generation.random++;
        conversation = trimConversationLines(conversation, 4);
      }
      // Pre-generate the next one in background
      // preGenerateRandomDual(key, gameContext);
      console.log('🎙️ Received conversation from generateDualRandomCommentary:', conversation?.length, 'lines');

      console.log('✅ Dual random commentary conversation generated successfully');

      const adaptiveGap = computeAdaptiveLineGap({
        period: gameContext.period,
        timeRemaining: gameContext.timeRemaining,
        homeScore: gameContext.currentScore?.home,
        awayScore: gameContext.currentScore?.away,
        contextType: 'random'
      });
      res.status(200).json({
        success: true,
        type: 'dual_conversation',
        conversation,
        lineGapMs: adaptiveGap,
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
        query: 'SELECT * FROM c WHERE c.id = \'voiceConfig\'',
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

// Announcer metrics endpoint (lightweight diagnostics)
app.get('/api/announcer/metrics', (req, res) => {
  const { cache, generation, timings, hygiene, lastReset } = announcerMetrics;
  res.json({
    cache,
    generation,
    hygiene,
    averages: {
      goalsMs: average(timings.goals),
      penaltiesMs: average(timings.penalties),
      randomMs: average(timings.random)
    },
    samples: {
      goals: timings.goals.length,
      penalties: timings.penalties.length,
      random: timings.random.length
    },
    since: new Date(lastReset).toISOString()
  });
});

// Helper functions for random commentary generation
async function generateGameSpecificCommentary(goalsContainer, penaltiesContainer, gamesContainer, gameId) {
  try {
    // Get game details first
    const { resources: gameDetails } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
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
        query: 'SELECT * FROM c WHERE c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    // Get penalties for this game
    const { resources: gamePenalties } = await penaltiesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    // Generate commentary based on current game state
    const templates = [];

    if (gameGoals.length > 0) {
      const recentGoal = gameGoals[gameGoals.length - 1];
      const scorer = recentGoal.playerName || 'a player';
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
    templates.push('The intensity is building between these two teams!');

    if (gameGoals.length === 0) {
      templates.push('Both goaltenders are standing on their heads - no goals scored yet!');
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
        query: 'SELECT * FROM c WHERE c._ts > @timestamp',
        parameters: [{ name: '@timestamp', value: Math.floor(sevenDaysAgo.getTime() / 1000) }]
      })
      .fetchAll();

    // Count goals by player
    const playerGoals = {};
    recentGoals.forEach(goal => {
      const player = goal.playerName;
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
        query: 'SELECT * FROM c'
      })
      .fetchAll();

    // Count total goals by player
    const playerTotals = {};
    allGoals.forEach(goal => {
      const player = goal.playerName;
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
        query: 'SELECT * FROM c WHERE c.eventType = \'game-submission\' ORDER BY c._ts DESC'
      })
      .fetchAll();

    if (recentGames.length >= 2) {
      const recentGame = recentGames[0];
      const templates = [
        `Earlier today, ${recentGame.gameSummary?.goalsByTeam ? Object.keys(recentGame.gameSummary.goalsByTeam)[0] : 'a team'} put up a strong performance!`,
        'The competition has been intense across all matchups this week!',
        'Teams are battling for playoff position in every game!'
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
        query: 'SELECT COUNT(1) as totalGoals FROM c'
      })
      .fetchAll();

    const { resources: allPenalties } = await penaltiesContainer.items
      .query({
        query: 'SELECT COUNT(1) as totalPenalties FROM c'
      })
      .fetchAll();

    const totalGoals = allGoals[0]?.totalGoals || 0;
    const totalPenalties = allPenalties[0]?.totalPenalties || 0;

    const facts = [
      `Over ${totalGoals} goals have been scored this season!`,
      `Players have accumulated ${totalPenalties} penalty minutes so far!`,
      'Hockey is a game of speed, skill, and determination!',
      'Every shift could be the difference maker in this game!',
      'The pace of play keeps getting faster every season!'
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
      query: 'SELECT * FROM c WHERE c.eventType = \'game-submission\' AND c.gameId = @gameId',
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
    const currentSeason = '2025 Fall'; // Current season configuration
    const gameSubmissionRecord = {
      id: `${gameId}-submission`, // Use consistent ID without timestamp
      gameId,
      eventType: 'game-submission',
      submittedAt: new Date().toISOString(),
      submittedBy: submittedBy || 'Unknown',
      division,
      league,
      season: currentSeason,
      year: 2025,
      seasonType: 'Fall',
      homeTeam,
      awayTeam,
      finalScore: finalScore || {},
      totalGoals: goals.length,
      totalPenalties: penalties.length,
      gameSummary: {
        goalsByTeam: goals.reduce((acc, goal) => {
          acc[goal.teamName] = (acc[goal.teamName] || 0) + 1;
          return acc;
        }, {}),
        penaltiesByTeam: penalties.reduce((acc, penalty) => {
          acc[penalty.teamName] = (acc[penalty.teamName] || 0) + 1;
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
            query: 'SELECT * FROM c WHERE c.id = @gameId OR c.gameId = @gameId',
            parameters: [{ name: '@gameId', value: gameId }]
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
        query: 'SELECT * FROM c WHERE c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    console.log(`📊 Found ${goals.length} goals to delete`);

    console.log('🚨 Querying for penalties...');
    // Get all penalties for this game
    const { resources: penalties } = await penaltiesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    console.log(`🚨 Found ${penalties.length} penalties to delete`);

    console.log('📝 Querying for ALL game-related records...');
    // Get ALL records related to this game (including primary game document)
    const { resources: allGameRecords } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId OR c.id = @gameId',
        parameters: [{ name: '@gameId', value: gameId }]
      })
      .fetchAll();

    console.log(`📝 Found ${allGameRecords.length} total game records to delete`);

    // Also specifically get submission records with different query pattern
    const { resources: submissions } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.gameId = @gameId AND (c.eventType = \'game-submission\' OR c.eventType = \'game-completion\')',
        parameters: [{ name: '@gameId', value: gameId }]
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
      : 'Game deletion processed. All game data has been marked for removal from the system.';

    res.status(200).json({
      success: true,
      message: resultMessage,
      deletedItems: {
        goals: goalsDeleted,
        penalties: penaltiesDeleted,
        submissions: submissionsDeleted,
        gameRecords: gameRecordsDeleted,
        totalDeleted: goalsDeleted + penaltiesDeleted + submissionsDeleted + gameRecordsDeleted,
        totalProcessed,
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
        query: 'SELECT * FROM c',
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
        parameters: []
      };
    } else {
      // Build dynamic query based on provided filters
      const conditions = [];
      const parameters = [];

      if (gameId) {
        conditions.push('c.gameId = @gameId');
        parameters.push({ name: '@gameId', value: gameId });
      }

      if (team) {
        conditions.push('c.teamName = @team');
        parameters.push({ name: '@team', value: team });
      }

      if (playerId) {
        conditions.push('c.playerName = @playerId');
        parameters.push({ name: '@playerId', value: playerId });
      }

      querySpec = {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.recordedAt DESC`,
        parameters
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
app.post('/api/ot-shootout', async (req, res) => {
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
      id: `${gameId}-ot-shootout-${Date.now()}`,
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
          acc[goal.teamName] = (acc[goal.teamName] || 0) + 1;
          return acc;
        }, {}),
        penaltiesByTeam: penalties.reduce((acc, penalty) => {
          acc[penalty.teamName] = (acc[penalty.teamName] || 0) + 1;
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

app.get('/api/ot-shootout', async (req, res) => {
  const { gameId } = req.query;

  try {
    const container = getOTShootoutContainer();
    let querySpec;

    if (!gameId) {
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.recordedAt DESC',
        parameters: []
      };
    } else {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC',
        parameters: [{ name: '@gameId', value: gameId }]
      };
    }

    const { resources: otShootoutRecords } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(otShootoutRecords);
  } catch (error) {
    console.error('Error fetching OT/Shootout records:', error);
    res.status(500).json({ error: 'Failed to fetch OT/Shootout records' });
  }
});

// Unified events endpoint (combines goals + penalties) for legacy frontend usage
// Returns a normalized shape while preserving legacy fields for backward compatibility
app.get('/api/events', async (req, res) => {
  const { gameId } = req.query;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId query param required' });
  }
  try {
    const goalsContainer = getGoalsContainer();
    const penaltiesContainer = getPenaltiesContainer();
    const goalQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId AND c.eventType = @eventType',
      parameters: [
        { name: '@gameId', value: gameId },
        { name: '@eventType', value: 'goal' }
      ]
    };
    const penQuery = {
      query: 'SELECT * FROM c WHERE c.gameId = @gameId',
      parameters: [ { name: '@gameId', value: gameId } ]
    };
    const [{ resources: goals }, { resources: penalties }] = await Promise.all([
      goalsContainer.items.query(goalQuery).fetchAll(),
      penaltiesContainer.items.query(penQuery).fetchAll()
    ]);

    const normGoals = goals.map(g => ({
      id: g.id,
      eventType: 'goal',
      gameId: g.gameId,
      period: g.period,
      division: g.division,
      teamName: g.teamName || null,
      playerName: g.playerName || null,
      assistedBy: g.assistedBy || [],
      timeRemaining: g.timeRemaining || g.time || null,
      shotType: g.shotType,
      goalType: g.goalType,
      recordedAt: g.recordedAt,
      // Legacy mirrors for backward compatibility
      scoringTeam: g.teamName || null,
      scorer: g.playerName || null,
      assists: g.assistedBy || [],
      time: g.timeRemaining || null
    }));

    const normPens = penalties
      .filter(p => (p.eventType === 'penalty') || p.penaltyType) // heuristic
      .map(p => ({
        id: p.id,
        eventType: 'penalty',
        gameId: p.gameId,
        period: p.period,
        division: p.division,
        teamName: p.teamName || null,
        playerName: p.playerName || null,
        penaltyType: p.penaltyType,
        length: p.length || p.penaltyLength || null,
        timeRemaining: p.timeRemaining || p.time || null,
        recordedAt: p.recordedAt,
        // Legacy mirrors for backward compatibility
        penalizedTeam: p.teamName || null,
        penalizedPlayer: p.playerName || null,
        penaltyLength: p.length || null,
        time: p.timeRemaining || null
      }));

    const combined = [...normGoals, ...normPens].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    res.json(combined);
  } catch (e) {
    console.error('Failed to fetch events', e);
    handleError(res, e);
  }
});

// Health check endpoint for debugging production issues (updated env var names)
app.get('/api/health', (req, res) => {
  const envVars = {
    COSMOS_DB_URI: !!process.env.COSMOS_DB_URI,
    COSMOS_DB_KEY: !!process.env.COSMOS_DB_KEY,
    COSMOS_DB_NAME: !!process.env.COSMOS_DB_NAME,
    COSMOS_CONTAINER_GAMES: process.env.COSMOS_CONTAINER_GAMES,
    COSMOS_CONTAINER_ROSTERS: process.env.COSMOS_CONTAINER_ROSTERS,
    COSMOS_CONTAINER_ATTENDANCE: process.env.COSMOS_CONTAINER_ATTENDANCE,
    COSMOS_CONTAINER_GOALS: process.env.COSMOS_CONTAINER_GOALS,
    COSMOS_CONTAINER_PENALTIES: process.env.COSMOS_CONTAINER_PENALTIES,
    COSMOS_CONTAINER_PLAYERS: process.env.COSMOS_CONTAINER_PLAYERS,
    COSMOS_CONTAINER_HISTORICAL_PLAYER_STATS: process.env.COSMOS_CONTAINER_HISTORICAL_PLAYER_STATS,
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

// Import historical aggregate player stats (separate container)
app.post('/api/admin/historical-player-stats/import', async (req, res) => {
  const { rows, csv, dryRun } = req.body || {};
  try {
    const { getHistoricalPlayerStatsContainer } = await import('./cosmosClient.js');
    const c = getHistoricalPlayerStatsContainer();
    let data = rows;
    if (!data && csv) {
      const parse = (text) => {
        const lines = text.trim().split(/\r?\n/);
        const header = lines.shift().split(',').map(h => h.trim());
        return lines.map(l => {
          const parts = l.split(',').map(p => p.trim());
          const obj = {};
          header.forEach((h,i) => obj[h] = parts[i] ?? '');
          return obj;
        });
      };
      data = parse(csv);
    }
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Provide rows[] or csv' });
    }
    const norm = v => (v ?? '').toString().trim();
    const toInt = v => {
      const n = parseInt(v,10); return isNaN(n) ? 0 : n;
    };
    let imported = 0;
    for (const r of data) {
      const playerName = norm(r.Name);
      const division = norm(r.Division) || 'Unknown';
      const year = norm(r.Year) || 'Unknown';
      if (!playerName || !division || !year) {
        continue;
      }
      const goals = toInt(r.Goals); const assists = toInt(r.Assists); const pim = toInt(r.PIM); const gp = toInt(r.GP); const points = r.Points ? toInt(r.Points) : goals + assists;
      const id = `${year}-${division}-${playerName.toLowerCase().replace(/\s+/g,'_')}`;
      const doc = { id, playerName, division, league: norm(r.League) || null, season: norm(r.Season) || null, year, goals, assists, pim, points, gp, source: 'historical', importedAt: new Date().toISOString() };
      if (!dryRun) {
        await c.items.upsert(doc);
      }
      imported++;
    }
    res.status(200).json({ success: true, imported, dryRun: !!dryRun });
  } catch (e) {
    console.error('Historical import error', e);
    res.status(500).json({ error: 'Import failed', message: e.message });
  }
});

// Ensure historical-player-stats container exists (idempotent)
app.post('/api/admin/historical-player-stats/ensure', async (req, res) => {
  try {
    const { getDatabase, getContainerDefinitions } = await import('./cosmosClient.js');
    const db = await getDatabase();
    const defs = getContainerDefinitions();
    const def = defs['historical-player-stats'];
    if (!def) {
      return res.status(500).json({ error: 'Definition missing' });
    }
    const { container, resource } = await db.containers.createIfNotExists({
      id: def.name,
      partitionKey: def.partitionKey,
      indexingPolicy: def.indexingPolicy
    });
    res.json({ success: true, container: def.name, created: !!resource?._rid });
  } catch (e) {
    res.status(500).json({ error: 'Ensure failed', message: e.message });
  }
});

// Player stats merged view (live events + historical aggregates)
app.get('/api/player-stats', async (req, res) => {
  // Set cache-busting headers to ensure fresh data from Cosmos
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const {
    refresh,
    division,
    year,
    season,
    scope,
    debug,
    rostered,
    limit = 100, // Default limit
    offset = 0,  // Default offset
    sortBy = 'points', // Default sort
    sortOrder = 'desc' // Default order
  } = req.query; // scope: totals|historical|live

  try {
    const { getDatabase, getHistoricalPlayerStatsContainer, getContainerDefinitions, getRostersContainer } = await import('./cosmosClient.js');

    // Check if database is configured - if not, return demo data
    let db = null;
    try {
      db = getDatabase();
    } catch (error) {
      logger.warn('Database not available, returning demo player stats');
    }

    if (!db) {
      logger.warn('Database not available, returning demo player stats');

      // Return demo data for testing performance optimizations
      const demoData = [
        { playerName: 'Demo Player 1', division: 'Gold', goals: 25, assists: 15, points: 40, pim: 4, gp: 20 },
        { playerName: 'Demo Player 2', division: 'Silver', goals: 20, assists: 18, points: 38, pim: 6, gp: 18 },
        { playerName: 'Demo Player 3', division: 'Bronze', goals: 18, assists: 12, points: 30, pim: 8, gp: 16 },
        { playerName: 'Demo Player 4', division: 'Gold', goals: 15, assists: 20, points: 35, pim: 2, gp: 22 },
        { playerName: 'Demo Player 5', division: 'Silver', goals: 22, assists: 10, points: 32, pim: 10, gp: 19 }
      ];

      const totalCount = demoData.length;
      const startIndex = parseInt(offset) || 0;
      const limitNum = parseInt(limit) || 100;
      const paginatedData = demoData.slice(startIndex, startIndex + limitNum);

      const pagination = {
        total: totalCount,
        limit: limitNum,
        offset: startIndex,
        hasNext: startIndex + limitNum < totalCount,
        hasPrev: startIndex > 0
      };

      if (debug === 'true') {
        return res.json({
          debug: {
            historicalCount: 0,
            liveCount: 0,
            divisionFilter: division || null,
            autoRebuilt: false,
            scopeRequested: scope || 'totals',
            rosterFiltering: false,
            rosteredPlayersCount: 0,
            filteredResultCount: paginatedData.length,
            pagination
          },
          data: paginatedData,
          pagination
        });
      }

      return res.json({ data: paginatedData, pagination });
    }

    // Database is available, proceed with normal operation
    // Use standardized 'player-stats' container for live aggregated stats
    const liveC = db.container(getContainerDefinitions()['player-stats'].name);
    const goalsC = db.container('goals');
    const pensC = db.container('penalties');
    const histC = getHistoricalPlayerStatsContainer();
    const rostersC = getRostersContainer();

    // Check if we have any goals or penalties data
    const [{ resources: goalsCheck }, { resources: pensCheck }] = await Promise.all([
      goalsC.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll(),
      pensC.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll()
    ]);

    const hasGoalsData = goalsCheck[0] > 0;
    const hasPensData = pensCheck[0] > 0;

    // If no goals or penalties data exists, return demo data based on rosters
    if (!hasGoalsData && !hasPensData) {
      console.log('📊 No goals/penalties data found, generating demo stats from rosters');

      // Fetch rosters to create demo player stats
      const { resources: rosters } = await rostersC.items.query('SELECT * FROM c').fetchAll();

      const demoPlayerStats = [];
      for (const roster of rosters) {
        if (roster.players && Array.isArray(roster.players)) {
          roster.players.forEach((player, index) => {
            if (player.name) {
              // Create realistic demo stats based on player position in roster
              const baseGoals = Math.max(0, 25 - index * 2 + Math.floor(Math.random() * 10));
              const baseAssists = Math.max(0, 20 - index * 1.5 + Math.floor(Math.random() * 8));
              const basePIM = Math.max(0, 15 - index + Math.floor(Math.random() * 20));

              demoPlayerStats.push({
                playerName: player.name,
                division: roster.division,
                goals: baseGoals,
                assists: baseAssists,
                points: baseGoals + baseAssists,
                pim: basePIM,
                gp: Math.max(1, 20 - Math.floor(Math.random() * 5)),
                year: '2025',
                season: 'Fall',
                scope: 'totals'
              });
            }
          });
        }
      }

      // Apply filters
      let filteredStats = demoPlayerStats;
      if (division && division.toLowerCase() !== 'all') {
        filteredStats = filteredStats.filter(stat => stat.division?.toLowerCase() === division.toLowerCase());
      }

      // Apply roster filtering if requested
      if (rostered === 'true') {
        // Already filtered by roster data, no additional filtering needed
      }

      // Sort by points descending
      filteredStats.sort((a, b) => b.points - a.points);

      // Apply pagination
      const totalCount = filteredStats.length;
      const startIndex = parseInt(offset) || 0;
      const limitNum = parseInt(limit) || 100;
      const paginatedData = filteredStats.slice(startIndex, startIndex + limitNum);

      const pagination = {
        total: totalCount,
        limit: limitNum,
        offset: startIndex,
        hasNext: startIndex + limitNum < totalCount,
        hasPrev: startIndex > 0
      };

      if (debug === 'true') {
        return res.json({
          debug: {
            historicalCount: 0,
            liveCount: 0,
            divisionFilter: division || null,
            autoRebuilt: false,
            scopeRequested: scope || 'totals',
            rosterFiltering: false,
            rosteredPlayersCount: demoPlayerStats.length,
            filteredResultCount: paginatedData.length,
            pagination,
            dataSource: 'demo-from-rosters'
          },
          data: paginatedData,
          pagination
        });
      }

      return res.json({ data: paginatedData, pagination });
    }

    if (refresh === 'true') {
      const [{ resources: goals }, { resources: pens }] = await Promise.all([
        goalsC.items.query('SELECT * FROM c').fetchAll(),
        pensC.items.query('SELECT * FROM c').fetchAll()
      ]);
      // Rebuild live container (truncate only live docs)
      try {
        // Delete only previously generated live docs (source='live') to avoid wiping other player profiles
        const { resources: existing } = await liveC.items.query('SELECT c.id, c._partitionKey FROM c WHERE c.source = \'live\'').fetchAll();
        for (const e of existing) {
          try {
            await liveC.item(e.id, e._partitionKey || e.id).delete();
          } catch {}
        }
      } catch (delErr) {
        console.warn('Live player stat cleanup issue', delErr.message);
      }
      const map = new Map();
      const key = (name, div) => `${(div || 'div').toLowerCase()}::${name.toLowerCase().replace(/\s+/g,'_')}`;
      const ensure = (name, div) => {
        const k = key(name,div); if (!map.has(k)) {
          map.set(k,{ id: k, playerId: k, playerName: name, division: div, goals: 0, assists: 0, pim: 0, games: new Set() });
        } return map.get(k);
      };
      for (const g of goals) {
        const name = g.playerName; if (!name) {
          continue;
        } const div = g.division || null; const r = ensure(name,div); r.goals++; r.games.add(g.gameId); const assists = g.assistedBy || g.assists || []; if (Array.isArray(assists)) {
          for (const a of assists) {
            if (!a) {
              continue;
            } const ar = ensure(a,div); ar.assists++; ar.games.add(g.gameId);
          }
        }
      }
      for (const p of pens) {
        const name = p.playerName; if (!name) {
          continue;
        } const div = p.division || null; const r = ensure(name,div); const mins = parseInt(p.length || p.penaltyLength || 0,10); if (!isNaN(mins)) {
          r.pim += mins;
        } r.games.add(p.gameId);
      }
      for (const rec of map.values()) {
        const doc = { ...rec, _partitionKey: rec.division || 'global', points: rec.goals + rec.assists, gamesPlayed: rec.games.size, games: Array.from(rec.games), updatedAt: new Date().toISOString(), source: 'live' };
        await liveC.items.upsert(doc);
      }
      return res.json({ success: true, rebuilt: map.size });
    }

    // Fetch historical filtered
    let histQuery = 'SELECT * FROM c';
    const hParams = [];
    if (division || year || season) {
      const cond = [];
      if (division) {
        cond.push('c.division = @d'); hParams.push({ name: '@d', value: division });
      }
      if (year) {
        cond.push('c.year = @y'); hParams.push({ name: '@y', value: year });
      }
      if (season) {
        cond.push('c.season = @s'); hParams.push({ name: '@s', value: season });
      }
      histQuery = `SELECT * FROM c WHERE ${cond.join(' AND ')}`;
    }
    const { resources: historical } = await histC.items.query({ query: histQuery, parameters: hParams }).fetchAll();

    // Fetch live filtered
    let liveQuery = 'SELECT * FROM c WHERE c.source = \'live\'';
    const lParams = [];
    if (division) {
      liveQuery += ' AND c.division = @d'; lParams.push({ name: '@d', value: division });
    }
    const { resources: liveInitial } = await liveC.items.query({ query: liveQuery, parameters: lParams }).fetchAll();
    let live = liveInitial;

    // Auto-rebuild if empty and not explicitly filtered by year/season (only when totals/live requested)
    if (!refresh && live.length === 0 && (!scope || scope !== 'historical')) {
      try {
        const [{ resources: goals }, { resources: pens }] = await Promise.all([
          goalsC.items.query('SELECT * FROM c').fetchAll(),
          pensC.items.query('SELECT * FROM c').fetchAll()
        ]);
        if (goals.length > 0 || pens.length > 0) {
          const map = new Map();
          const key = (name, div) => `${(div || 'div').toLowerCase()}::${name.toLowerCase().replace(/\s+/g,'_')}`;
          const ensure = (name, div) => {
            const k = key(name,div); if (!map.has(k)) {
              map.set(k,{ id: k, playerId: k, playerName: name, division: div, goals: 0, assists: 0, pim: 0, games: new Set() });
            } return map.get(k);
          };
          for (const g of goals) {
            const name = g.playerName; if (!name) {
              continue;
            } const div = g.division || null; const r = ensure(name,div); r.goals++; r.games.add(g.gameId); const assists = g.assistedBy || g.assists || []; if (Array.isArray(assists)) {
              for (const a of assists) {
                if (!a) {
                  continue;
                } const ar = ensure(a,div); ar.assists++; ar.games.add(g.gameId);
              }
            }
          }
          for (const p of pens) {
            const name = p.playerName; if (!name) {
              continue;
            } const div = p.division || null; const r = ensure(name,div); const mins = parseInt(p.length || p.penaltyLength || 0,10); if (!isNaN(mins)) {
              r.pim += mins;
            } r.games.add(p.gameId);
          }
          for (const rec of map.values()) {
            const doc = { ...rec, _partitionKey: rec.division || 'global', points: rec.goals + rec.assists, gamesPlayed: rec.games.size, games: Array.from(rec.games), updatedAt: new Date().toISOString(), source: 'live', autoRebuilt: true }; await liveC.items.upsert(doc);
          }
          const { resources: liveAfter } = await liveC.items.query({ query: liveQuery, parameters: lParams }).fetchAll();
          live = liveAfter;
        }
      } catch (autoErr) {
        console.warn('Auto rebuild live stats failed', autoErr.message);
      }
    }

    const histIndex = new Map();
    for (const h of historical) {
      const k = `${(h.division || 'div').toLowerCase()}::${h.playerName.toLowerCase()}::${h.year}`;
      histIndex.set(k, h);
    }
    const byNameDiv = (name, div) => `${(div || 'div').toLowerCase()}::${name.toLowerCase()}`;
    const mergedMap = new Map();

    // Seed merged with historical
    for (const h of historical) {
      const k = byNameDiv(h.playerName, h.division);
      if (!mergedMap.has(k)) {
        mergedMap.set(k, { playerName: h.playerName, division: h.division, historical: [], live: null });
      }
      mergedMap.get(k).historical.push(h);
    }
    // Attach live
    for (const l of live) {
      const k = byNameDiv(l.playerName, l.division);
      if (!mergedMap.has(k)) {
        mergedMap.set(k, { playerName: l.playerName, division: l.division, historical: [], live: null });
      }
      mergedMap.get(k).live = l;
    }

    // Roster filtering for current season (2025 Fall) if rostered=true or scope=live
    const rosterNames = new Set();
    let shouldFilterByRoster = rostered === 'true' || (scope === 'live' && !year && !season);

    if (shouldFilterByRoster) {
      try {
        // Fetch current season rosters (try multiple season formats)
        const seasonVariants = ['2025 Fall', '2025', 'Fall 2025'];
        let rosters = [];

        for (const seasonVariant of seasonVariants) {
          const rosterQuery = {
            query: 'SELECT * FROM c WHERE c.season = @season',
            parameters: [{ name: '@season', value: seasonVariant }]
          };

          // If division filter is specified, apply it to rosters too
          if (division) {
            rosterQuery.query += ' AND LOWER(c.division) = LOWER(@division)';
            rosterQuery.parameters.push({ name: '@division', value: division });
          }

          const { resources: seasonRosters } = await rostersC.items.query(rosterQuery).fetchAll();
          if (seasonRosters.length > 0) {
            rosters = seasonRosters;
            console.log(`📋 Found rosters for season "${seasonVariant}": ${rosters.length} teams`);
            break;
          }
        }

        if (rosters.length === 0) {
          // If no rosters found, try fetching all rosters to see what seasons exist
          const { resources: allRosters } = await rostersC.items.query('SELECT DISTINCT c.season FROM c').fetchAll();
          const availableSeasons = allRosters.map(r => r.season);
          console.log(`⚠️ No rosters found for current season variants. Available seasons: ${JSON.stringify(availableSeasons)}`);
          console.log('ℹ️ Disabling roster filtering since no current season rosters exist');
          // Don't filter by roster if no rosters exist
          shouldFilterByRoster = false;
        } else {
          // Extract all player names from current season rosters
          for (const roster of rosters) {
            if (roster.players && Array.isArray(roster.players)) {
              for (const player of roster.players) {
                if (player.name) {
                  rosterNames.add(player.name.toLowerCase());
                }
              }
            }
          }

          console.log(`📋 Found ${rosterNames.size} rostered players for current season filtering`);
        }
      } catch (rosterErr) {
        console.warn('Failed to fetch roster data for filtering:', rosterErr.message);
        // Continue without roster filtering if there's an error
        shouldFilterByRoster = false;
      }
    }

    const response = [];
    for (const entry of mergedMap.values()) {
      // Apply roster filtering if enabled
      if (shouldFilterByRoster && rosterNames.size > 0) {
        const playerNameLower = entry.playerName.toLowerCase();
        if (!rosterNames.has(playerNameLower)) {
          continue; // Skip non-rostered players
        }
      }

      const histTotals = entry.historical.reduce((acc,h) => {
        acc.goals += h.goals; acc.assists += h.assists; acc.points += h.points; acc.pim += h.pim; acc.gp += h.gp; return acc;
      }, { goals: 0, assists: 0, points: 0, pim: 0, gp: 0 });
      const liveRec = entry.live ? { goals: entry.live.goals, assists: entry.live.assists, points: entry.live.points, pim: entry.live.pim, gp: entry.live.gamesPlayed } : { goals: 0, assists: 0, points: 0, pim: 0, gp: 0 };
      const totals = { goals: histTotals.goals + liveRec.goals, assists: histTotals.assists + liveRec.assists, points: histTotals.points + liveRec.points, pim: histTotals.pim + liveRec.pim, gp: histTotals.gp + liveRec.gp };
      
      // Get year/season from most recent historical data or default to current
      const latestHistorical = entry.historical.sort((a,b) => {
        if (a.year !== b.year) return b.year - a.year;
        return a.season === 'Winter' ? -1 : 1;
      })[0];
      const year = latestHistorical?.year || '2025';
      const season = latestHistorical?.season || 'Fall';
      
      const base = { playerName: entry.playerName, division: entry.division, year, season };
      if (scope === 'historical') {
        response.push({ ...base, ...histTotals, scope: 'historical' });
      } else if (scope === 'live') {
        response.push({ ...base, ...liveRec, year: '2025', season: 'Fall', scope: 'live' });
      } else {
        response.push({ ...base, ...totals, historical: histTotals, live: liveRec, scope: 'totals' });
      }
    }

    const payload = response.sort((a,b) => b.points - a.points);

    // Apply pagination
    const totalCount = payload.length;
    const startIndex = parseInt(offset) || 0;
    const limitNum = parseInt(limit) || 100;
    const paginatedPayload = payload.slice(startIndex, startIndex + limitNum);

    // Add pagination metadata
    const pagination = {
      total: totalCount,
      limit: limitNum,
      offset: startIndex,
      hasNext: startIndex + limitNum < totalCount,
      hasPrev: startIndex > 0
    };

    if (debug === 'true') {
      return res.json({ debug: {
        historicalCount: historical.length,
        liveCount: live.length,
        divisionFilter: division || null,
        autoRebuilt: live.some(l => l.autoRebuilt),
        scopeRequested: scope || 'totals',
        rosterFiltering: shouldFilterByRoster,
        rosteredPlayersCount: rosterNames.size,
        filteredResultCount: payload.length,
        pagination
      }, data: paginatedPayload, pagination });
    }
    res.json({ data: paginatedPayload, pagination });
  } catch (e) {
    console.error('Player stats merged error', e);
    res.status(500).json({ error: 'Failed to get player stats', message: e.message });
  }
});

// Admin endpoint to normalize goal & penalty event field names for consistency (playerName, teamName)
app.post('/api/admin/normalize-events', async (req, res) => {
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const db = await getDatabase();
    const goalsC = db.container('goals');
    const pensC = db.container('penalties');
    const updates = { goals: 0, penalties: 0 };
    const { resources: goals } = await goalsC.items.query('SELECT * FROM c').fetchAll();
    for (const g of goals) {
      const changed = false;
      // Field already standardized - scorer field removed
      // teamName is now standardized across all containers
      if (changed) {
        try {
          await goalsC.items.upsert(g); updates.goals++;
        } catch {}
      }
    }
    const { resources: pens } = await pensC.items.query('SELECT * FROM c').fetchAll();
    for (const p of pens) {
      let changed = false;
      // Field already standardized - penalizedPlayer field removed
      if (!p.teamName && p.penalizedTeam) {
        p.teamName = p.penalizedTeam; changed = true;
      }
      if (changed) {
        try {
          await pensC.items.upsert(p); updates.penalties++;
        } catch {}
      }
    }
    res.json({ success: true, updates });
  } catch (e) {
    console.error('Normalization error', e);
    res.status(500).json({ error: 'Normalization failed', message: e.message });
  }
});

// Player stats metadata (distinct seasons & years from historical data)
app.get('/api/player-stats/meta', async (req, res) => {
  try {
    const { getHistoricalPlayerStatsContainer } = await import('./cosmosClient.js');
    const histC = getHistoricalPlayerStatsContainer();
    const { resources } = await histC.items.query('SELECT c.season, c.year FROM c').fetchAll();
    const seasons = new Set();
    const years = new Set();
    for (const r of resources) {
      if (r.season) {
        seasons.add(String(r.season));
      }
      if (r.year) {
        years.add(String(r.year));
      }
    }
    const seasonList = Array.from(seasons).filter(Boolean).sort((a,b) => a.localeCompare(b));
    const yearList = Array.from(years).filter(Boolean).sort((a,b) => parseInt(b,10) - parseInt(a,10));
    res.json({ seasons: seasonList, years: yearList, count: resources.length, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Player stats meta error', e);
    res.status(500).json({ error: 'Failed to get player stats meta', message: e.message });
  }
});

// Team stats aggregated view (backend is source of truth)
app.get('/api/team-stats', async (req, res) => {
  console.log('Team stats endpoint called');
  // Set cache-busting headers to ensure fresh data from Cosmos
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const { division } = req.query || {};
  try {
    const { getDatabase } = await import('./cosmosClient.js');

    // Check if database is configured - if not, return demo data
    let db = null;
    try {
      db = getDatabase();
      console.log('Team stats: Database available');
    } catch (error) {
      console.log('Team stats: Database not available, returning demo team stats');
      logger.warn('Database not available, returning demo team stats');
    }

    // TEMP: Force demo data for testing
    if (!db) {
      console.log('Team stats: Using demo data (database not available)');
      logger.warn('Database not available, returning demo team stats');

      // Return demo team stats data
      const demoData = [
        { teamName: 'Demo Team A', division: 'Gold', gamesPlayed: 20, wins: 15, losses: 3, ties: 2, goalsFor: 85, goalsAgainst: 45, points: 32 },
        { teamName: 'Demo Team B', division: 'Silver', gamesPlayed: 18, wins: 12, losses: 4, ties: 2, goalsFor: 72, goalsAgainst: 38, points: 26 },
        { teamName: 'Demo Team C', division: 'Bronze', gamesPlayed: 16, wins: 8, losses: 6, ties: 2, goalsFor: 58, goalsAgainst: 52, points: 18 },
        { teamName: 'Demo Team D', division: 'Gold', gamesPlayed: 22, wins: 14, losses: 5, ties: 3, goalsFor: 78, goalsAgainst: 48, points: 31 },
        { teamName: 'Demo Team E', division: 'Silver', gamesPlayed: 19, wins: 10, losses: 7, ties: 2, goalsFor: 65, goalsAgainst: 55, points: 22 }
      ];

      const filteredData = division ? demoData.filter(team => team.division === division) : demoData;

      return res.json(filteredData);
    }

    console.log('Team stats: Database available, proceeding with normal operation');

    // Database is available, proceed with normal operation
    const gamesC = db.container('games');
    const goalsC = db.container('goals');

    // Fetch submission docs (these contain all the game data we need)
    const { resources: submissions } = await gamesC.items.query({
      query: 'SELECT * FROM c WHERE c.eventType = \'game-submission\'',
      parameters: []
    }).fetchAll();

    console.log('Team stats: Found', submissions.length, 'submissions');

    if (!submissions.length) {
      // No submitted games yet, generate demo stats from rosters and upcoming games
      console.log('📊 No submitted games found, generating demo team stats from rosters and games');

      const rostersC = db.container('rosters');
      const { resources: rosters } = await rostersC.items.query('SELECT * FROM c').fetchAll();

      // Also get upcoming games to understand team structure
      const { resources: upcomingGames } = await gamesC.items.query({
        query: 'SELECT c.homeTeam, c.awayTeam, c.division FROM c WHERE c.status = \'upcoming\'',
        parameters: []
      }).fetchAll();

      const demoTeamStats = [];

      // Create stats from rosters
      for (const roster of rosters) {
        if (roster.teamName) {
          // Find games for this team
          const teamGames = upcomingGames.filter(game =>
            game.homeTeam === roster.teamName || game.awayTeam === roster.teamName
          );

          // Create realistic demo stats
          const gamesPlayed = Math.min(teamGames.length, 20); // Simulate some games played
          const wins = Math.floor(gamesPlayed * (0.6 + Math.random() * 0.3)); // 60-90% win rate
          const losses = gamesPlayed - wins;
          const goalsFor = wins * 3 + Math.floor(Math.random() * 20);
          const goalsAgainst = losses * 2 + Math.floor(Math.random() * 15);

          demoTeamStats.push({
            teamName: roster.teamName,
            division: roster.division,
            gamesPlayed,
            wins,
            losses,
            ties: 0,
            goalsFor,
            goalsAgainst,
            points: wins * 2, // 2 points per win
            winPercentage: gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : '0.0'
          });
        }
      }

      // Apply division filter
      let filteredStats = demoTeamStats;
      if (division && division.toLowerCase() !== 'all') {
        filteredStats = filteredStats.filter(team => team.division?.toLowerCase() === division.toLowerCase());
      }

      // Sort by points descending
      filteredStats.sort((a, b) => b.points - a.points);

      return res.json(filteredStats);
    }

    // Filter by division if specified
    let games = submissions;
    if (division && division.toLowerCase() !== 'all') {
      games = games.filter(g => (g.division || '').toLowerCase() === division.toLowerCase());
    }

    // Fetch all goals for submitted games
    const gameIds = submissions.map(s => s.gameId);
    const { resources: allGoals } = await goalsC.items.query('SELECT * FROM c').fetchAll();
    const relevantGoals = allGoals.filter(g => gameIds.includes(g.gameId));

    // Initialize team stats map
    const teamStatsMap = new Map();
    for (const game of games) {
      const div = game.division || game.league || null;
      [game.homeTeam, game.awayTeam].forEach(teamName => {
        if (!teamStatsMap.has(teamName)) {
          teamStatsMap.set(teamName, {
            teamName,
            division: div,
            wins: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            gamesPlayed: 0
          });
        }
      });
    }

    // Calculate goals for/against from actual goal records
    for (const goal of relevantGoals) {
      const scoringTeam = goal.teamName;
      if (scoringTeam && teamStatsMap.has(scoringTeam)) {
        teamStatsMap.get(scoringTeam).goalsFor++;
      }

      // Find opponent team and increment goals against
      const game = games.find(g => g.gameId === goal.gameId);
      if (game) {
        const opponent = scoringTeam === game.homeTeam ? game.awayTeam : game.homeTeam;
        if (opponent && teamStatsMap.has(opponent)) {
          teamStatsMap.get(opponent).goalsAgainst++;
        }
      }
    }

    // Calculate wins/losses from final scores in submission documents
    for (const game of games) {
      const finalScore = game.finalScore || {};
      const homeScore = finalScore[game.homeTeam] || 0;
      const awayScore = finalScore[game.awayTeam] || 0;

      const homeTeam = teamStatsMap.get(game.homeTeam);
      const awayTeam = teamStatsMap.get(game.awayTeam);

      // Count games played for both teams regardless of score
      if (homeTeam) {
        homeTeam.gamesPlayed++;
      }
      if (awayTeam) {
        awayTeam.gamesPlayed++;
      }

      // Only count wins/losses for non-tied games
      if (homeScore !== awayScore) {
        if (homeTeam) {
          if (homeScore > awayScore) {
            homeTeam.wins++;
          } else {
            homeTeam.losses++;
          }
        }

        if (awayTeam) {
          if (awayScore > homeScore) {
            awayTeam.wins++;
          } else {
            awayTeam.losses++;
          }
        }
      }
      // Note: Tied games are neither wins nor losses, but still count as games played
    }

    const response = Array.from(teamStatsMap.values()).map(t => ({
      ...t,
      winPercentage: t.gamesPlayed ? Number(((t.wins / t.gamesPlayed) * 100).toFixed(1)) : 0,
      goalDifferential: t.goalsFor - t.goalsAgainst
    }));

    res.json(response);
  } catch (e) {
    console.error('Team stats error', e);
    res.status(500).json({ error: 'Failed to get team stats', message: e.message });
  }
});

// ---------------------------------------------------------------------------
// Historical backfill: add missing game-submission docs for legacy games
// POST /api/admin/backfill-submissions  { dryRun?: true }
app.post('/api/admin/backfill-submissions', async (req, res) => {
  const { dryRun } = req.body || {};
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const db = await getDatabase();
    const gamesC = db.container('games');
    const goalsC = db.container('goals');
    const penaltiesC = db.container('penalties');

    // Fetch all base game records (exclude existing submission docs)
    const { resources: baseGames } = await gamesC.items.query({
      query: 'SELECT * FROM c WHERE (NOT IS_DEFINED(c.eventType)) OR c.eventType != \'game-submission\''
    }).fetchAll();

    // Fetch existing submissions index
    const { resources: existingSubs } = await gamesC.items.query({
      query: 'SELECT c.gameId FROM c WHERE c.eventType = \'game-submission\''
    }).fetchAll();
    const existingSet = new Set(existingSubs.map(s => s.gameId));

    const toCreate = [];
    for (const g of baseGames) {
      const gameId = g.gameId || g.id;
      if (!gameId || existingSet.has(gameId)) {
        continue;
      }
      // Aggregate goals & penalties for summary
      const [{ resources: gameGoals }, { resources: gamePens }] = await Promise.all([
        goalsC.items.query({ query: 'SELECT * FROM c WHERE c.gameId = @gid', parameters: [{ name: '@gid', value: gameId }] }).fetchAll(),
        penaltiesC.items.query({ query: 'SELECT * FROM c WHERE c.gameId = @gid', parameters: [{ name: '@gid', value: gameId }] }).fetchAll()
      ]);
      const goalsByTeam = {};
      for (const goal of gameGoals) {
        const t = goal.teamName || 'Unknown';
        goalsByTeam[t] = (goalsByTeam[t] || 0) + 1;
      }
      const penaltiesByTeam = {};
      let totalPIM = 0;
      for (const pen of gamePens) {
        const t = pen.teamName || 'Unknown';
        penaltiesByTeam[t] = (penaltiesByTeam[t] || 0) + 1;
        const mins = parseInt(pen.length || pen.penaltyLength || 0, 10);
        if (!isNaN(mins)) {
          totalPIM += mins;
        }
      }
      const submissionDoc = {
        id: `${gameId}-submission-backfill`,
        gameId,
        eventType: 'game-submission',
        createdAt: new Date().toISOString(),
        source: 'backfill',
        goalsByTeam,
        penaltiesByTeam,
        totalGoals: gameGoals.length,
        totalPenalties: gamePens.length,
        totalPIM,
        division: g.division || g.league,
        season: g.season || new Date().getFullYear(),
        teams: [g.homeTeam, g.awayTeam].filter(Boolean)
      };
      toCreate.push(submissionDoc);
    }

    if (dryRun) {
      return res.status(200).json({ success: true, dryRun: true, wouldCreate: toCreate.length });
    }

    for (const doc of toCreate) {
      try {
        await gamesC.items.create(doc);
      } catch (e) { /* ignore duplicates */ }
    }
    res.status(200).json({ success: true, created: toCreate.length });
  } catch (e) {
    console.error('Backfill submissions error:', e);
    res.status(500).json({ error: 'Failed to backfill submissions', message: e.message });
  }
});

// Normalization endpoint: rewrite legacy field names to canonical schema
// POST /api/admin/normalize-events { dryRun?: true }
app.post('/api/admin/normalize-events', async (req, res) => {
  const { dryRun } = req.body || {};
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const db = await getDatabase();
    const goalsC = db.container('goals');
    const penaltiesC = db.container('penalties');
    let updated = 0;
    // Goals normalization
    const { resources: goals } = await goalsC.items.query('SELECT * FROM c').fetchAll();
    for (const g of goals) {
      let changed = false;
      // Field already standardized - scorer field removed
      if (!g.teamName && g.scoringTeam) {
        g.teamName = g.scoringTeam; changed = true;
      }
      if (!g.assistedBy && g.assists) {
        g.assistedBy = g.assists; changed = true;
      }
      if (!g.timeRemaining && g.time) {
        g.timeRemaining = g.time; changed = true;
      }
      if (changed && !dryRun) {
        await goalsC.item(g.id, g.gameId).replace(g);
        updated++;
      } else if (changed) {
        updated++;
      }
    }
    // Penalties normalization
    const { resources: pens } = await penaltiesC.items.query('SELECT * FROM c').fetchAll();
    for (const p of pens) {
      let changed = false;
      // Field already standardized - penalizedPlayer field removed
      if (!p.teamName && p.penalizedTeam) {
        p.teamName = p.penalizedTeam; changed = true;
      }
      if (!p.timeRemaining && p.time) {
        p.timeRemaining = p.time; changed = true;
      }
      if (!p.length && p.penaltyLength) {
        p.length = p.penaltyLength; changed = true;
      }
      if (changed && !dryRun) {
        await penaltiesC.item(p.id, p.gameId).replace(p);
        updated++;
      } else if (changed) {
        updated++;
      }
    }
    res.status(200).json({ success: true, updated, dryRun: !!dryRun });
  } catch (e) {
    console.error('Normalization error:', e);
    res.status(500).json({ error: 'Failed to normalize events', message: e.message });
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
        gameId,
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

// Unified game cancel endpoint to purge all related data (goals, penalties, shots, attendance, OT/SO)
app.post('/api/games/:gameId/cancel', async (req, res) => {
  const { gameId } = req.params;
  try {
    const db = await (await import('./cosmosClient.js')).getDatabase();
    const goalsC = db.container('goals');
    const pensC = db.container('penalties');
    const shotsC = db.container('shots-on-goal');
    const attendC = db.container('attendance');
    const otC = db.container('ot-shootout');
    const gamesC = db.container('games');

    async function deleteByQuery(container, query, paramName = '@gid') {
      try {
        const { resources } = await container.items.query({ query, parameters: [{ name: paramName, value: gameId }] }).fetchAll();
        for (const doc of resources) {
          try {
            await container.item(doc.id, doc.gameId || doc.id).delete();
          } catch (_) {}
        }
        return resources.length;
      } catch {
        return 0;
      }
    }

    const [goalsDeleted, pensDeleted, shotsDeleted, attendDeleted, otDeleted] = await Promise.all([
      deleteByQuery(goalsC, 'SELECT c.id, c.gameId FROM c WHERE c.gameId = @gid'),
      deleteByQuery(pensC, 'SELECT c.id, c.gameId FROM c WHERE c.gameId = @gid'),
      deleteByQuery(shotsC, 'SELECT c.id, c.gameId FROM c WHERE c.gameId = @gid'),
      deleteByQuery(attendC, 'SELECT c.id, c.gameId FROM c WHERE c.gameId = @gid'),
      deleteByQuery(otC, 'SELECT c.id, c.gameId FROM c WHERE c.gameId = @gid')
    ]);

    // Delete any submission doc for the game (eventType = game-submission)
    await deleteByQuery(gamesC, 'SELECT c.id, c.gameId FROM c WHERE (c.gameId = @gid OR c.id = @gid) AND c.eventType = "game-submission"');

    // Optionally delete base game record itself? Keep for scheduling clarity. Only remove if query param force=true
    if (req.query.force === 'true') {
      try {
        await gamesC.item(gameId, gameId).delete();
      } catch (_) {}
    }

    res.json({ success: true, gameId, goalsDeleted, penaltiesDeleted: pensDeleted, shotsDeleted, attendanceDeleted: attendDeleted, otDeleted });
  } catch (e) {
    res.status(500).json({ error: 'Failed to cancel game', message: e.message });
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
        logs
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
    const { getAnnouncerVoices, logTtsUse } = await import('./voice-config.js');
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
          speaker,
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
          query: 'SELECT * FROM c WHERE c.id = \'voiceConfig\'',
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

// Define tools for the analytical agent
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_top_players',
      description: 'Get top players by a specific metric (goals, assists, points, pim, gp)',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: ['goals', 'assists', 'points', 'pim', 'gp'],
            description: 'The metric to rank players by'
          },
          limit: {
            type: 'integer',
            description: 'Number of top players to return (default: 10)',
            default: 10
          }
        },
        required: ['metric']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_team_stats',
      description: 'Get team statistics and performance data',
      parameters: {
        type: 'object',
        properties: {
          teamName: {
            type: 'string',
            description: 'Name of the team to get stats for (optional - returns all teams if not specified)'
          },
          season: {
            type: 'string',
            description: 'Season to filter by (optional)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_game_summary',
      description: 'Get summary of a specific game',
      parameters: {
        type: 'object',
        properties: {
          gameId: {
            type: 'string',
            description: 'The ID of the game to get summary for'
          }
        },
        required: ['gameId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'aggregate_stats',
      description: 'Get aggregated statistics across multiple games or seasons',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['season', 'division', 'team'],
            description: 'Type of aggregation to perform'
          },
          season: {
            type: 'string',
            description: 'Season to aggregate (required for season type)'
          },
          division: {
            type: 'string',
            description: 'Division to aggregate (required for division type)'
          },
          teamName: {
            type: 'string',
            description: 'Team name to aggregate (required for team type)'
          }
        },
        required: ['type']
      }
    }
  }
];

// Chat API endpoint for analytical agent
app.post('/api/chat', async (req, res) => {
  try {
    const { message, messages } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if OpenAI is available
    if (!openai) {
      return res.status(503).json({ 
        error: 'Chat functionality is not available - OpenAI API key not configured' 
      });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Build conversation history
    let conversationMessages = [
      {
        role: 'system',
        content: `You are the Scorekeeper Analytical Agent. You help users analyze hockey statistics and game data.

Your capabilities:
- Answer questions about player statistics, team performance, and game results
- Provide insights on trends, comparisons, and leaderboards
- Answer questions about historical data across multiple seasons

Available data includes:
- Player stats: goals, assists, points, PIM, games played
- Team stats: wins, losses, goals for/against, win percentage
- Game results and summaries
- Historical data across multiple seasons

Answer in plain text only - no tables, charts, or formatting.`
      }
    ];

    // Add previous messages if provided
    if (messages && Array.isArray(messages)) {
      conversationMessages = conversationMessages.concat(messages);
    }

    // Add current user message
    conversationMessages.push({
      role: 'user',
      content: message
    });

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use gpt-4o-mini for faster responses
      messages: conversationMessages,
      // tools: tools,  // Temporarily disable tools to test basic functionality
      // tool_choice: 'auto',
      stream: true,
      max_tokens: 1000,
      temperature: 0.3
    });

    // Simple streaming response without tools
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        // Send content chunks
        res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
      }
    }

    // Send completion signal
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tool execution functions
async function executeGetTopPlayers(args) {
  try {
    const { getPlayerStatsContainer } = await import('./cosmosClient.js');
    const playerStatsContainer = getPlayerStatsContainer();

    // Validate metric parameter
    const validMetrics = ['goals', 'assists', 'points', 'pim', 'gp'];
    if (!validMetrics.includes(args.metric)) {
      return { error: `Invalid metric: ${args.metric}. Valid metrics are: ${validMetrics.join(', ')}` };
    }

    // Build query with proper ORDER BY based on metric
    let orderByField;
    switch (args.metric) {
      case 'goals':
        orderByField = 'goals';
        break;
      case 'assists':
        orderByField = 'assists';
        break;
      case 'points':
        orderByField = 'points';
        break;
      case 'pim':
        orderByField = 'pim';
        break;
      case 'gp':
        orderByField = 'gamesPlayed';
        break;
      default:
        orderByField = 'points'; // fallback
    }

    const { resources } = await playerStatsContainer.items
      .query({
        query: `SELECT TOP @limit * FROM c WHERE c.source = 'live' ORDER BY c.${orderByField} DESC`,
        parameters: [
          { name: '@limit', value: args.limit || 10 }
        ]
      })
      .fetchAll();

    // If no results with source='live', try without the filter
    if (resources.length === 0) {
      const { resources: allResources } = await playerStatsContainer.items
        .query({
          query: `SELECT TOP @limit * FROM c ORDER BY c.${orderByField} DESC`,
          parameters: [
            { name: '@limit', value: args.limit || 10 }
          ]
        })
        .fetchAll();
      return allResources.map(player => ({
        playerName: player.playerName,
        teamName: player.teamName,
        division: player.division,
        goals: player.goals || 0,
        assists: player.assists || 0,
        points: player.points || 0,
        pim: player.pim || 0,
        gp: player.gamesPlayed || 0
      }));
    }
  } catch (error) {
    console.error('get_top_players error:', error);
    return { error: 'Failed to fetch player data' };
  }
}

async function executeGetTeamStats(args) {
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const db = getDatabase();
    const gamesContainer = db.container('games');

    const { resources } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.eventType = \'game-submission\'',
        parameters: []
      })
      .fetchAll();

    // Aggregate team stats from games
    const teamStats = {};
    for (const game of resources) {
      const homeTeam = game.homeTeam;
      const awayTeam = game.awayTeam;
      const finalScore = game.finalScore || {};

      // Initialize teams
      if (!teamStats[homeTeam]) {
        teamStats[homeTeam] = { teamName: homeTeam, gamesPlayed: 0, wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      }
      if (!teamStats[awayTeam]) {
        teamStats[awayTeam] = { teamName: awayTeam, gamesPlayed: 0, wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      }

      // Update stats
      teamStats[homeTeam].gamesPlayed++;
      teamStats[awayTeam].gamesPlayed++;

      const homeScore = finalScore[homeTeam] || 0;
      const awayScore = finalScore[awayTeam] || 0;

      teamStats[homeTeam].goalsFor += homeScore;
      teamStats[homeTeam].goalsAgainst += awayScore;
      teamStats[awayTeam].goalsFor += awayScore;
      teamStats[awayTeam].goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        teamStats[homeTeam].wins++;
        teamStats[awayTeam].losses++;
      } else if (awayScore > homeScore) {
        teamStats[awayTeam].wins++;
        teamStats[homeTeam].losses++;
      }
    }

    return Object.values(teamStats);
  } catch (error) {
    console.error('get_team_stats error:', error);
    return { error: 'Failed to fetch team data' };
  }
}

async function executeGetGameSummary(args) {
  try {
    const { getDatabase } = await import('./cosmosClient.js');
    const db = getDatabase();
    const gamesContainer = db.container('games');

    const { resources } = await gamesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @gameId',
        parameters: [{ name: '@gameId', value: args.gameId }]
      })
      .fetchAll();

    if (resources.length === 0) {
      return { error: 'Game not found' };
    }

    const game = resources[0];
    return {
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      finalScore: game.finalScore,
      division: game.division,
      gameDate: game.gameDate,
      status: game.status
    };
  } catch (error) {
    console.error('get_game_summary error:', error);
    return { error: 'Failed to fetch game data' };
  }
}

async function executeAggregateStats(args) {
  try {
    // This is a simplified implementation - in a real scenario you'd build complex queries
    const { getDatabase } = await import('./cosmosClient.js');
    const db = getDatabase();

    if (args.entity === 'players') {
      const playerStatsContainer = db.container('player-stats');
      const { resources } = await playerStatsContainer.items
        .query({
          query: 'SELECT TOP @limit * FROM c WHERE c.source = \'live\'',
          parameters: [{ name: '@limit', value: args.limit || 10 }]
        })
        .fetchAll();

      return resources;
    }

    return { message: 'Aggregation completed', count: 0 };
  } catch (error) {
    console.error('aggregate_stats error:', error);
    return { error: 'Failed to aggregate data' };
  }
}

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
  // Don't exit on server errors in development
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

// Graceful shutdown handlers - only in production
if (process.env.NODE_ENV === 'production') {
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
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in development
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});
