/**
 * Static Data Service - Replaces API calls with static JSON file loading
 * All data is loaded from public/data/ directory
 */
class StaticDataService {
  constructor() {
    this.cache = new Map();
    this.baseUrl = window.location.origin;
    // Fallback base URL for local development
    if (window.location.pathname.includes('/scorekeeper/')) {
      this.baseUrl += '/scorekeeper';
    }
  }

  /**
   * Load JSON data with caching
   */
  async loadData(filename) {
    if (this.cache.has(filename)) {
      return this.cache.get(filename);
    }

    try {
      const response = await fetch(`${this.baseUrl}/data/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }
      
      const data = await response.json();
      this.cache.set(filename, data);
      return data;
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return null;
    }
  }

  /**
   * Get all games
   */
  async getGames() {
    return await this.loadData('games.json') || [];
  }

  /**
   * Get all players
   */
  async getPlayers() {
    return await this.loadData('players.json') || [];
  }

  /**
   * Get all teams/rosters
   */
  async getTeams() {
    return await this.loadData('teams.json') || [];
  }

  /**
   * Get summary data
   */
  async getSummary() {
    return await this.loadData('summary.json') || {};
  }

  /**
   * Get player statistics with filtering
   */
  async getPlayerStats(filters = {}) {
    const players = await this.getPlayers();
    let filteredPlayers = [...players];

    // Apply division filter
    if (filters.division && filters.division !== 'All') {
      filteredPlayers = filteredPlayers.filter(p => p.division === filters.division);
    }

    // Apply minimum games played filter
    if (filters.minGamesPlayed) {
      filteredPlayers = filteredPlayers.filter(p => p.stats.gamesPlayed >= filters.minGamesPlayed);
    }

    // Apply rostered filter (players with games played > 0)
    if (filters.rostered) {
      filteredPlayers = filteredPlayers.filter(p => p.stats.gamesPlayed > 0);
    }

    // Sort by points (goals + assists)
    filteredPlayers.sort((a, b) => b.stats.points - a.stats.points);

    return {
      success: true,
      data: filteredPlayers,
      filters: filters
    };
  }

  /**
   * Get team statistics
   */
  async getTeamStats(filters = {}) {
    const teams = await this.getTeams();
    let filteredTeams = [...teams];

    // Apply division filter
    if (filters.division && filters.division !== 'All') {
      filteredTeams = filteredTeams.filter(t => t.division === filters.division);
    }

    // Sort by points (wins * 2)
    filteredTeams.sort((a, b) => (b.stats.wins * 2) - (a.stats.wins * 2));

    return {
      success: true,
      data: filteredTeams,
      filters: filters
    };
  }

  /**
   * Get games for a specific date range
   */
  async getGamesByDateRange(startDate, endDate) {
    const games = await this.getGames();
    
    return games.filter(game => {
      const gameDate = new Date(game.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return gameDate >= start && gameDate <= end;
    });
  }

  /**
   * Get games for a specific team
   */
  async getGamesByTeam(teamName) {
    const games = await this.getGames();
    
    return games.filter(game => 
      game.homeTeam === teamName || game.awayTeam === teamName
    );
  }

  /**
   * Get player details by ID
   */
  async getPlayerById(playerId) {
    const players = await this.getPlayers();
    return players.find(p => p.id === playerId);
  }

  /**
   * Get team details by ID
   */
  async getTeamById(teamId) {
    const teams = await this.getTeams();
    return teams.find(t => t.id === teamId);
  }

  /**
   * Get recent games
   */
  async getRecentGames(limit = 10) {
    const games = await this.getGames();
    return games
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }

  /**
   * Get available divisions
   */
  async getDivisions() {
    const summary = await this.getSummary();
    return summary.divisions || ['A', 'B'];
  }

  /**
   * Calculate league standings
   */
  async getStandings(division = null) {
    const summary = await this.getSummary();
    
    if (division && division !== 'All') {
      return summary.standings[division] || [];
    }
    
    // Return all standings
    return summary.standings || {};
  }

  /**
   * Get top scorers
   */
  async getTopScorers(limit = 10) {
    const summary = await this.getSummary();
    const topScorers = summary.topScorers || [];
    
    return topScorers.slice(0, limit);
  }

  /**
   * Clear cache (useful for refreshing data)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Health check - verify all data files are accessible
   */
  async healthCheck() {
    try {
      const [games, players, teams, summary] = await Promise.all([
        this.getGames(),
        this.getPlayers(), 
        this.getTeams(),
        this.getSummary()
      ]);

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        dataFiles: {
          games: games ? games.length : 0,
          players: players ? players.length : 0,
          teams: teams ? teams.length : 0,
          summary: summary ? Object.keys(summary).length : 0
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const staticDataService = new StaticDataService();

export default staticDataService;