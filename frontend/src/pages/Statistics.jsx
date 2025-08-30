import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Statistics() {
  const navigate = useNavigate();
  
  // State for data
  const [mergedStats, setMergedStats] = useState([]); // merged totals
  const [historicalStats, setHistoricalStats] = useState([]);
  const [liveStats, setLiveStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]); // legacy team calc (still from events)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters and sorting
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [statScope, setStatScope] = useState('totals'); // totals | historical | live
  const [playerSortField, setPlayerSortField] = useState('goals');
  const [playerSortDirection, setPlayerSortDirection] = useState('desc');
  const [teamSortField, setTeamSortField] = useState('wins');
  const [teamSortDirection, setTeamSortDirection] = useState('desc');

  useEffect(() => { fetchPlayerStats(); }, [selectedDivision, selectedSeason, selectedYear, statScope]);
  useEffect(() => { fetchTeamStats(); }, [selectedDivision]);

  const fetchPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL || '';
      const params = new URLSearchParams();
      if (selectedDivision !== 'All') params.append('division', selectedDivision);
      if (selectedSeason) params.append('season', selectedSeason);
      if (selectedYear) params.append('year', selectedYear);
      if (statScope) params.append('scope', statScope);
      const { data } = await axios.get(`${apiBase}/api/player-stats?${params.toString()}`);
      if (statScope === 'totals') setMergedStats(data);
      if (statScope === 'historical') setHistoricalStats(data);
      if (statScope === 'live') setLiveStats(data);
      if (statScope !== 'totals') {
        try {
          const totalsResp = await axios.get(`${apiBase}/api/player-stats?${params.toString().replace(`scope=${statScope}`, 'scope=totals')}`);
          setMergedStats(totalsResp.data);
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError('Failed to load player statistics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL || '';
      const params = new URLSearchParams();
      if (selectedDivision !== 'All') params.append('division', selectedDivision);
      const { data } = await axios.get(`${apiBase}/api/team-stats?${params.toString()}`);
      // Ensure consistent fields
      const normalized = data.map(t => ({
        ...t,
        winPercentage: t.winPercentage ?? (t.gamesPlayed ? ((t.wins / t.gamesPlayed) * 100).toFixed(1) : '0.0')
      }));
      setTeamStats(normalized);
    } catch (e) { console.error('Team stats fetch failed', e); }
  };

  const divisions = ['All', 'Gold', 'Silver', 'Bronze'];

  const activeList = statScope === 'historical' ? historicalStats : statScope === 'live' ? liveStats : mergedStats;
  const filteredPlayerStats = activeList.filter(p => selectedDivision === 'All' || p.division === selectedDivision);

  const filteredTeamStats = teamStats.filter(team => selectedDivision === 'All' || team.division === selectedDivision);

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
    const fieldMap = (obj, field) => {
      if (field === 'playerName') return obj.playerName;
      if (field === 'gp') return obj.gp;
      if (field === 'pim') return obj.pim;
      return obj[field];
    };
    const aVal = fieldMap(a, playerSortField);
    const bVal = fieldMap(b, playerSortField);
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
            <input placeholder="Season" value={selectedSeason} onChange={e=>setSelectedSeason(e.target.value)} className="px-2 py-2 border rounded-md text-sm" />
            <input placeholder="Year" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} className="px-2 py-2 border rounded-md text-sm w-24" />
            <select value={statScope} onChange={e=>setStatScope(e.target.value)} className="px-2 py-2 border rounded-md text-sm">
              <option value="totals">Totals (Career)</option>
              <option value="historical">Historical Only</option>
              <option value="live">Current Season Only</option>
            </select>
            <button onClick={()=>fetchPlayerStats()} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">🔄 Refresh</button>
          </div>
        </div>

        {/* Player Statistics Table (Scoped) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">👤 Player Statistics ({statScope})</h2>
          <p className="text-xs text-gray-500 mb-4">Scope controls whether you see historical, live current season, or merged totals (career-like).</p>
          
          {sortedPlayerStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => sortPlayers('playerName')}>
                      Player {getSortIcon('playerName', playerSortField, playerSortDirection)}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => sortPlayers('gp')}>
                      GP {getSortIcon('gp', playerSortField, playerSortDirection)}
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
                      onClick={() => sortPlayers('pim')}
                    >
                      PIM {getSortIcon('pim', playerSortField, playerSortDirection)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayerStats.map((p, index) => (
                    <tr key={`${p.playerName}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.playerName}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{p.gp}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{p.goals}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{p.assists}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-600">{p.points}</td>
                      <td className="px-4 py-3 text-center text-red-600">{p.pim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No player statistics available for the selected division.</p>
          )}
        </div>

        {/* Career Leaders (Totals) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Career Points Leaders</h2>
          <p className="text-xs text-gray-500 mb-4">Merged totals (historical + live). Filtered by division / season / year if specified.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Player</th>
                  <th className="px-4 py-2 text-center">Goals</th>
                  <th className="px-4 py-2 text-center">Assists</th>
                  <th className="px-4 py-2 text-center">Points</th>
                  <th className="px-4 py-2 text-center">PIM</th>
                  <th className="px-4 py-2 text-center">GP</th>
                </tr>
              </thead>
              <tbody>
                {mergedStats
                  .filter(p => selectedDivision === 'All' || p.division === selectedDivision)
                  .sort((a,b)=> b.points - a.points)
                  .slice(0,50)
                  .map((p,i)=>(
                    <tr key={p.playerName+ i} className={i%2===0?'bg-white':'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium">{p.playerName}</td>
                      <td className="px-4 py-2 text-center text-blue-600 font-semibold">{p.goals}</td>
                      <td className="px-4 py-2 text-center text-green-600 font-semibold">{p.assists}</td>
                      <td className="px-4 py-2 text-center text-purple-600 font-semibold">{p.points}</td>
                      <td className="px-4 py-2 text-center text-red-600">{p.pim}</td>
                      <td className="px-4 py-2 text-center">{p.gp}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Statistics Table (unchanged calculation) */}
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
              {filteredPlayerStats.reduce((sum, player) => sum + (player.goals||0), 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
