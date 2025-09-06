import { config } from '../config/index.js';
import { asyncHandler } from '../middleware/index.js';
import { DatabaseService } from '../services/database.js';
import logger from '../../logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Health controller for system status and version endpoints
 */
export class HealthController {
  /**
   * Get system health status
   */
  static getHealth = asyncHandler(async (req, res) => {
    // Check service availability
    const services = {
      database: {
        available: config.cosmos.uri && config.cosmos.key && config.cosmos.databaseName,
        status: config.cosmos.uri && config.cosmos.key && config.cosmos.databaseName ? 'connected' : 'unavailable'
      },
      announcer: {
        available: false, // Will be updated when announcer service is available
        features: {
          singleMode: false,
          dualMode: false,
          penalties: false,
          commentary: false
        }
      },
      tts: {
        available: config.tts.enabled,
        provider: 'google-cloud'
      }
    };

    // Try to test database connection
    try {
      await DatabaseService.query('games', { query: 'SELECT TOP 1 * FROM c' });
      services.database.status = 'connected';
    } catch (error) {
      services.database.status = 'error';
      logger.warn('Database health check failed', { error: error.message });
    }

    const allServicesHealthy = services.database.available && services.tts.available;
    const status = allServicesHealthy ? 'healthy' : 'degraded';

    res.json({
      status,
      message: `Hockey Scorekeeper API is running in ${status} mode`,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: await this.getPackageVersion(),
      environment: config.env,
      services
    });
  });

  /**
   * Get version information
   */
  static getVersion = asyncHandler(async (req, res) => {
    // Set aggressive cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString()
    });

    const packageVersion = await this.getPackageVersion();
    let gitInfo = {};
    let buildTime;

    // First try environment variables (production deployment)
    if (process.env.BUILD_SOURCEVERSION || process.env.GITHUB_SHA) {
      gitInfo = {
        commit: process.env.BUILD_SOURCEVERSION || process.env.GITHUB_SHA,
        branch: process.env.BUILD_SOURCEBRANCH?.replace('refs/heads/', '') || process.env.GITHUB_REF_NAME || 'main'
      };
    } else {
      // Only try git commands if environment variables are not available (local development)
      try {
        const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: path.dirname(__dirname) }).trim();
        const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: path.dirname(__dirname) }).trim();
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

    // Prefer explicit deployment timestamp if provided
    if (process.env.DEPLOYMENT_TIMESTAMP) {
      try {
        buildTime = new Date(process.env.DEPLOYMENT_TIMESTAMP);
      } catch (parseError) {
        buildTime = new Date();
      }
    } else {
      buildTime = new Date();
    }

    // Format the time in Eastern timezone
    const formattedBuildTime = buildTime.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    const responseData = {
      version: packageVersion,
      name: await this.getPackageName(),
      ...gitInfo,
      buildTime: formattedBuildTime,
      timestamp: buildTime.toISOString(),
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      deploymentEnv: process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'
    };

    res.json(responseData);
  });

  /**
   * Update deployment timestamp (admin endpoint)
   */
  static updateDeploymentTime = asyncHandler(async (req, res) => {
    const { deploymentTimestamp } = req.body;

    if (!deploymentTimestamp) {
      return res.status(400).json({ error: 'Missing deploymentTimestamp' });
    }

    // Update the environment variable for this process instance
    process.env.DEPLOYMENT_TIMESTAMP = deploymentTimestamp;

    logger.info('Deployment timestamp updated', { deploymentTimestamp });

    res.json({
      success: true,
      message: 'Deployment timestamp updated',
      timestamp: deploymentTimestamp,
      updatedAt: new Date().toISOString()
    });
  });

  /**
   * Get package.json version
   * @returns {Promise<string>} Package version
   */
  static async getPackageVersion() {
    try {
      const packagePath = path.join(path.dirname(__dirname), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      logger.warn('Could not read package.json version', { error: error.message });
      return 'unknown';
    }
  }

  /**
   * Get package.json name
   * @returns {Promise<string>} Package name
   */
  static async getPackageName() {
    try {
      const packagePath = path.join(path.dirname(__dirname), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.name;
    } catch (error) {
      logger.warn('Could not read package.json name', { error: error.message });
      return 'scorekeeper';
    }
  }
}
