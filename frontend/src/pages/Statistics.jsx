import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { statisticsService } from '../services/statisticsService.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Statistics() {
  const navigate = useNavigate();
  
  // State for data
  const [historicalStats, setHistoricalStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [seasonalData, setSeasonalData] = useState([]); // For charts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters and sorting
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('Fall'); // Default to Fall
  const [selectedYear, setSelectedYear] = useState('2025'); // Default to 2025
  const [seasonOptions, setSeasonOptions] = useState(['All', 'Fall', 'Winter']);
  const [yearOptions, setYearOptions] = useState(['All', '2025', '2024', '2023']);
  const [playerSortField, setPlayerSortField] = useState('goals');
  const [playerSortDirection, setPlayerSortDirection] = useState('desc');
  const [teamSortField, setTeamSortField] = useState('wins');
  const [teamSortDirection, setTeamSortDirection] = useState('desc');

  useEffect(() => { fetchPlayerStats(); }, [selectedDivision, selectedSeason, selectedYear]);
  useEffect(() => { fetchTeamStats(); }, [selectedDivision]);
  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { fetchSeasonalData(); }, [selectedDivision]); // For charts
  useEffect(() => { 
    // Initial load with defaults after meta data is loaded
    if (seasonOptions.length > 1 && yearOptions.length > 1) {
      fetchPlayerStats();
    }
  }, [seasonOptions, yearOptions]); // Trigger when meta data is loaded

  const fetchSeasonalData = async () => {
    try {
      const data = await statisticsService.fetchSeasonalData({
        division: selectedDivision
      });
      setSeasonalData(data);
    } catch (e) {
      console.error('Failed to fetch seasonal data for charts:', e);
      setSeasonalData([]);
    }
  };

  const fetchPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await statisticsService.fetchPlayerStats({
        division: selectedDivision,
        season: selectedSeason,
        year: selectedYear
      });

      setHistoricalStats(data);

      // If everything empty, run debug call
      const empty = (!data || data.length === 0);
      if (empty) {
        console.log('Player stats debug: No data returned from service');
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
      const data = await statisticsService.fetchTeamStats({
        division: selectedDivision
      });

      // Ensure consistent fields
      const normalized = data.map(t => ({
        ...t,
        winPercentage: t.winPercentage ?? (t.gamesPlayed ? ((t.wins / t.gamesPlayed) * 100).toFixed(1) : '0.0')
      }));
      setTeamStats(normalized);
    } catch (e) {
      console.error('Team stats fetch failed', e);
    }
  };

  const fetchMeta = async () => {
    try {
      const meta = await statisticsService.fetchMeta();

      if (meta.seasons && meta.seasons.length > 0) {
        setSeasonOptions(meta.seasons);
      }

      if (meta.years && meta.years.length > 0) {
        setYearOptions(meta.years);
        // Set 2025 as default if available, otherwise use the most recent year
        const defaultYear = meta.years.includes('2025') ? '2025' : meta.years.find(y => y !== 'All') || '2025';
        if (selectedYear === '2025') {
          setSelectedYear(defaultYear);
        }
      }
    } catch (e) {
      console.error('Failed to load meta', e);
    }
  };

  const divisions = ['All', 'Gold', 'Silver', 'Bronze'];

  const activeList = historicalStats;
  const filteredPlayerStats = activeList.filter(p => selectedDivision === 'All' || p.division === selectedDivision);

  // Analytics derivations
  const topScorer = filteredPlayerStats[0];
  const totalGoals = filteredPlayerStats.reduce((s,p)=> s + (p.goals||0),0);
  const totalAssists = filteredPlayerStats.reduce((s,p)=> s + (p.assists||0),0);
  const totalPoints = filteredPlayerStats.reduce((s,p)=> s + (p.points||0),0);
  const avgPoints = filteredPlayerStats.length ? (totalPoints / filteredPlayerStats.length).toFixed(1) : '0.0';
  const medianPoints = (() => { if(!filteredPlayerStats.length) return '0'; const pts = filteredPlayerStats.map(p=>p.points||0).sort((a,b)=>a-b); const mid = Math.floor(pts.length/2); return pts.length%2? String(pts[mid]) : ((pts[mid-1]+pts[mid])/2).toFixed(1); })();
  const goalsPerGameAgg = (()=> { const gp = filteredPlayerStats.reduce((s,p)=> s + (p.gp||0),0); return gp? (totalGoals / gp).toFixed(1) : '0.0'; })();
  const pointsPerPlayerPerGame = (()=> { const gp = filteredPlayerStats.reduce((s,p)=> s + (p.gp||0),0); return gp? (totalPoints / gp).toFixed(1):'0.0'; })();

  const filteredTeamStats = teamStats.filter(team => selectedDivision === 'All' || team.division === selectedDivision);

  // Chart data generation
  const generateSeasonalTrendsChart = () => {
    // Since historical data is aggregated, we'll create a simple comparison chart instead
    if (!seasonalData.length) return null;
    
    // For now, create a simple bar chart showing top performers from historical data
    const topHistorical = seasonalData
      .filter(p => p.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    return {
      labels: topHistorical.map(p => p.playerName),
      datasets: [
        {
          label: 'Historical Career Points',
          data: topHistorical.map(p => p.points || 0),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
        }
      ]
    };
  };

  const generateTopScorersChart = () => {
    if (!filteredPlayerStats.length) return null;
    
    const topScorers = filteredPlayerStats.slice(0, 10);
    
    return {
      labels: topScorers.map(p => p.playerName),
      datasets: [
        {
          label: 'Goals',
          data: topScorers.map(p => p.goals || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Assists',
          data: topScorers.map(p => p.assists || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        }
      ]
    };
  };

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
                onClick={fetchPlayerStats}
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
          
          {/* Filters */}  
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
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
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="font-medium text-gray-700">Season:</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {seasonOptions.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="font-medium text-gray-700">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={() => fetchPlayerStats()} 
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Player Statistics Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            👤 Player Statistics 
            {selectedYear !== 'All' && selectedSeason !== 'All' 
              ? ` - ${selectedYear} ${selectedSeason}`
              : selectedYear !== 'All' 
                ? ` - ${selectedYear}`
                : selectedSeason !== 'All'
                  ? ` - ${selectedSeason}`
                  : ''
            }
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {selectedYear === '2025' && selectedSeason === 'Fall' 
              ? 'Showing players with games played (GP > 0) for the current season.'
              : 'Filter by year, season, and division to view specific statistics.'
            }
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 text-sm">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-[10px] text-blue-700 uppercase tracking-wide">Top Scorer</div>
              <div className="font-semibold text-blue-900 truncate" title={topScorer?.playerName}>{topScorer? topScorer.playerName : '—'}</div>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="text-[10px] text-green-700 uppercase tracking-wide">Avg Points/Player</div>
              <div className="font-semibold text-green-900">{avgPoints}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <div className="text-[10px] text-purple-700 uppercase tracking-wide">Median Points</div>
              <div className="font-semibold text-purple-900">{medianPoints}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="text-[10px] text-orange-700 uppercase tracking-wide">Total Goals</div>
              <div className="font-semibold text-orange-900">{totalGoals}</div>
            </div>
            <div className="bg-teal-50 p-3 rounded border border-teal-200">
              <div className="text-[10px] text-teal-700 uppercase tracking-wide">Goals / Game (Agg)</div>
              <div className="font-semibold text-teal-900">{goalsPerGameAgg}</div>
            </div>
            <div className="bg-rose-50 p-3 rounded border border-rose-200">
              <div className="text-[10px] text-rose-700 uppercase tracking-wide">Points / Player GP</div>
              <div className="font-semibold text-rose-900">{pointsPerPlayerPerGame}</div>
            </div>
          </div>
          
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

        {/* Analytics Charts - Always Show */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📈 Analytics & Trends</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Seasonal Trends Chart */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Historical Career Leaders</h3>
              {generateSeasonalTrendsChart() ? (
                <Bar
                  data={generateSeasonalTrendsChart()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Top Historical Performers by Career Points' }
                    },
                    scales: {
                      y: { beginAtZero: true }
                    }
                  }}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">No historical data available for trends</p>
              )}
            </div>

            {/* Top Scorers Chart */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Top 10 Scorers 
                {selectedYear !== 'All' && selectedSeason !== 'All' 
                  ? ` - ${selectedYear} ${selectedSeason}`
                  : selectedYear !== 'All' 
                    ? ` - ${selectedYear}`
                    : selectedSeason !== 'All'
                      ? ` - ${selectedSeason}`
                      : ''
                }
              </h3>
              {generateTopScorersChart() ? (
                <Bar
                  data={generateTopScorersChart()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Goals vs Assists Breakdown' }
                    },
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true, beginAtZero: true }
                    }
                  }}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">No data available for chart</p>
              )}
            </div>
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
