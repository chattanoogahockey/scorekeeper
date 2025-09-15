import staticDataService from './staticDataService.js';

/**
 * Dashboard Service - Handles dashboard data
 * Converted to use static JSON files
 */
class DashboardService {
  constructor() {
    this.dataService = staticDataService;
  }

  /**
   * Fetch dashboard summary data
   */
  async fetchDashboard() {
    try {
      const summary = await this.dataService.getSummary();
      const [players, teams, games] = await Promise.all([
        this.dataService.getPlayers(),
        this.dataService.getTeams(),
        this.dataService.getGames()
      ]);

      // Get recent games (last 5)
      const recentGames = games
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      // Get top scorers from summary or calculate from players
      const topScorers = summary.topScorers || 
        players
          .sort((a, b) => (b.stats?.points || 0) - (a.stats?.points || 0))
          .slice(0, 5)
          .map(p => ({
            playerId: p.id,
            name: p.name,
            team: p.team,
            points: p.stats?.points || 0,
            goals: p.stats?.goals || 0,
            assists: p.stats?.assists || 0
          }));

      return {
        summary: {
          totalPlayers: players.length,
          totalTeams: teams.length,
          totalGames: games.length,
          lastUpdate: summary.lastUpdated || new Date().toISOString()
        },
        topScorers,
        recentGames: recentGames.slice(0, 3),
        standings: summary.standings || {}
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to load dashboard data');
    }
  }

  /**
   * Get recent activity (games only, no real-time events)
   */
  async fetchRecentActivity() {
    try {
      const games = await this.dataService.getGames();
      
      // Convert recent games to activity format
      const activities = games
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(game => ({
          id: game.id,
          type: 'game',
          title: `${game.awayTeam} vs ${game.homeTeam}`,
          description: `Final Score: ${game.awayScore} - ${game.homeScore}`,
          timestamp: game.date,
          data: game
        }));

      return activities;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Get game events (goals, penalties)
   */
  async fetchEvents(gameId) {
    try {
      const games = await this.dataService.getGames();
      const game = games.find(g => g.id === gameId);
      
      if (!game) {
        return [];
      }

      // Combine goals and penalties into events
      const events = [];
      
      // Add goals as events
      if (game.goals) {
        game.goals.forEach(goal => {
          events.push({
            id: goal.id,
            type: 'goal',
            team: goal.team,
            player: goal.player,
            period: goal.period,
            time: goal.time,
            assists: goal.assists || [],
            timestamp: new Date(`${game.date}T${game.time || '19:00'}:00`).toISOString()
          });
        });
      }

      // Add penalties as events
      if (game.penalties) {
        game.penalties.forEach(penalty => {
          events.push({
            id: penalty.id,
            type: 'penalty',
            team: penalty.team,
            player: penalty.player,
            period: penalty.period,
            time: penalty.time,
            infraction: penalty.infraction,
            duration: penalty.duration,
            timestamp: new Date(`${game.date}T${game.time || '19:00'}:00`).toISOString()
          });
        });
      }

      // Sort by period and time
      return events.sort((a, b) => {
        if (a.period !== b.period) {
          return a.period - b.period;
        }
        // Simple time sorting (MM:SS format)
        const [aMin, aSec] = a.time.split(':').map(Number);
        const [bMin, bSec] = b.time.split(':').map(Number);
        return (aMin * 60 + aSec) - (bMin * 60 + bSec);
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  /**
   * For static data, these submission methods will just return success
   * In a real static implementation, you might save to localStorage
   * or require manual data file updates
   */
  async submitGoal(goalData) {
    console.log('Goal submitted (static mode):', goalData);
    return { success: true, message: 'Goal recorded (static mode)' };
  }

  async submitPenalty(penaltyData) {
    console.log('Penalty submitted (static mode):', penaltyData);
    return { success: true, message: 'Penalty recorded (static mode)' };
  }

  async updateGameScore(gameId, scoreUpdate) {
    console.log('Score updated (static mode):', gameId, scoreUpdate);
    return { success: true, message: 'Score updated (static mode)' };
  }

  async updateGamePeriod(gameId, period) {
    console.log('Period updated (static mode):', gameId, period);
    return { success: true, message: 'Period updated (static mode)' };
  }
}

export const dashboardService = new DashboardService();