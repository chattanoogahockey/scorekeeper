import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Statistics() {
  const navigate = useNavigate();
  
  // State for data
  const [playerStats, setPlayerStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters and sorting
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [playerSortField, setPlayerSortField] = useState('goals');
  const [playerSortDirection, setPlayerSortDirection] = useState('desc');
  const [teamSortField, setTeamSortField] = useState('wins');
  const [teamSortDirection, setTeamSortDirection] = useState('desc');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiBase = import.meta.env.DEV 
        ? '' 
        : import.meta.env.VITE_API_BASE_URL || '';

      // Fetch all data in parallel
      const [goalsRes, penaltiesRes, gamesRes] = await Promise.all([
        axios.get(`${apiBase}/api/goals`),
        axios.get(`${apiBase}/api/penalties`),
        axios.get(`${apiBase}/api/games/submitted`)
      ]);

      const goals = goalsRes.data || [];
      const penalties = penaltiesRes.data || [];
      const games = gamesRes.data || [];

      // Calculate player statistics
      const playerStatsMap = new Map();
      
      // Process goals for player stats
      goals.forEach(goal => {
        if (!goal.scorer) return;
        
        const key = `${goal.scorer}-${goal.scoringTeam}`;
        if (!playerStatsMap.has(key)) {
          playerStatsMap.set(key, {
            name: goal.scorer,
            team: goal.scoringTeam,
            goals: 0,
            assists: 0,
            penaltyMinutes: 0,
            gamesPlayed: new Set()
          });
        }
        
        const player = playerStatsMap.get(key);
        player.goals++;
        player.gamesPlayed.add(goal.gameId);
        
        // Process assists
        if (goal.assists && Array.isArray(goal.assists)) {
          goal.assists.forEach(assist => {
            if (!assist) return;
            const assistKey = `${assist}-${goal.scoringTeam}`;
            if (!playerStatsMap.has(assistKey)) {
              playerStatsMap.set(assistKey, {
                name: assist,
                team: goal.scoringTeam,
                goals: 0,
                assists: 0,
                penaltyMinutes: 0,
                gamesPlayed: new Set()
              });
            }
            const assistPlayer = playerStatsMap.get(assistKey);
            assistPlayer.assists++;
            assistPlayer.gamesPlayed.add(goal.gameId);
          });
        }
      });

      // Process penalties for player stats
      penalties.forEach(penalty => {
        if (!penalty.penalizedPlayer) return;
        
        const key = `${penalty.penalizedPlayer}-${penalty.penalizedTeam}`;
        if (!playerStatsMap.has(key)) {
          playerStatsMap.set(key, {
            name: penalty.penalizedPlayer,
            team: penalty.penalizedTeam,
            goals: 0,
            assists: 0,
            penaltyMinutes: 0,
            gamesPlayed: new Set()
          });
        }
        
        const player = playerStatsMap.get(key);
        player.penaltyMinutes += parseInt(penalty.penaltyLength) || 0;
        player.gamesPlayed.add(penalty.gameId);
      });

      // Convert to array and calculate GP
      const playersArray = Array.from(playerStatsMap.values()).map(player => ({
        ...player,
        gamesPlayed: player.gamesPlayed.size,
        points: player.goals + player.assists
      }));

      // Calculate team statistics
      const teamStatsMap = new Map();
      
      // Process games for team stats
      games.forEach(game => {
        // Initialize teams if not exists
        [game.awayTeam, game.homeTeam].forEach(teamName => {
          if (!teamStatsMap.has(teamName)) {
            teamStatsMap.set(teamName, {
              teamName: teamName,
              wins: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              gamesPlayed: 0,
              division: game.league || 'Unknown'
            });
          }
        });
      });

      // Calculate team goals and records
      goals.forEach(goal => {
        if (teamStatsMap.has(goal.scoringTeam)) {
          teamStatsMap.get(goal.scoringTeam).goalsFor++;
        }
        
        // Find the opposing team for this goal
        const game = games.find(g => g.id === goal.gameId || g.gameId === goal.gameId);
        if (game) {
          const opposingTeam = goal.scoringTeam === game.homeTeam ? game.awayTeam : game.homeTeam;
          if (teamStatsMap.has(opposingTeam)) {
            teamStatsMap.get(opposingTeam).goalsAgainst++;
          }
        }
      });

      // Calculate wins/losses (simplified - you may need to adjust based on your game completion logic)
      games.forEach(game => {
        const homeGoals = goals.filter(g => (g.gameId === game.id || g.gameId === game.gameId) && g.scoringTeam === game.homeTeam).length;
        const awayGoals = goals.filter(g => (g.gameId === game.id || g.gameId === game.gameId) && g.scoringTeam === game.awayTeam).length;
        
        if (homeGoals !== awayGoals) { // Not a tie
          const homeTeamStats = teamStatsMap.get(game.homeTeam);
          const awayTeamStats = teamStatsMap.get(game.awayTeam);
          
          if (homeTeamStats) {
            homeTeamStats.gamesPlayed++;
            if (homeGoals > awayGoals) {
              homeTeamStats.wins++;
            } else {
              homeTeamStats.losses++;
            }
          }
          
          if (awayTeamStats) {
            awayTeamStats.gamesPlayed++;
            if (awayGoals > homeGoals) {
              awayTeamStats.wins++;
            } else {
              awayTeamStats.losses++;
            }
          }
        }
      });

      const teamsArray = Array.from(teamStatsMap.values()).map(team => ({
        ...team,
        winPercentage: team.gamesPlayed > 0 ? ((team.wins / team.gamesPlayed) * 100).toFixed(1) : '0.0',
        goalDifferential: team.goalsFor - team.goalsAgainst
      }));

      setPlayerStats(playersArray);
      setTeamStats(teamsArray);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const divisions = ['All', 'Gold', 'Silver', 'Bronze'];

  const filteredPlayerStats = playerStats.filter(player => 
    selectedDivision === 'All' || 
    teamStats.find(team => team.teamName === player.team)?.division === selectedDivision
  );

  const filteredTeamStats = teamStats.filter(team =>
    selectedDivision === 'All' || team.division === selectedDivision
  );

  const sortPlayers = (field) => {
    const direction = playerSortField === field && playerSortDirection === 'desc' ? 'asc' : 'desc';
    setPlayerSortField(field);
    setPlayerSortDirection(direction);
  };

  const sortTeams = (field) => {
    const direction = teamSortField === field && teamSortDirection === 'desc' ? 'asc' : 'desc';
    setTeamSortField(field);
    setTeamSortDirection(direction);
  };

  const sortedPlayerStats = [...filteredPlayerStats].sort((a, b) => {
    const aVal = a[playerSortField];
    const bVal = b[playerSortField];
    const modifier = playerSortDirection === 'desc' ? -1 : 1;
    
    if (typeof aVal === 'string') {
      return aVal.localeCompare(bVal) * modifier;
    }
    return (aVal - bVal) * modifier;
  });

  const sortedTeamStats = [...filteredTeamStats].sort((a, b) => {
    const aVal = a[teamSortField];
    const bVal = b[teamSortField];
    const modifier = teamSortDirection === 'desc' ? -1 : 1;
    
    if (typeof aVal === 'string') {
      return aVal.localeCompare(bVal) * modifier;
    }
    return (aVal - bVal) * modifier;
  });

  const getSortIcon = (field, currentField, direction) => {
    if (field !== currentField) return '↕️';
    return direction === 'desc' ? '⬇️' : '⬆️';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading statistics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchStatistics}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">📊 Statistics</h1>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Main
            </button>
          </div>
          
          {/* Division Filter */}
          <div className="flex items-center space-x-4">
            <label className="font-medium text-gray-700">Division:</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {divisions.map(division => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
            <button
              onClick={fetchStatistics}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Player Statistics Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">👤 Player Statistics</h2>
          
          {sortedPlayerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th 
                      className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('name')}
                    >
                      Name {getSortIcon('name', playerSortField, playerSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('team')}
                    >
                      Team {getSortIcon('team', playerSortField, playerSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('gamesPlayed')}
                    >
                      GP {getSortIcon('gamesPlayed', playerSortField, playerSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('goals')}
                    >
                      Goals {getSortIcon('goals', playerSortField, playerSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('assists')}
                    >
                      Assists {getSortIcon('assists', playerSortField, playerSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('points')}
                    >
                      Points {getSortIcon('points', playerSortField, playerSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortPlayers('penaltyMinutes')}
                    >
                      PIM {getSortIcon('penaltyMinutes', playerSortField, playerSortDirection)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayerStats.map((player, index) => (
                    <tr key={`${player.name}-${player.team}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{player.name}</td>
                      <td className="px-4 py-3 text-gray-700">{player.team}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{player.gamesPlayed}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{player.goals}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{player.assists}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-600">{player.points}</td>
                      <td className="px-4 py-3 text-center text-red-600">{player.penaltyMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No player statistics available for the selected division.</p>
          )}
        </div>

        {/* Team Statistics Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🏒 Team Statistics</h2>
          
          {sortedTeamStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th 
                      className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('teamName')}
                    >
                      Team Name {getSortIcon('teamName', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('gamesPlayed')}
                    >
                      GP {getSortIcon('gamesPlayed', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('wins')}
                    >
                      Wins {getSortIcon('wins', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('losses')}
                    >
                      Losses {getSortIcon('losses', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('winPercentage')}
                    >
                      Win % {getSortIcon('winPercentage', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('goalsFor')}
                    >
                      Goals For {getSortIcon('goalsFor', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('goalsAgainst')}
                    >
                      Goals Against {getSortIcon('goalsAgainst', teamSortField, teamSortDirection)}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                      onClick={() => sortTeams('goalDifferential')}
                    >
                      +/- {getSortIcon('goalDifferential', teamSortField, teamSortDirection)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeamStats.map((team, index) => (
                    <tr key={team.teamName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{team.teamName}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{team.gamesPlayed}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{team.wins}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{team.losses}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{team.winPercentage}%</td>
                      <td className="px-4 py-3 text-center text-gray-700">{team.goalsFor}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{team.goalsAgainst}</td>
                      <td className={`px-4 py-3 text-center font-bold ${team.goalDifferential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {team.goalDifferential >= 0 ? '+' : ''}{team.goalDifferential}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No team statistics available for the selected division.</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-1">Total Players</h3>
            <p className="text-2xl font-bold text-blue-600">{filteredPlayerStats.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-1">Total Teams</h3>
            <p className="text-2xl font-bold text-green-600">{filteredTeamStats.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-1">Total Goals</h3>
            <p className="text-2xl font-bold text-purple-600">
              {filteredPlayerStats.reduce((sum, player) => sum + player.goals, 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
