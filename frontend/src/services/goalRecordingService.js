/**
 * Goal Recording Service - Handles goal-related business logic
 * Converted for static data usage
 */
class GoalRecordingService {
  constructor() {
    // No API calls in static mode
  }

  /**
   * Calculate goal context (keeping this for DJ soundboard functionality)
   */
  determineGoalContext(scoringTeam, currentScore, selectedGame) {
    const awayTeam = selectedGame.awayTeam || selectedGame.awayteam;
    const homeTeam = selectedGame.homeTeam || selectedGame.hometeam;
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

    const scoreDifference = Math.abs(newAwayScore - newHomeScore);

    // Tie game
    if (newAwayScore === newHomeScore) {
      return "Tie game";
    }

    // Game winner (in 3rd period with < 2 minutes)
    if (selectedGame.period === 3 && scoreDifference > 2) {
      return "Game effectively over";
    }

    // Go-ahead goal
    if (totalGoals > 0) {
      const wasAwayLeading = currentScore.away > currentScore.home;
      const wasHomeLeading = currentScore.home > currentScore.away;
      const wasTied = currentScore.away === currentScore.home;

      if (wasTied || (isAwayTeamScoring && wasHomeLeading) || (!isAwayTeamScoring && wasAwayLeading)) {
        return "Go-ahead goal";
      }
    }

    // Insurance goal (extending lead by 2+)
    if (scoreDifference >= 2) {
      return "Insurance goal";
    }

    return "Regular goal";
  }

  /**
   * Submit goal (static mode - just log for now)
   */
  async submitGoal(goalData) {
    try {
      console.log('Goal submitted (static mode):', goalData);
      
      // In static mode, you could save to localStorage for persistence
      const existingGoals = JSON.parse(localStorage.getItem('hockey_goals') || '[]');
      const newGoal = {
        ...goalData,
        id: `goal_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      existingGoals.push(newGoal);
      localStorage.setItem('hockey_goals', JSON.stringify(existingGoals));

      return {
        success: true,
        data: newGoal,
        message: 'Goal recorded successfully (static mode)'
      };
    } catch (error) {
      console.error('Error submitting goal:', error);
      return {
        success: false,
        error: 'Failed to record goal'
      };
    }
  }

  /**
   * Get goals from localStorage
   */
  async getGoals(gameId = null) {
    try {
      const goals = JSON.parse(localStorage.getItem('hockey_goals') || '[]');
      
      if (gameId) {
        return goals.filter(goal => goal.gameId === gameId);
      }
      
      return goals;
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  /**
   * Update game score (static mode)
   */
  async updateGameScore(gameId, scoreData) {
    try {
      console.log('Score updated (static mode):', gameId, scoreData);
      
      // Save to localStorage
      const existingScores = JSON.parse(localStorage.getItem('hockey_scores') || '{}');
      existingScores[gameId] = {
        ...scoreData,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('hockey_scores', JSON.stringify(existingScores));

      return {
        success: true,
        data: scoreData,
        message: 'Score updated successfully (static mode)'
      };
    } catch (error) {
      console.error('Error updating score:', error);
      return {
        success: false,
        error: 'Failed to update score'
      };
    }
  }

  /**
   * Get current game score from localStorage
   */
  async getCurrentScore(gameId) {
    try {
      const scores = JSON.parse(localStorage.getItem('hockey_scores') || '{}');
      return scores[gameId] || { home: 0, away: 0 };
    } catch (error) {
      console.error('Error getting current score:', error);
      return { home: 0, away: 0 };
    }
  }
}

export const goalRecordingService = new GoalRecordingService();