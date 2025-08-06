import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RinkReport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Gold');
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const divisions = ['Gold', 'Silver', 'Bronze'];

  // Load reports data
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rink-reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const reportsData = await response.json();
      
      // Organize reports by division - show all available reports
      const organizedReports = {};
      divisions.forEach(division => {
        const divisionReports = reportsData.filter(r => r.division === division);
        if (divisionReports.length > 0) {
          // Use the most recent report for each division
          organizedReports[division] = divisionReports[0];
        }
      });
      
      setReports(organizedReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message);
      setReports({});
    } finally {
      setLoading(false);
    }
  };

  const getCurrentReport = () => {
    return reports[activeTab];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-600">Loading rink reports...</div>
          </div>
        </div>
      </div>
    );
  }

  const currentReport = getCurrentReport();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <span className="text-4xl mr-3">🏒</span>
              The Rink Report
            </h1>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Main
            </button>
          </div>
          
          <p className="text-gray-600">
            Your comprehensive hockey news and analysis hub featuring weekly summaries, 
            player spotlights, and insider insights from across all divisions.
          </p>
        </div>

        {/* Division Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {divisions.map((division) => (
                <button
                  key={division}
                  onClick={() => setActiveTab(division)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === division
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {division} Division
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Report Content */}
        {currentReport ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Article */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentReport.title}
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span>By {currentReport.author}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(currentReport.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentReport.html || currentReport.article }}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Game Highlights */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">⭐</span>
                  Game Highlights
                </h3>
                <ul className="space-y-3">
                  {currentReport.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2 mt-1">•</span>
                      <span className="text-sm text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Standout Players */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">🌟</span>
                  Standout Players
                </h3>
                <div className="space-y-4">
                  {currentReport.standoutPlayers.map((player, index) => (
                    <div key={index} className="border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold text-gray-900">{player.name}</h4>
                      <p className="text-sm text-gray-600">{player.team}</p>
                      <p className="text-sm text-blue-600 font-medium">{player.stats}</p>
                      <p className="text-xs text-gray-500 mt-1">{player.highlight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* League Updates */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">📢</span>
                  League Updates
                </h3>
                <ul className="space-y-2">
                  {currentReport.leagueUpdates.map((update, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      {update}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Upcoming Predictions */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">🔮</span>
                  Next Week Predictions
                </h3>
                <div className="space-y-4">
                  {currentReport.upcomingPredictions.map((prediction, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">
                        {prediction.matchup}
                      </h4>
                      <p className="text-xs text-gray-700 mb-2">{prediction.prediction}</p>
                      <p className="text-xs text-blue-600 font-medium">
                        Key Factor: {prediction.keyFactor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <span className="text-6xl">📰</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Report Available
            </h3>
            <p className="text-gray-500">
              No games submitted yet for {activeTab} Division. Reports will generate automatically after games are submitted.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Reports</h3>
                <p className="text-sm text-red-700 mt-1">
                  {error}. No reports are currently available.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
