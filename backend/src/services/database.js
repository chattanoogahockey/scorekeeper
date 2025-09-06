import {
  getGamesContainer,
  getPlayerStatsContainer,
  getGoalsContainer,
  getPenaltiesContainer,
  getRostersContainer,
  getAttendanceContainer,
  getOTShootoutContainer,
  getShotsOnGoalContainer,
  getHistoricalPlayerStatsContainer
} from '../../cosmosClient.js';
import logger from '../../logger.js';

/**
 * Database service class for handling all database operations
 */
export class DatabaseService {
  /**
   * Get container by name
   * @param {string} containerName - Name of the container
   * @returns {Object} Container instance
   */
  static getContainer(containerName) {
    const containerMap = {
      'games': getGamesContainer,
      'player-stats': getPlayerStatsContainer,
      'goals': getGoalsContainer,
      'penalties': getPenaltiesContainer,
      'rosters': getRostersContainer,
      'attendance': getAttendanceContainer,
      'ot-shootout': getOTShootoutContainer,
      'shots-on-goal': getShotsOnGoalContainer,
      'historical-player-stats': getHistoricalPlayerStatsContainer
    };

    const getter = containerMap[containerName];
    if (!getter) {
      throw new Error(`Unknown container: ${containerName}`);
    }

    return getter();
  }

  /**
   * Execute a query on a container
   * @param {string} containerName - Container name
   * @param {Object} querySpec - Query specification
   * @returns {Promise<Object[]>} Query results
   */
  static async query(containerName, querySpec) {
    try {
      const container = this.getContainer(containerName);
      const { resources } = await container.items.query(querySpec).fetchAll();
      return resources;
    } catch (error) {
      logger.error(`Database query error on ${containerName}`, {
        error: error.message,
        query: querySpec
      });
      throw error;
    }
  }

  /**
   * Create a new item in a container
   * @param {string} containerName - Container name
   * @param {Object} item - Item to create
   * @returns {Promise<Object>} Created item
   */
  static async create(containerName, item) {
    try {
      const container = this.getContainer(containerName);
      const { resource } = await container.items.create(item);
      logger.info(`Item created in ${containerName}`, { id: item.id });
      return resource;
    } catch (error) {
      logger.error(`Database create error on ${containerName}`, {
        error: error.message,
        itemId: item.id
      });
      throw error;
    }
  }

