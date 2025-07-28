// Calculate and display player stats for all players
import { getDatabase, getAttendanceContainer, getRostersContainer, getGamesContainer } from './cosmosClient.js';

async function calculatePlayerStats() {
  try {
    console.log('📊 Starting player stats calculation...');
    
    // Get all data
    const attendanceContainer = await getAttendanceContainer();
    const rostersContainer = await getRostersContainer();
    const gamesContainer = await getGamesContainer();
    
    const { resources: attendanceRecords } = await attendanceContainer.items.readAll().fetchAll();
    const { resources: allPlayers } = await rostersContainer.items.readAll().fetchAll();
    const { resources: allGames } = await gamesContainer.items.readAll().fetchAll();
    
    console.log(`📋 Data loaded: ${attendanceRecords.length} attendance records, ${allPlayers.length} players, ${allGames.length} games`);
    
    // Group players by team
    const teamPlayers = {};
    allPlayers.forEach(player => {
      if (!teamPlayers[player.teamName]) {
        teamPlayers[player.teamName] = [];
      }
      teamPlayers[player.teamName].push(player);
    });
    
    console.log(`🏒 Teams found: ${Object.keys(teamPlayers).join(', ')}`);
    
    // Calculate stats for each player
    const playerStats = [];
    
    for (const [teamName, players] of Object.entries(teamPlayers)) {
      console.log(`\n🔍 Analyzing ${teamName} (${players.length} players):`);
      
      // Find games for this team
      const teamGames = allGames.filter(game => 
        game.homeTeam === teamName || game.awayTeam === teamName ||
        game.homeTeamId === teamName || game.awayTeamId === teamName
      );
      
      console.log(`  📅 Team has ${teamGames.length} games scheduled`);
      
      for (const player of players) {
        const playerName = player.fullName || `${player.firstName} ${player.lastName}`;
        
        // Calculate attendance for this player
        let gamesAttended = 0;
        let totalTeamGamesWithAttendance = 0;
        
        attendanceRecords.forEach(record => {
          // Check if this attendance record is for the player's team
          const teamAttendance = record.attendance.find(team => team.teamName === teamName);
          if (teamAttendance) {
            totalTeamGamesWithAttendance++;
            
            // Check if player attended
            if (teamAttendance.playersPresent.includes(playerName)) {
              gamesAttended++;
            }
          }
        });
        
        const attendancePercentage = totalTeamGamesWithAttendance > 0 ? 
          Math.round((gamesAttended / totalTeamGamesWithAttendance) * 100) : 0;
        
        const stats = {
          playerName,
          teamName,
          gamesAttended,
          totalGamesWithAttendance: totalTeamGamesWithAttendance,
          totalScheduledGames: teamGames.length,
          attendancePercentage,
          position: player.position || 'Player',
          jerseyNumber: player.jerseyNumber || 'N/A'
        };
        
        playerStats.push(stats);
        
        if (totalTeamGamesWithAttendance > 0) {
          console.log(`    ${playerName}: ${gamesAttended}/${totalTeamGamesWithAttendance} games (${attendancePercentage}%)`);
        }
      }
    }
    
    // Sort by attendance percentage
    playerStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    
    console.log(`\n🏆 TOP ATTENDEES:`);
    playerStats.slice(0, 10).forEach((player, i) => {
      if (player.totalGamesWithAttendance > 0) {
        console.log(`${i + 1}. ${player.playerName} (${player.teamName}): ${player.attendancePercentage}% (${player.gamesAttended}/${player.totalGamesWithAttendance})`);
      }
    });
    
    // Find players with poor attendance
    const poorAttendees = playerStats.filter(p => p.attendancePercentage < 50 && p.totalGamesWithAttendance > 0);
    if (poorAttendees.length > 0) {
      console.log(`\n⚠️  PLAYERS WITH LOW ATTENDANCE (<50%):`);
      poorAttendees.forEach(player => {
        console.log(`   ${player.playerName} (${player.teamName}): ${player.attendancePercentage}%`);
      });
    }
    
    // Now save stats to the playerStats container
    console.log(`\n💾 Saving stats to playerStats container...`);
    const database = await getDatabase();
    const playerStatsContainer = database.container('playerStats');
    
    let savedCount = 0;
    for (const playerStat of playerStats) {
      const playerId = `${playerStat.teamName}-${playerStat.playerName}`.replace(/\s+/g, '-').toLowerCase();
      
      const statsDocument = {
        id: `${playerId}-stats`,
        playerId: playerId,
        playerName: playerStat.playerName,
        teamName: playerStat.teamName,
        season: 'winter 2025', // Match rosters container format
        
        // Attendance Analytics
        attendance: {
          gamesAttended: playerStat.gamesAttended,
          totalTeamGames: playerStat.totalGamesWithAttendance,
          attendancePercentage: playerStat.attendancePercentage,
          scheduledGames: playerStat.totalScheduledGames
        },
        
        // Player Info
        playerInfo: {
          position: playerStat.position,
          jerseyNumber: playerStat.jerseyNumber
        },
        
        // AI Announcer Insights
        insights: {
          reliability: playerStat.attendancePercentage >= 80 ? 'High' : 
                      playerStat.attendancePercentage >= 60 ? 'Good' : 
                      playerStat.attendancePercentage >= 40 ? 'Moderate' : 'Low',
          announcements: generateAnnouncements(playerStat),
          trend: calculateTrend(attendanceHistory),
          aiContext: {
            personality: getPlayerPersonality(playerStat.attendancePercentage, playerStat.gamesAttended),
            storylines: generateStorylines(playerStat),
            contextualFacts: generateContextualFacts(playerStat)
          }
        },
        
        // Metadata
        lastUpdated: new Date().toISOString(),
        dataVersion: '1.0'
      };
      
      await playerStatsContainer.items.upsert(statsDocument);
      savedCount++;
    }
    
    console.log(`✅ Successfully saved stats for ${savedCount} players to player-stats container!`);
    
  } catch (error) {
    console.error('❌ Error calculating player stats:', error);
  }
}

