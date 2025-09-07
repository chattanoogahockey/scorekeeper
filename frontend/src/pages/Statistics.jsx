import React, { useState, useEffect } from 'react';
import { statisticsService } from '../services/statisticsService';

const Statistics = () => {
  const [teamStats, setTeamStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamStats();
  }, []);

  const fetchTeamStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch only Fall 2025 team stats
      const stats = await statisticsService.fetchTeamStats({
        season: 'Fall',
        year: 2025
      });
      
      setTeamStats(stats);
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setError('Failed to load team statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-blue-900">Loading team statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="text-red-600 text-lg">{error}</p>
            <button 
              onClick={fetchTeamStats}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-center text-blue-900">
            Fall 2025 Team Statistics
          </h1>
        </div>

        {/* Team Stats Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-blue-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Games</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Wins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Losses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Win %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Goals For</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Goals Against</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Goal Diff</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {teamStats.length > 0 ? (
                  teamStats.map((team, index) => (
                    <tr key={team.teamName || index} className="hover:bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">
                        {team.teamName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.gamesPlayed || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.wins || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.losses || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.winPercentage ? `${(team.winPercentage * 100).toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.goalsFor || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.goalsAgainst || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                        {team.goalDifferential || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-blue-600">
                      No team statistics available for Fall 2025
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