  /**
   * Get an item by ID
   * @param {string} containerName - Container name
   * @param {string} id - Item ID
   * @param {string} [partitionKey] - Partition key
   * @returns {Promise<Object|null>} Found item or null
   */
  static async getById(containerName, id, partitionKey) {
    try {
      const container = this.getContainer(containerName);
      const { resource } = await container.item(id, partitionKey || id).read();
      return resource;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Database get error on ${containerName}`, {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Update an item in a container
   * @param {string} containerName - Container name
   * @param {string} id - Item ID
   * @param {Object} updates - Updates to apply
   * @param {string} [partitionKey] - Partition key
   * @returns {Promise<Object>} Updated item
   */
  static async update(containerName, id, updates, partitionKey) {
    try {
      const container = this.getContainer(containerName);
      const existingItem = await this.getById(containerName, id, partitionKey);

      if (!existingItem) {
        throw new Error(`Item not found: ${id}`);
      }

      const updatedItem = { ...existingItem, ...updates, updatedAt: new Date().toISOString() };
      const { resource } = await container.item(id, partitionKey || id).replace(updatedItem);

      logger.info(`Item updated in ${containerName}`, { id });
      return resource;
    } catch (error) {
      logger.error(`Database update error on ${containerName}`, {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Upsert an item in a container
   * @param {string} containerName - Container name
   * @param {Object} item - Item to upsert
   * @returns {Promise<Object>} Upserted item
   */
  static async upsert(containerName, item) {
    try {
      const container = this.getContainer(containerName);
      const { resource } = await container.items.upsert(item);
      logger.info(`Item upserted in ${containerName}`, { id: item.id });
      return resource;
    } catch (error) {
      logger.error(`Database upsert error on ${containerName}`, {
        error: error.message,
        itemId: item.id
      });
      throw error;
    }
  }

  /**
   * Delete an item from a container
   * @param {string} containerName - Container name
   * @param {string} id - Item ID
   * @param {string} [partitionKey] - Partition key
   * @returns {Promise<void>}
   */
  static async delete(containerName, id, partitionKey) {
    try {
      const container = this.getContainer(containerName);
      await container.item(id, partitionKey || id).delete();
      logger.info(`Item deleted from ${containerName}`, { id });
    } catch (error) {
      logger.error(`Database delete error on ${containerName}`, {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Get games with optional filtering
   * @param {Object} filters - Filters to apply
   * @returns {Promise<Object[]>} Games array with normalized field names
   */
  static async getGames(filters = {}) {
    let querySpec;

    if (filters.gameId) {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id OR c.gameId = @id',
        parameters: [{ name: '@id', value: filters.gameId }]
      };
    } else if (filters.division && filters.division.toLowerCase() !== 'all') {
      querySpec = {
        query: 'SELECT * FROM c WHERE LOWER(c.division) = LOWER(@division)',
        parameters: [{ name: '@division', value: filters.division }]
      };
    } else {
      querySpec = { query: 'SELECT * FROM c' };
    }

    return await this.query('games', querySpec);
  }  /**
   * Get submitted games
   * @returns {Promise<Object[]>} Submitted games array
   */
  static async getSubmittedGames() {
    const submissions = await this.query('games', {
      query: 'SELECT * FROM c WHERE c.eventType = \'game-submission\'',
      parameters: []
    });

    const submittedGames = [];
    for (const submission of submissions) {
      try {
        const game = await this.getById('games', submission.gameId);
        if (game) {
          submittedGames.push({
            ...game,
            gameStatus: 'submitted',
            submittedAt: submission.submittedAt,
            finalScore: submission.finalScore,
            totalGoals: submission.totalGoals,
            totalPenalties: submission.totalPenalties,
            gameSummary: submission.gameSummary,
            submissionId: submission.id
          });
        }
      } catch (error) {
        logger.warn(`Error fetching game ${submission.gameId}`, { error: error.message });
      }
    }

    return submittedGames;
  }

  /**
   * Get rosters with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} [filters.gameId] - Game ID to get rosters for
   * @param {string} [filters.teamName] - Team name filter
   * @param {string} [filters.season] - Season filter
   * @param {string} [filters.division] - Division filter
   * @returns {Promise<Object[]>} Rosters array
   */
  static async getRosters(filters = {}) {
    if (filters.gameId) {
      // Query for the game instead of using getById to avoid partition key issues
      const games = await this.query('games', {
        query: 'SELECT * FROM c WHERE c.id = @gameId',
        parameters: [{ name: '@gameId', value: filters.gameId }]
      });

      if (!games || games.length === 0) {
        throw new Error(`Game not found: ${filters.gameId}`);
      }

      const game = games[0];
      const homeTeam = game.homeTeam;
      const awayTeam = game.awayTeam;

      if (!homeTeam || !awayTeam) {
        throw new Error(`Game missing team data: homeTeam=${homeTeam}, awayTeam=${awayTeam}`);
      }

      const rosters = [];

      // Query for home team roster
      const homeRosters = await this.query('rosters', {
        query: 'SELECT * FROM c WHERE c.teamName = @home',
        parameters: [{ name: '@home', value: homeTeam }]
      });

      // Query for away team roster
      const awayRosters = await this.query('rosters', {
        query: 'SELECT * FROM c WHERE c.teamName = @away',
        parameters: [{ name: '@away', value: awayTeam }]
      });

      rosters.push(...homeRosters, ...awayRosters);

      if (rosters.length === 0) {
        throw new Error(`No rosters found for teams: ${homeTeam} vs ${awayTeam}`);
      }

      return rosters;
    }

    // Build dynamic query for other filters
    const conditions = [];
    const parameters = [];

    if (filters.teamName) {
      conditions.push('c.teamName = @teamName');
      parameters.push({ name: '@teamName', value: filters.teamName });
    }

    if (filters.season) {
      conditions.push('c.season = @season');
      parameters.push({ name: '@season', value: filters.season });
    }

    if (filters.division) {
      conditions.push('LOWER(c.division) = LOWER(@division)');
      parameters.push({ name: '@division', value: filters.division });
    }

    const querySpec = conditions.length > 0
      ? {
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
        parameters
      }
      : { query: 'SELECT * FROM c' };

    return this.query('rosters', querySpec);
  }

  /**
   * Get game events (goals and penalties)
   * @param {Object} filters - Filter options
   * @param {string} [filters.gameId] - Game ID filter
   * @param {string} [filters.eventType] - Event type filter
   * @returns {Promise<Object[]>} Game events array
   */
  static async getGameEvents(filters = {}) {
    const goalsQuery = {
      query: filters.gameId
        ? 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC'
        : 'SELECT * FROM c ORDER BY c.recordedAt DESC',
      parameters: filters.gameId ? [{ name: '@gameId', value: filters.gameId }] : []
    };

    const penaltiesQuery = {
      query: filters.gameId
        ? 'SELECT * FROM c WHERE c.gameId = @gameId ORDER BY c.recordedAt DESC'
        : 'SELECT * FROM c ORDER BY c.recordedAt DESC',
      parameters: filters.gameId ? [{ name: '@gameId', value: filters.gameId }] : []
    };

    const [goals, penalties] = await Promise.all([
      filters.eventType === 'penalty' ? Promise.resolve([]) : this.query('goals', goalsQuery),
      filters.eventType === 'goal' ? Promise.resolve([]) : this.query('penalties', penaltiesQuery)
    ]);

    // Normalize and merge events
    const normalizeEvent = (event, type) => ({
      eventType: type,
      ...event,
      recordedAt: event.recordedAt || (event._ts ? new Date(event._ts * 1000).toISOString() : new Date(0).toISOString())
    });

    const events = [
      ...goals.map(g => normalizeEvent(g, 'goal')),
      ...penalties.map(p => normalizeEvent(p, 'penalty'))
    ];

    return events.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
  }
}
