import axios from 'axios';

/**
 * Goal Recording Service - Handles goal-related business logic and API calls
 * Centralizes goal context calculation and data operations
 */
class GoalRecordingService {
  constructor() {
    this.apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL || '';
  }

  /**
   * Calculate goal context for AI announcer
   */
  determineGoalContext(scoringTeam, currentScore, selectedGame) {
    const awayTeam = selectedGame.awayTeam;
    const homeTeam = selectedGame.homeTeam;
    const isAwayTeamScoring = scoringTeam === awayTeam;

    // Calculate score after this goal
    const newAwayScore = currentScore.away + (isAwayTeamScoring ? 1 : 0);
    const newHomeScore = currentScore.home + (isAwayTeamScoring ? 0 : 1);

    // Total goals before this one
    const totalGoals = currentScore.away + currentScore.home;

    // First goal of the game
    if (totalGoals === 0) {
      return "First goal of game";
    }

    // Tying goal (score becomes tied)
    if (newAwayScore === newHomeScore) {
      return "Tying goal";
    }

    // Go-ahead goal (from tied to leading)
    if (currentScore.away === currentScore.home) {
      return "Go-ahead goal";
    }

    // Game-winning goal scenarios (extending lead significantly)
    const leadDifference = Math.abs(newAwayScore - newHomeScore);
    if (leadDifference >= 3) {
      return "Insurance goal";
    }

    // Comeback goal (reducing opponent's lead)
    const previousLead = Math.abs(currentScore.away - currentScore.home);
    const newLead = Math.abs(newAwayScore - newHomeScore);
    if (previousLead > newLead && previousLead >= 2) {
      return "Comeback goal";
    }

    return "Regular goal";
  }

  /**
   * Fetch existing goals for a game
   */
  async fetchExistingGoals(gameId) {
    try {
      const response = await axios.get(`${this.apiBase}/api/goals`, {
        params: { gameId }
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching existing goals:', error);
      return [];
    }
  }

  /**
   * Submit a new goal
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
   * Calculate current score from goals
   */
  calculateCurrentScore(goals, selectedGame) {
    const awayScore = goals.filter(g => g.scoringTeam === selectedGame.awayTeam).length;
    const homeScore = goals.filter(g => g.scoringTeam === selectedGame.homeTeam).length;
    return { away: awayScore, home: homeScore };
  }

  /**
   * Validate goal form data
   */
  validateGoalForm(formData) {
    const required = ['period', 'team', 'player', 'time', 'shotType', 'goalType'];

    for (const field of required) {
      if (!formData[field]) {
        return `Missing required field: ${field}`;
      }
    }

    // Validate time format (MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.time)) {
      return 'Time must be in MM:SS format';
    }

    // Validate period (1-3)
    if (formData.period < 1 || formData.period > 3) {
      return 'Period must be between 1 and 3';
    }

    return null; // No errors
  }

  /**
   * Get available players for a team
   */
  getPlayersForTeam(teamName, rosters) {
    const roster = rosters.find((r) => r.teamName === teamName);
    return roster ? roster.players : [];
  }
}

export const goalRecordingService = new GoalRecordingService();
