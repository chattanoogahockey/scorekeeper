import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RinkReport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Gold');
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('current');

  const divisions = ['Gold', 'Silver', 'Bronze'];
  const weeks = ['current', 'week-1', 'week-2', 'week-3'];

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
      
      // Organize reports by division and week
      const organizedReports = {};
      divisions.forEach(division => {
        organizedReports[division] = {};
        weeks.forEach(week => {
          const report = reportsData.find(r => r.division === division && r.week === week);
          organizedReports[division][week] = report || generateSampleReport(division, week);
        });
      });
      
      setReports(organizedReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message);
      // Generate sample data on error
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Generate sample report data for demonstration
  const generateSampleReport = (division, week) => {
    const weekLabels = {
      'current': 'This Week',
      'week-1': 'Last Week', 
      'week-2': '2 Weeks Ago',
      'week-3': '3 Weeks Ago'
    };

    const sampleTeams = {
      Gold: ['Thunder Bolts', 'Ice Crushers', 'Power Players', 'Victory Squad'],
      Silver: ['Storm Riders', 'Blade Masters', 'Speed Demons', 'Goal Getters'], 
      Bronze: ['Ice Breakers', 'Rookie Rangers', 'Future Stars', 'Rising Force']
    };

    const samplePlayers = {
      Gold: ['Jake Morrison', 'Alex Chen', 'Ryan Thompson', 'Michael Rodriguez'],
      Silver: ['Sarah Johnson', 'Kevin Park', 'Tyler Williams', 'Emma Davis'],
      Bronze: ['Connor Smith', 'Maya Patel', 'Lucas Brown', 'Zoe Garcia']
    };

    return {
      id: `${division}-${week}`,
      division,
      week,
      weekLabel: weekLabels[week],
      publishedAt: new Date().toISOString(),
      author: 'Rink Report Staff',
      title: `${division} Division Weekly Roundup`,
      highlights: [
        `${sampleTeams[division][0]} dominates with impressive 5-2 victory`,
        `${samplePlayers[division][0]} leads division scoring with hat trick performance`,
        `Penalty-filled matchup between ${sampleTeams[division][1]} and ${sampleTeams[division][2]}`,
        `${sampleTeams[division][3]} makes comeback from 3-goal deficit`
      ],
      standoutPlayers: [
        {
          name: samplePlayers[division][0],
          team: sampleTeams[division][0],
          stats: '3 goals, 2 assists this week',
          highlight: 'Hat trick in decisive victory over division rivals'
        },
        {
          name: samplePlayers[division][1], 
          team: sampleTeams[division][1],
          stats: '2 goals, 4 assists this week',
          highlight: 'Playmaking wizard setting up teammates consistently'
        },
        {
          name: samplePlayers[division][2],
          team: sampleTeams[division][2], 
          stats: '4 goals, 1 assist this week',
          highlight: 'Goal-scoring machine finding the net from everywhere'
        }
      ],
      leagueUpdates: [
        `${division} division standings tighten as playoff race heats up`,
        'New playoff format announced for upcoming tournament',
        'League implements enhanced safety protocols for all games',
        'Championship tournament scheduled for next month'
      ],
      upcomingPredictions: [
        {
          matchup: `${sampleTeams[division][0]} vs ${sampleTeams[division][1]}`,
          prediction: 'Expecting high-scoring affair between top offensive teams',
          keyFactor: 'Special teams play could decide the outcome'
        },
        {
          matchup: `${sampleTeams[division][2]} vs ${sampleTeams[division][3]}`,
          prediction: 'Defensive battle between two strong checking teams',
          keyFactor: 'Goaltending performance will be crucial'
        }
      ],
      article: `
        <p>The ${division} Division continues to showcase exceptional hockey as teams battle for playoff positioning. This week delivered stunning performances, dramatic comebacks, and outstanding individual achievements.</p>
        
        <h3>Game of the Week</h3>
        <p>In a thrilling matchup that went to overtime, ${sampleTeams[division][0]} defeated ${sampleTeams[division][1]} 4-3. ${samplePlayers[division][0]} scored the game-winner with just 2 minutes remaining in the extra period, capping off a remarkable hat trick performance.</p>
        
        <p>The victory propels ${sampleTeams[division][0]} into first place in the division standings, but the race remains tight with just 3 points separating the top 4 teams.</p>
        
        <h3>Rising Stars</h3>
        <p>${samplePlayers[division][1]} has been on an absolute tear lately, recording points in 8 consecutive games. The versatile forward has shown incredible hockey IQ, consistently finding open teammates and creating scoring opportunities.</p>
        
        <p>Meanwhile, ${samplePlayers[division][2]} continues to light up the scoreboard. With 4 goals this week alone, they've established themselves as one of the most dangerous shooters in the division.</p>
        
        <h3>Looking Ahead</h3>
        <p>Next week features several crucial matchups that could shake up the standings. The ${sampleTeams[division][0]} vs ${sampleTeams[division][1]} rematch promises fireworks, while ${sampleTeams[division][2]} looks to bounce back against a desperate ${sampleTeams[division][3]} squad.</p>
        
        <p>With the playoffs just around the corner, every game takes on added significance. Teams are finalizing their lineups and strategies for what promises to be an unforgettable postseason.</p>
      `
    };
  };

  const generateSampleData = () => {
    const sampleReports = {};
    divisions.forEach(division => {
      sampleReports[division] = {};
      weeks.forEach(week => {
        sampleReports[division][week] = generateSampleReport(division, week);
      });
    });
    setReports(sampleReports);
  };

  const getCurrentReport = () => {
    return reports[activeTab]?.[selectedWeek];
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

          {/* Week Selector */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Week:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                {weeks.map(week => (
                  <option key={week} value={week}>
                    {getCurrentReport()?.weekLabel || week}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {currentReport && (
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
                  dangerouslySetInnerHTML={{ __html: currentReport.article }}
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
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Reports</h3>
                <p className="text-sm text-red-700 mt-1">
                  {error}. Showing sample data for demonstration.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
