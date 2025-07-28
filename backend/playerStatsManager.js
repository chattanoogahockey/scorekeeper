/**
 * Player Stats Calculator and Manager
 * Calculates and maintains analytical data for AI announcer
 */

import { getDatabase, getAttendanceContainer, getRostersContainer, getGamesContainer } from './cosmosClient.js';

class PlayerStatsManager {
  constructor() {
    this.statsContainer = null;
  }

  async init() {
    const database = await getDatabase();
    this.statsContainer = database.container('player-stats');
  }

  /**
   * Calculate comprehensive stats for a player
   */
  async calculatePlayerStats(playerId, playerName, teamName) {
    try {
      // Get all attendance records
      const attendanceContainer = await getAttendanceContainer();
      const { resources: attendanceRecords } = await attendanceContainer.items.readAll().fetchAll();
      
      // Get all games for context
      const gamesContainer = await getGamesContainer();
      const { resources: allGames } = await gamesContainer.items.readAll().fetchAll();
      
      // Filter games for this player's team
      const teamGames = allGames.filter(game => 
        game.homeTeam === teamName || game.awayTeam === teamName ||
        game.homeTeamId === teamName || game.awayTeamId === teamName
      );
      
      // Calculate attendance stats
      let gamesAttended = 0;
      let totalTeamGames = 0;
      let attendanceHistory = [];
      
      // Process each attendance record
      attendanceRecords.forEach(record => {
        // Check if this game involved the player's team
        const gameInvolvesTeam = record.roster.some(team => team.teamName === teamName);
        if (!gameInvolvesTeam) return;
        
        totalTeamGames++;
        
        // Check if player attended
        const teamAttendance = record.attendance.find(team => team.teamName === teamName);
        if (teamAttendance && teamAttendance.playersPresent.includes(playerName)) {
          gamesAttended++;
          attendanceHistory.push({
            gameId: record.gameId,
            date: record.recordedAt,
            attended: true
          });
        } else {
          attendanceHistory.push({
            gameId: record.gameId,
            date: record.recordedAt,
            attended: false
          });
        }
      });
      
      // Calculate percentages and trends
      const attendancePercentage = totalTeamGames > 0 ? Math.round((gamesAttended / totalTeamGames) * 100) : 0;
      
      // Calculate recent form (last 5 games)
      const recentGames = attendanceHistory.slice(-5);
      const recentAttendance = recentGames.filter(g => g.attended).length;
      const recentPercentage = recentGames.length > 0 ? Math.round((recentAttendance / recentGames.length) * 100) : 0;
      
      // Create stats object
      const stats = {
        id: `${playerId}-stats`,
        playerId: playerId,
        playerName: playerName,
        teamName: teamName,
        season: '2024-25', // TODO: Make this dynamic
        
        // Attendance Analytics
        attendance: {
          gamesAttended: gamesAttended,
          totalTeamGames: totalTeamGames,
          attendancePercentage: attendancePercentage,
          recentForm: {
            lastFiveGames: recentGames.length,
            recentAttendance: recentAttendance,
            recentPercentage: recentPercentage
          },
          history: attendanceHistory
        },
        
        // Game Performance (placeholder for future stats)
        performance: {
          goals: 0,
          assists: 0,
          points: 0,
          averagePointsPerGame: 0,
          penaltyMinutes: 0
        },
        
        // AI Announcer Insights
        insights: {
          reliabilityRating: this.calculateReliabilityRating(attendancePercentage, recentPercentage),
          trend: this.calculateTrend(attendanceHistory),
          announcements: this.generateAnnouncements(playerName, attendancePercentage, gamesAttended, totalTeamGames)
        },
        
        // Metadata
        lastUpdated: new Date().toISOString(),
        dataVersion: '1.0'
      };
      
      return stats;
    } catch (error) {
      console.error(`Error calculating stats for ${playerName}:`, error);
      throw error;
    }
  }

  /**
   * Calculate reliability rating based on overall and recent performance
   */
  calculateReliabilityRating(overall, recent) {
    if (overall >= 90 && recent >= 80) return 'Highly Reliable';
    if (overall >= 70 && recent >= 60) return 'Reliable';
    if (overall >= 50) return 'Moderately Reliable';
    if (overall >= 30) return 'Inconsistent';
    return 'Unreliable';
  }

  /**
   * Calculate attendance trend
   */
  calculateTrend(history) {
    if (history.length < 3) return 'Insufficient Data';
    
    const recent = history.slice(-3);
    const attendedRecent = recent.filter(g => g.attended).length;
    
    if (attendedRecent === 3) return 'Hot Streak';
    if (attendedRecent === 0) return 'Cold Streak';
    if (attendedRecent >= 2) return 'Improving';
    return 'Declining';
  }

  /**
   * Generate AI announcer text snippets
   */
  generateAnnouncements(name, percentage, attended, total) {
    const announcements = [];
    
    // Attendance-based announcements
    if (percentage >= 90) {
      announcements.push(`${name} is one of our most reliable players, showing up to ${percentage}% of games this season!`);
    } else if (percentage >= 70) {
      announcements.push(`${name} has been solid this season with ${percentage}% attendance.`);
    } else if (percentage < 50) {
      announcements.push(`${name} has attended ${attended} of ${total} games this season.`);
    }
    
    // Milestone announcements
    if (attended === 1) {
      announcements.push(`Welcome ${name} to their first game of the season!`);
    } else if (attended === 10) {
      announcements.push(`${name} hits the 10-game milestone tonight!`);
    }
    
    return announcements;
  }

  /**
   * Update stats for all players in a roster
   */
  async updateStatsForRoster(rosterPlayers, teamName) {
    if (!this.statsContainer) await this.init();
    
    const updates = [];
    
    for (const player of rosterPlayers) {
      const playerId = `${teamName}-${player.name}`.replace(/\s+/g, '-').toLowerCase();
      const stats = await this.calculatePlayerStats(playerId, player.name, teamName);
      
      // Upsert the stats
      updates.push(this.statsContainer.items.upsert(stats));
    }
    
    await Promise.all(updates);
    console.log(`Updated stats for ${updates.length} players from ${teamName}`);
  }

  /**
   * Get player stats for AI announcer
   */
  async getPlayerStats(playerName, teamName) {
    if (!this.statsContainer) await this.init();
    
    const playerId = `${teamName}-${playerName}`.replace(/\s+/g, '-').toLowerCase();
    
    try {
      const { resource } = await this.statsContainer.item(`${playerId}-stats`, playerId).read();
      return resource;
    } catch (error) {
      if (error.code === 404) {
        // Player stats don't exist yet, calculate them
        return await this.calculatePlayerStats(playerId, playerName, teamName);
      }
      throw error;
    }
  }

  /**
   * Refresh all player stats
   */
  async refreshAllStats() {
    try {
      const rostersContainer = await getRostersContainer();
      const { resources: allPlayers } = await rostersContainer.items.readAll().fetchAll();
      
      // Group players by team
      const teamRosters = {};
      allPlayers.forEach(player => {
        if (!teamRosters[player.teamName]) {
          teamRosters[player.teamName] = [];
        }
        teamRosters[player.teamName].push({
          name: player.fullName || `${player.firstName} ${player.lastName}`
        });
      });
      
      // Update stats for each team
      for (const [teamName, players] of Object.entries(teamRosters)) {
        await this.updateStatsForRoster(players, teamName);
      }
      
      console.log('All player stats refreshed successfully');
    } catch (error) {
      console.error('Error refreshing all stats:', error);
      throw error;
    }
  }
}

export { PlayerStatsManager };
