import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Chat components
const ChatMessage = ({ message, isUser }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
      isUser 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-200 text-gray-800'
    }`}>
      <p className="text-sm whitespace-pre-wrap">{message}</p>
    </div>
  </div>
);

const ChatInput = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about stats..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
};

const ChatPanel = ({ isOpen, onClose, messages, onSendMessage, isTyping }) => {
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-96 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">📊 Stats Assistant</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p>👋 Hi! I'm your stats assistant.</p>
              <p className="text-sm mt-2">Ask me anything about player stats, team performance, or game history!</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg.text} isUser={msg.isUser} />
          ))}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <ChatInput onSend={onSendMessage} disabled={isTyping} />
        </div>
      </div>
    </div>
  );
};

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

const Statistics = React.memo(() => {
  const navigate = useNavigate();
  
  // State for data
  const [historicalStats, setHistoricalStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [seasonalData, setSeasonalData] = useState([]); // For charts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters and sorting
  const [selectedDivisions, setSelectedDivisions] = useState(['All']);
  const [selectedSeasons, setSelectedSeasons] = useState(['Fall']);
  const [selectedYears, setSelectedYears] = useState(['2025']);
  const [seasonOptions, setSeasonOptions] = useState(['Fall', 'Winter']);
  const [yearOptions, setYearOptions] = useState(['2025', '2024', '2023']);
  const [playerSortField, setPlayerSortField] = useState('goals');
  const [playerSortDirection, setPlayerSortDirection] = useState('desc');
  const [teamSortField, setTeamSortField] = useState('wins');
  const [teamSortDirection, setTeamSortDirection] = useState('desc');
  const [filterLoading, setFilterLoading] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => { 
    fetchMeta(); 
  }, []); // Only run once on mount
  
  useEffect(() => { 
    // Only fetch data after meta is loaded and we have valid options
    if (seasonOptions.length > 0 && yearOptions.length > 0) {
      const fetchData = async () => {
        setFilterLoading(true);
        try {
          await Promise.all([
            fetchPlayerStats(),
            fetchTeamStats(),
            fetchSeasonalData()
          ]);
        } finally {
          setFilterLoading(false);
        }
      };
      fetchData();
    }
  }, [seasonOptions.length, yearOptions.length]);

  const fetchSeasonalData = useCallback(async () => {
    try {
      const division = selectedDivisions.includes('All') ? null : selectedDivisions[0];
      const data = await statisticsService.fetchSeasonalData({
        division
      });
      setSeasonalData(data);
    } catch (e) {
      console.error('Failed to fetch seasonal data for charts:', e);
      setSeasonalData([]);
    }
  }, [selectedDivisions]);

  const fetchPlayerStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the first selected values for API calls (for now, we'll handle multiple selections in the filtering)
      const division = selectedDivisions.includes('All') ? null : selectedDivisions[0];
      const season = selectedSeasons.includes('All') ? null : selectedSeasons[0];
      const year = selectedYears.includes('All') ? null : selectedYears[0];

      console.log('Fetching player stats with filters:', { division, season, year });

      const data = await statisticsService.fetchPlayerStats({
        division,
        season,
        year
      });

      console.log('Player stats response:', data);

      // Ensure data is an array
      const safeData = Array.isArray(data) ? data : [];
      setHistoricalStats(safeData);

      console.log('Setting historical stats:', safeData.length, 'players');

      // If everything empty, run debug call
      if (safeData.length === 0) {
        console.log('Player stats debug: No data returned from service');
      }
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError('Failed to load player statistics.');
      setHistoricalStats([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisions, selectedSeasons, selectedYears]);

  const fetchTeamStats = useCallback(async () => {
    try {
      const division = selectedDivisions.includes('All') ? null : selectedDivisions[0];
      const data = await statisticsService.fetchTeamStats({
        division
      });

      // Ensure data is an array and normalize fields
      const safeData = Array.isArray(data) ? data : [];
      const normalized = safeData.map(t => ({
        ...t,
        winPercentage: t?.winPercentage ?? (t?.gamesPlayed ? ((t.wins / t.gamesPlayed) * 100).toFixed(1) : '0.0')
      }));
      setTeamStats(normalized);
    } catch (e) {
      console.error('Team stats fetch failed', e);
      setTeamStats([]);
    }
  }, [selectedDivisions]);

  const fetchMeta = useCallback(async () => {
    try {
      const meta = await statisticsService.fetchMeta();

      if (meta.seasons && meta.seasons.length > 0) {
        // Remove 'All' from seasons and sort with Winter first, then Fall
        const filteredSeasons = meta.seasons.filter(s => s !== 'All');
        const sortedSeasons = filteredSeasons.sort((a, b) => {
          if (a === 'Winter') return -1;
          if (b === 'Winter') return 1;
          return 0;
        });
        setSeasonOptions(sortedSeasons);
      } else {
        // Default seasons if none found
        setSeasonOptions(['Winter', 'Fall']);
      }

      if (meta.years && meta.years.length > 0) {
        // Remove 'All' from years and sort in descending order
        const filteredYears = meta.years.filter(y => y !== 'All').sort((a, b) => b - a);
        setYearOptions(filteredYears);
        
        // Set default to Fall 2025 if available
        if (filteredYears.includes('2025')) {
          setSelectedYears(['2025']);
          setSelectedSeasons(['Fall']);
        }
      } else {
        // Default years if none found in database
        const defaultYears = ['2025', '2024', '2023', '2022', '2021'];
        setYearOptions(defaultYears);
        setSelectedYears(['2025']);
        setSelectedSeasons(['Fall']);
      }
    } catch (e) {
      console.error('Failed to load meta', e);
      // Set defaults
      setSeasonOptions(['Winter', 'Fall']);
      setYearOptions(['2025', '2024', '2023', '2022', '2021']);
      setSelectedYears(['2025']);
      setSelectedSeasons(['Fall']);
    }
  }, []);

  const divisions = ['All', 'Gold', 'Silver', 'Bronze'];

  const activeList = historicalStats || [];
  const filteredPlayerStats = useMemo(() => 
    activeList.filter(p => {
      const divisionMatch = selectedDivisions.includes('All') || selectedDivisions.includes(p?.division);
      const seasonMatch = selectedSeasons.includes('All') || selectedSeasons.includes(p?.season);
      const yearMatch = selectedYears.includes('All') || selectedYears.includes(p?.year?.toString());
      return divisionMatch && seasonMatch && yearMatch;
    }),
    [activeList, selectedDivisions, selectedSeasons, selectedYears]
  );

  // Memoized analytics derivations
  const analytics = useMemo(() => {
    if (!filteredPlayerStats || !Array.isArray(filteredPlayerStats) || filteredPlayerStats.length === 0) {
      return {
        topScorer: null,
        totalGoals: 0,
        totalAssists: 0,
        totalPoints: 0,
        avgPoints: '0.0',
        medianPoints: '0',
        goalsPerGameAgg: '0.0',
        pointsPerPlayerPerGame: '0.0'
      };
    }

    const topScorer = filteredPlayerStats[0];
    const totalGoals = filteredPlayerStats.reduce((s,p)=> s + (p?.goals||0),0);
    const totalAssists = filteredPlayerStats.reduce((s,p)=> s + (p?.assists||0),0);
    const totalPoints = filteredPlayerStats.reduce((s,p)=> s + (p?.points||0),0);
    const avgPoints = filteredPlayerStats.length ? (totalPoints / filteredPlayerStats.length).toFixed(1) : '0.0';
    const medianPoints = (() => { 
      if(!filteredPlayerStats.length) return '0'; 
      const pts = filteredPlayerStats.map(p=>p?.points||0).sort((a,b)=>a-b); 
      const mid = Math.floor(pts.length/2); 
      return pts.length%2? String(pts[mid]) : ((pts[mid-1]+pts[mid])/2).toFixed(1); 
    })();
    const goalsPerGameAgg = (() => { 
      const gp = filteredPlayerStats.reduce((s,p)=> s + (p?.gp||0),0); 
      return gp? (totalGoals / gp).toFixed(1) : '0.0'; 
    })();
    const pointsPerPlayerPerGame = (() => { 
      const gp = filteredPlayerStats.reduce((s,p)=> s + (p?.gp||0),0); 
      return gp? (totalPoints / gp).toFixed(1):'0.0'; 
    })();

    return {
      topScorer,
      totalGoals,
      totalAssists,
      totalPoints,
      avgPoints,
      medianPoints,
      goalsPerGameAgg,
      pointsPerPlayerPerGame
    };
  }, [filteredPlayerStats]);

  const filteredTeamStats = teamStats.filter(team => 
    selectedDivisions.includes('All') || selectedDivisions.includes(team.division)
  );

  // Helper functions for checkbox handling
  const handleDivisionChange = useCallback((division) => {
    setSelectedDivisions(prev => {
      if (division === 'All') {
        return ['All'];
      } else {
        const newSelections = prev.filter(d => d !== 'All');
        if (newSelections.includes(division)) {
          const filtered = newSelections.filter(d => d !== division);
          return filtered.length === 0 ? ['All'] : filtered;
        } else {
          return [...newSelections, division];
        }
      }
    });
  }, []);

  const handleSeasonChange = useCallback((season) => {
    setSelectedSeasons(prev => {
      if (season === 'All') {
        return ['All'];
      } else {
        const newSelections = prev.filter(s => s !== 'All');
        if (newSelections.includes(season)) {
          const filtered = newSelections.filter(s => s !== season);
          return filtered.length === 0 ? ['All'] : filtered;
        } else {
          return [...newSelections, season];
        }
      }
    });
  }, []);

  const handleYearChange = useCallback((year) => {
    setSelectedYears(prev => {
      if (year === 'All') {
        return ['All'];
      } else {
        const newSelections = prev.filter(y => y !== 'All');
        if (newSelections.includes(year)) {
          const filtered = newSelections.filter(y => y !== year);
          return filtered.length === 0 ? ['All'] : filtered;
        } else {
          return [...newSelections, year];
        }
      }
    });
  }, []);

  const handleApplyFilters = () => {
    fetchPlayerStats();
    fetchTeamStats();
    fetchSeasonalData();
  };

  // Generate dynamic title for top scorers
  const getTopScorersTitle = () => {
    const divisions = selectedDivisions.includes('All') ? ['All Divisions'] : selectedDivisions;
    const seasons = selectedSeasons.includes('All') ? ['All Seasons'] : selectedSeasons;
    const years = selectedYears.includes('All') ? ['All Years'] : selectedYears;
    
    return `Top 10 Scorers - ${divisions.join(', ')} | ${seasons.join(', ')} | ${years.join(', ')}`;
  };
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

  const sortedPlayerStats = [...(filteredPlayerStats || [])].sort((a, b) => {
    const fieldMap = (obj, field) => {
      if (!obj) return '';
      if (field === 'playerName') return obj.playerName || '';
      if (field === 'gp') return obj.gp || 0;
      if (field === 'pim') return obj.pim || 0;
      return obj[field] || 0;
    };
    const aVal = fieldMap(a, playerSortField);
    const bVal = fieldMap(b, playerSortField);
    const modifier = playerSortDirection === 'desc' ? -1 : 1;
    
    if (typeof aVal === 'string') {
      return (aVal || '').localeCompare(bVal || '') * modifier;
    }
    return (aVal - bVal) * modifier;
  });

  const sortedTeamStats = [...(filteredTeamStats || [])].sort((a, b) => {
    const aVal = a?.[teamSortField] || 0;
    const bVal = b?.[teamSortField] || 0;
    const modifier = teamSortDirection === 'desc' ? -1 : 1;
    
    if (typeof aVal === 'string') {
      return (aVal || '').localeCompare(bVal || '') * modifier;
    }
    return (aVal - bVal) * modifier;
  });

  const getSortIcon = (field, currentField, direction) => {
    if (field !== currentField) return '↕️';
    return direction === 'desc' ? '⬇️' : '⬆️';
  };

  // Chat functions
  const handleSendMessage = async (message) => {
    // Add user message
    setChatMessages(prev => [...prev, { text: message, isUser: true }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          messages: chatMessages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsTyping(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedResponse += parsed.content;
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages.length > 0 && !newMessages[newMessages.length - 1].isUser) {
                    newMessages[newMessages.length - 1].text = accumulatedResponse;
                  } else {
                    newMessages.push({ text: accumulatedResponse, isUser: false });
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parsing errors for now
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isUser: false 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setChatMessages([]);
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
          
          {/* Filters - Select All That Apply */}  
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Select All That Apply</h3>
            
            {/* Division Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="font-medium text-gray-700 min-w-[80px]">Division:</label>
              <div className="flex flex-wrap gap-3">
                {divisions.map(division => (
                  <label key={division} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDivisions.includes(division)}
                      onChange={() => handleDivisionChange(division)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{division}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Year Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="font-medium text-gray-700 min-w-[80px]">Year:</label>
              <div className="flex flex-wrap gap-3">
                {yearOptions.map(year => (
                  <label key={year} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={() => handleYearChange(year)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{year}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Season Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="font-medium text-gray-700 min-w-[80px]">Season:</label>
              <div className="flex flex-wrap gap-3">
                {seasonOptions.map(season => (
                  <label key={season} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(season)}
                      onChange={() => handleSeasonChange(season)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{season}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Remove Apply Filters button - filters should auto-refresh */}
            {/* <div className="flex justify-end">
              <button 
                onClick={handleApplyFilters} 
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                Apply Filters
              </button>
            </div> */}
          </div>
        </div>

        {/* Player Statistics Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Player Statistics 
            {selectedYears.length === 1 && selectedSeasons.length === 1 && selectedYears[0] !== 'All' && selectedSeasons[0] !== 'All'
              ? ` - ${selectedYears[0]} ${selectedSeasons[0]}`
              : selectedYears.length === 1 && selectedYears[0] !== 'All'
                ? ` - ${selectedYears[0]}`
                : selectedSeasons.length === 1 && selectedSeasons[0] !== 'All'
                  ? ` - ${selectedSeasons[0]}`
                  : ''
            }
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {selectedYears.includes('2025') && selectedSeasons.includes('Fall') 
              ? 'Showing players with games played (GP > 0) for the current season.'
              : 'Filter by year, season, and division to view specific statistics.'
            }
          </p>
          
          {filterLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Updating statistics...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 text-sm">
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-[10px] text-blue-700 uppercase tracking-wide">Top Scorer</div>
                  <div className="font-semibold text-blue-900 truncate" title={analytics.topScorer?.playerName}>{analytics.topScorer? analytics.topScorer.playerName : '—'}</div>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="text-[10px] text-green-700 uppercase tracking-wide">Avg Points/Player</div>
                  <div className="font-semibold text-green-900">{analytics.avgPoints}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <div className="text-[10px] text-purple-700 uppercase tracking-wide">Median Points</div>
                  <div className="font-semibold text-purple-900">{analytics.medianPoints}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <div className="text-[10px] text-orange-700 uppercase tracking-wide">Total Goals</div>
                  <div className="font-semibold text-orange-900">{analytics.totalGoals}</div>
                </div>
                <div className="bg-teal-50 p-3 rounded border border-teal-200">
                  <div className="text-[10px] text-teal-700 uppercase tracking-wide">Goals / Game (Agg)</div>
                  <div className="font-semibold text-teal-900">{analytics.goalsPerGameAgg}</div>
                </div>
                <div className="bg-rose-50 p-3 rounded border border-rose-200">
                  <div className="text-[10px] text-rose-700 uppercase tracking-wide">Points / Player GP</div>
                  <div className="font-semibold text-rose-900">{analytics.pointsPerPlayerPerGame}</div>
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
            <p className="text-gray-500 text-center py-8">
              {selectedYears.includes('2025') && selectedSeasons.includes('Fall') 
                ? 'No games have been played yet for the 2025 Fall season. Statistics will appear here once games begin.'
                : 'No player statistics available for the selected filters.'
              }
            </p>
          )}
        </>
        )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Team Statistics Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Team Statistics</h2>
            
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
                        onClick={() => sortTeams('shotsFor')}
                      >
                        Shots For {getSortIcon('shotsFor', teamSortField, teamSortDirection)}
                      </th>
                      <th 
                        className="px-4 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200"
                        onClick={() => sortTeams('shotsAgainst')}
                      >
                        Shots Against {getSortIcon('shotsAgainst', teamSortField, teamSortDirection)}
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
                        <td className="px-4 py-3 text-center text-gray-700">{team.shotsFor || 0}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{team.shotsAgainst || 0}</td>
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

          {/* Top 10 Scorers Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{getTopScorersTitle()}</h2>
            {generateTopScorersChart() ? (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex justify-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-700">Goals</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-700">Assists</span>
                  </div>
                </div>
                <Bar
                  data={generateTopScorersChart()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      title: { display: false }
                    },
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true, beginAtZero: true }
                    }
                  }}
                />
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available for chart</p>
            )}
          </div>
        </div>

        {/* Analytics Charts - Historical Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Analytics & Trends</h2>
          
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
        </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors z-40"
        title="Ask about stats"
      >
        💬
      </button>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
      />
    </div>
  </div>
  );
});

Statistics.displayName = 'Statistics';

export default Statistics;
