import staticDataService from './staticDataService.js';

/**
 * Statistics Service - Handles all statistics-related data fetching
 * Now uses static JSON files instead of API calls
 */
class StatisticsService {
  constructor() {
    this.dataService = staticDataService;
  }

  /**
   * Fetch player statistics with filters
   */
  async fetchPlayerStats(filters = {}) {
    try {
      // Convert filters to our static data service format
      const staticFilters = {};

      if (filters.division && filters.division !== 'All') {
        staticFilters.division = filters.division;
      }

      // For 2025 Fall season specifically, only show players with GP > 0
      const is2025Fall = filters.year === '2025' && filters.season === 'Fall';
      if (is2025Fall) {
        staticFilters.minGamesPlayed = 1;
      }

      // For current season stats (when no year/season filters are applied), only show rostered players
      const isCurrentSeason = (!filters.year || filters.year === 'All') &&
                             (!filters.season || filters.season === 'All');
      if (isCurrentSeason) {
        staticFilters.rostered = true;
      }

      const result = await this.dataService.getPlayerStats(staticFilters);
      
      // Return the player data in expected format
      return result.data || [];
    } catch (error) {
      console.error('Error fetching player stats:', error);
      throw new Error('Failed to load player statistics');
    }
  }

  /**
   * Fetch team statistics
   */
  async fetchTeamStats(filters = {}) {
    try {
      const staticFilters = {};

      if (filters.division && filters.division !== 'All') {
        staticFilters.division = filters.division;
      }

      const result = await this.dataService.getTeamStats(staticFilters);
      return result.data || [];
    } catch (error) {
      console.error('Error fetching team stats:', error);
      throw new Error('Failed to load team statistics');
    }
  }

  /**
   * Fetch seasonal data for charts
   */
  async fetchSeasonalData(filters = {}) {
    try {
      // For static data, we'll return the current player stats
      // In a real implementation, you'd have historical data
      const staticFilters = {};

      if (filters.division && filters.division !== 'All') {
        staticFilters.division = filters.division;
      }

      const result = await this.dataService.getPlayerStats(staticFilters);
      return result.data || [];
    } catch (error) {
      console.error('Error fetching seasonal data:', error);
      return [];
    }
  }

  /**
   * Fetch metadata (seasons, years, divisions)
   */
  async fetchMeta() {
    try {
      const divisions = await this.dataService.getDivisions();
      
      return {
        divisions: ['All', ...divisions],
        seasons: ['All', 'Fall', 'Winter'],
        years: ['All', '2024', '2023', '2022']
      };
    } catch (error) {
      console.error('Error fetching metadata:', error);
      // Return defaults if data service fails
      return {
        divisions: ['All', 'A', 'B'],
        seasons: ['All', 'Fall', 'Winter'],
        years: ['All', '2024', '2023', '2022']
      };
    }
  }

  /**
   * Get standings
   */
  async fetchStandings(division = null) {
    try {
      return await this.dataService.getStandings(division);
    } catch (error) {
      console.error('Error fetching standings:', error);
      return {};
    }
  }

  /**
   * Get top scorers
   */
  async fetchTopScorers(limit = 10) {
    try {
      return await this.dataService.getTopScorers(limit);
    } catch (error) {
      console.error('Error fetching top scorers:', error);
      return [];
    }
  }
}

export const statisticsService = new StatisticsService();