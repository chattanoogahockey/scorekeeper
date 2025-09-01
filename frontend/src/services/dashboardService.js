import axios from 'axios';

/**
 * Dashboard Service - Handles dashboard-related API calls and business logic
 * Centralizes event management and form submissions
 */
class DashboardService {
  constructor() {
    // In production on Azure, frontend and backend are on the same domain, so use relative URLs
    this.apiBase = '';
  }

  /**
   * Fetch events for a game
   */
  async fetchEvents(gameId) {
    try {
      const response = await axios.get(`${this.apiBase}/api/events`, {
        params: { gameId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to load events');
    }
  }

  /**
   * Submit a goal
   */
  async submitGoal(goalData) {
    try {
      const response = await axios.post(`${this.apiBase}/api/goals`, goalData);
      return response.data;
    } catch (error) {
      console.error('Error submitting goal:', error);
      throw new Error('Failed to submit goal');
    }
  }

  /**
   * Submit a penalty
   */
  async submitPenalty(penaltyData) {
    try {
      const response = await axios.post(`${this.apiBase}/api/penalties`, penaltyData);
      return response.data;
    } catch (error) {
      console.error('Error submitting penalty:', error);
      throw new Error('Failed to submit penalty');
    }
  }

  /**
   * Validate goal form
   */
  validateGoalForm(formData) {
    const required = ['period', 'team', 'player', 'time', 'shotType', 'goalType'];

    for (const field of required) {
      if (!formData[field]) {
        return `Missing required field: ${field}`;
      }
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.time)) {
      return 'Time must be in MM:SS format';
    }

    return null;
  }

  /**
   * Validate penalty form
   */
  validatePenaltyForm(formData) {
    const required = ['period', 'team', 'penalizedPlayer', 'penaltyType', 'length', 'time'];

    for (const field of required) {
      if (!formData[field]) {
        return `Missing required field: ${field}`;
      }
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.time)) {
      return 'Time must be in MM:SS format';
    }

    return null;
  }

  /**
   * Get players for a team
   */
  getPlayersForTeam(teamName, rosters) {
    const roster = rosters.find((r) => r.teamName === teamName);
    return roster ? roster.players : [];
  }

  /**
   * Calculate game progress for announcer context
   */
  calculateGameProgress(period, timeRemaining) {
    // Convert time string (MM:SS) to total seconds
    const [minutes, seconds] = timeRemaining.split(':').map(Number);
    const totalSecondsRemaining = (minutes * 60) + seconds;

    // Each period is 20 minutes (1200 seconds)
    const secondsPerPeriod = 20 * 60;

    // Calculate how much time has elapsed in current period
    const elapsedInCurrentPeriod = secondsPerPeriod - totalSecondsRemaining;

    // Calculate total elapsed time in game
    const totalElapsedTime = ((period - 1) * secondsPerPeriod) + elapsedInCurrentPeriod;

    // Total game time is 3 periods of 20 minutes each (3600 seconds)
    const totalGameTime = 3 * secondsPerPeriod;

    // Calculate progression percentage
    const percentage = Math.round((totalElapsedTime / totalGameTime) * 100);

    return {
      percentage,
      totalElapsedTime,
      totalSecondsRemaining,
      elapsedInCurrentPeriod
    };
  }
}

export const dashboardService = new DashboardService();
