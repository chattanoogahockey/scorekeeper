import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import configuration and validation
import { config, validateConfig } from './src/config/index.js';

// Validate configuration
validateConfig();

// Import services
import logger from './logger.js';
import { cacheService } from './src/services/cache.js';

// Import middleware
import {
  requestLogger,
  corsHandler,
  asyncHandler,
  validateBody
} from './src/middleware/index.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

// Import routes
import apiRoutes from './src/routes/api.js';

// Import legacy services (conditionally)
let ttsService = null;
let createGoalAnnouncement = null;
let generateGoalAnnouncement = null;
let generateScorelessCommentary = null;
let generateGoalFeedDescription = null;
let generatePenaltyFeedDescription = null;
let generatePenaltyAnnouncement = null;
let generateDualGoalAnnouncement = null;
let generateDualPenaltyAnnouncement = null;
let generateDualRandomCommentary = null;

// Conditionally import announcer service
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

// Import TTS service
try {
  const ttsModule = await import('./ttsService.js');
  ttsService = ttsModule.default;
} catch (error) {
  logger.warn('TTS service not available', { error: error.message });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(corsHandler);
app.use(requestLogger);

// API routes
app.use('/api', apiRoutes);

// Static file serving for production builds
if (config.isProduction) {
  const staticPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(staticPath));

  // Serve React app for any unmatched routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize announcer if available
async function initializeAnnouncer() {
  try {
    if (ttsService && generateDualRandomCommentary) {
      // Light OpenAI warmup
      await generateDualRandomCommentary('warmup', { division: 'Warmup' });
    }
  } catch (error) {
    logger.warn('Announcer warmup failed', { error: error.message });
  }
}

// Start server
const server = app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    environment: config.env,
    version: process.env.npm_package_version || 'unknown'
  });

  // Schedule announcer warmup
  setTimeout(() => {
    initializeAnnouncer();
  }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