function generateAnnouncements(playerStat) {
  const announcements = [];
  const { playerName, attendancePercentage, gamesAttended, totalGamesWithAttendance } = playerStat;
  
  if (attendancePercentage >= 90) {
    announcements.push(`${playerName} is one of our most reliable players with ${attendancePercentage}% attendance!`);
    announcements.push(`You can always count on ${playerName} to show up when the team needs them.`);
  } else if (attendancePercentage >= 70) {
    announcements.push(`${playerName} has been consistent this season with ${attendancePercentage}% attendance.`);
  } else if (attendancePercentage > 0) {
    announcements.push(`${playerName} has attended ${gamesAttended} of ${totalGamesWithAttendance} games this season.`);
  }
  
  // Special milestones
  if (gamesAttended === 1) {
    announcements.push(`Welcome back ${playerName}! Great to see you on the ice tonight.`);
  } else if (gamesAttended === 5) {
    announcements.push(`${playerName} hits the 5-game milestone tonight!`);
  } else if (gamesAttended === 10) {
    announcements.push(`${playerName} reaches double digits with 10 games played this season!`);
  }
  
  return announcements;
}

/**
 * Calculate attendance trend based on recent games
 */
function calculateTrend(history) {
  if (history.length < 3) return 'Insufficient Data';
  
  const recent = history.slice(-3);
  const attendedRecent = recent.filter(g => g.attended).length;
  
  if (attendedRecent === 3) return 'Hot Streak';
  if (attendedRecent === 0) return 'Cold Streak';
  if (attendedRecent >= 2) return 'Improving';
  return 'Declining';
}

/**
 * Generate AI personality traits based on attendance patterns
 */
function getPlayerPersonality(attendancePercentage, gamesAttended) {
  const traits = [];
  
  if (attendancePercentage >= 90) {
    traits.push('reliable', 'dedicated', 'team-player');
  } else if (attendancePercentage >= 70) {
    traits.push('consistent', 'committed');
  } else if (attendancePercentage >= 50) {
    traits.push('sporadic', 'unpredictable');
  } else {
    traits.push('infrequent', 'occasional');
  }
  
  if (gamesAttended === 1) {
    traits.push('newcomer', 'fresh-face');
  } else if (gamesAttended >= 10) {
    traits.push('veteran', 'experienced');
  }
  
  return traits;
}

/**
 * Generate storylines for AI announcer
 */
function generateStorylines(playerStat) {
  const storylines = [];
  const { playerName, attendancePercentage, gamesAttended, position } = playerStat;
  
  // Attendance storylines
  if (attendancePercentage === 100) {
    storylines.push(`Perfect attendance story: ${playerName} hasn't missed a game this season`);
  }
  
  if (attendancePercentage < 30) {
    storylines.push(`Comeback potential: When ${playerName} shows up, the team knows it's game time`);
  }
  
  // Position-based storylines
  if (position && position !== 'Player') {
    storylines.push(`${position} spotlight: ${playerName} brings experience to the ${position} position`);
  }
  
  // Milestone storylines
  if (gamesAttended === 5) {
    storylines.push(`Milestone moment: ${playerName} celebrates their 5th game appearance`);
  }
  
  return storylines;
}

/**
 * Generate contextual facts for AI announcer
 */
function generateContextualFacts(playerStat) {
  const facts = [];
  const { playerName, attendancePercentage, gamesAttended, totalGamesWithAttendance, jerseyNumber, position } = playerStat;
  
  // Statistical facts
  facts.push(`${attendancePercentage}% attendance rate this season`);
  facts.push(`${gamesAttended} games played out of ${totalGamesWithAttendance} possible`);
  
  // Player details
  if (jerseyNumber && jerseyNumber !== 'N/A') {
    facts.push(`Wears jersey #${jerseyNumber}`);
  }
  
  if (position && position !== 'Player') {
    facts.push(`Plays ${position} position`);
  }
  
  // Comparative facts
  if (attendancePercentage > 80) {
    facts.push('Above average attendance for the league');
  } else if (attendancePercentage < 50) {
    facts.push('Below average attendance this season');
  }
  
  return facts;
}

// Export the function for use in other modules
export { calculatePlayerStats };

// Run the calculation if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await calculatePlayerStats();
}
