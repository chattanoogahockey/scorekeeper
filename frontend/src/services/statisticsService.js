import axios from 'axios';

/**
 * Statistics Service - Handles all statistics-related API calls
 * Centralizes data fetching logic and error handling
 */
class StatisticsService {
  constructor() {
    // Use environment variable for API base URL in development, relative URLs in production
    this.apiBase = import.meta.env.VITE_API_BASE_URL || '';
  }

  /**
   * Fetch player statistics with filters
   */
  async fetchPlayerStats(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.division && filters.division !== 'All') {
        params.append('division', filters.division);
      }
      if (filters.season && filters.season !== 'All') {
        params.append('season', filters.season);
      }
      if (filters.year && filters.year !== 'All') {
        params.append('year', filters.year);
      }

      // For 2025 Fall season specifically, only show players with GP > 0
      const is2025Fall = filters.year === '2025' && filters.season === 'Fall';
      if (is2025Fall) {
        params.append('minGamesPlayed', '1');
      }

      // For current season stats (when no year/season filters are applied), only show rostered players
      const isCurrentSeason = (!filters.year || filters.year === 'All') &&
                             (!filters.season || filters.season === 'All');
      if (isCurrentSeason) {
        params.append('rostered', 'true');
      }

      // Add cache-busting parameter
      params.append('_t', Date.now().toString());

      const { data } = await axios.get(`${this.apiBase}/api/player-stats?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Handle different response formats from backend
      let playerData = [];
      if (data.data && Array.isArray(data.data)) {
        playerData = data.data;
      } else if (Array.isArray(data)) {
        playerData = data;
      } else if (data.data) {
        playerData = Array.isArray(data.data) ? data.data : [];
      } else if (data.value && Array.isArray(data.value)) {
        playerData = data.value;
      }

      return playerData;
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
      const params = new URLSearchParams();

      if (filters.division && filters.division !== 'All') {
        params.append('division', filters.division);
      }

      // Add cache-busting parameter
      params.append('_t', Date.now().toString());

      const { data } = await axios.get(`${this.apiBase}/api/team-stats?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Handle different response formats from backend
      let teamData = [];
      if (Array.isArray(data)) {
        teamData = data;
      } else if (data.data && Array.isArray(data.data)) {
        teamData = data.data;
      } else if (data.value && Array.isArray(data.value)) {
        teamData = data.value;
      }

      return teamData;
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
      const params = new URLSearchParams();

      if (filters.division && filters.division !== 'All') {
        params.append('division', filters.division);
      }

      params.append('scope', 'historical');
      params.append('_t', Date.now().toString());

      const { data } = await axios.get(`${this.apiBase}/api/player-stats?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Handle different response formats from backend
      let seasonalData = [];
      if (Array.isArray(data)) {
        seasonalData = data;
      } else if (data.data && Array.isArray(data.data)) {
        seasonalData = data.data;
      } else if (data.value && Array.isArray(data.value)) {
        seasonalData = data.value;
      }

      return seasonalData;
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
      const { data } = await axios.get(`${this.apiBase}/api/games`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Handle backend response format: {success: true, games: [...], meta: {...}}
      let games = [];
      if (data.games && Array.isArray(data.games)) {
        games = data.games;
      } else if (Array.isArray(data)) {
        games = data;
      } else if (data.value && Array.isArray(data.value)) {
        games = data.value;
      }

      // Extract unique values
      const divisions = [...new Set(games.map(game => game.division).filter(Boolean))];
      const seasons = ['All', 'Fall', 'Winter'];
      // Extract years from season field (format: "2025 Fall")
      const years = ['All', ...[...new Set(games.map(game => {
        if (game.season && typeof game.season === 'string') {
          const yearMatch = game.season.match(/^(\d{4})/);
          return yearMatch ? yearMatch[1] : null;
        }
        return null;
      }).filter(Boolean))].sort().reverse()];

      return { divisions, seasons, years };
    } catch (error) {
      console.error('Error fetching metadata:', error);
      // Return defaults if API fails
      return {
        divisions: ['Gold', 'Silver', 'Bronze'],
        seasons: ['All', 'Fall', 'Winter'],
        years: ['All', '2025', '2024', '2023']
      };
    }
  }
}

export const statisticsService = new StatisticsService();
