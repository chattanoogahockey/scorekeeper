import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';
import AnnouncerControls from '../components/AnnouncerControls.jsx';
import DJPanel from '../components/DJPanel.jsx';
import axios from 'axios';

/**
 * Enhanced In-Game Menu with integrated dashboard functionality
 */
export default function InGameMenu() {
  const { selectedGame } = useContext(GameContext);
  const navigate = useNavigate();
  
  // State for current time/date
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State for events feed
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState(null);
  
  // State for current game score
  const [currentScore, setCurrentScore] = useState({ away: 0, home: 0 });
  const [isSubmittingGame, setIsSubmittingGame] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll events every 10 seconds
  useEffect(() => {
    if (!selectedGame) return;
    
    const fetchEvents = async () => {
      try {
        // Fetch both penalties and goals
        const penaltiesUrl = import.meta.env.DEV 
          ? '/api/penalties' 
          : `${import.meta.env.VITE_API_BASE_URL}/api/penalties`;
        const goalsUrl = import.meta.env.DEV 
          ? '/api/goals' 
          : `${import.meta.env.VITE_API_BASE_URL}/api/goals`;
          
        const [penaltiesRes, goalsRes] = await Promise.all([
          axios.get(penaltiesUrl, { params: { gameId: selectedGame.id || selectedGame.gameId } }),
          axios.get(goalsUrl, { params: { gameId: selectedGame.id || selectedGame.gameId } })
        ]);
        
        const penalties = (penaltiesRes.data || []).map(p => ({ ...p, eventType: 'penalty' }));
        const goals = (goalsRes.data || []).map(g => ({ ...g, eventType: 'goal' }));
        
        // Combine and sort by recorded time
        const allEvents = [...penalties, ...goals].sort((a, b) => 
          new Date(b.recordedAt) - new Date(a.recordedAt)
        );
        
        setEvents(allEvents);
        setEventsError(null);
      } catch (err) {
        console.error('Failed to fetch events', err);
        setEventsError('Error loading events');
      }
    };
    
    const fetchScore = async () => {
      try {
        const apiUrl = import.meta.env.DEV 
          ? '/api/goals' 
          : `${import.meta.env.VITE_API_BASE_URL}/api/goals`;
        const res = await axios.get(apiUrl, { 
          params: { gameId: selectedGame.id || selectedGame.gameId } 
        });
        const goals = res.data || [];
        
        // Calculate current score
        const awayScore = goals.filter(g => g.scoringTeam === (selectedGame.awayTeam || selectedGame.awayTeamId)).length;
        const homeScore = goals.filter(g => g.scoringTeam === (selectedGame.homeTeam || selectedGame.homeTeamId)).length;
        setCurrentScore({ away: awayScore, home: homeScore });
      } catch (err) {
        console.error('Failed to fetch score', err);
      }
    };
    
    fetchEvents();
    fetchScore();
    const interval = setInterval(() => {
      fetchEvents();
      fetchScore();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedGame]);

  if (!selectedGame) {
    // If no game selected, redirect back to home
    navigate('/');
    return null;
  }

  const handleGoalClick = () => {
    navigate('/goal');
  };

  const handlePenaltyClick = () => {
    navigate('/penalty');
  };

  const handleSubmitGame = async () => {
    if (!confirm('Are you sure you want to submit this game? This will finalize all game data and cannot be undone.')) {
      return;
    }
    
    setIsSubmittingGame(true);
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/games/submit' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/games/submit`;
      
      const response = await axios.post(apiUrl, {
        gameId: selectedGame.id || selectedGame.gameId,
        finalScore: {
          [selectedGame.awayTeam || selectedGame.awayTeamId]: currentScore.away,
          [selectedGame.homeTeam || selectedGame.homeTeamId]: currentScore.home
        },
        submittedBy: 'Scorekeeper'
      });
      
      alert('Game submitted successfully! All data has been finalized.');
      navigate('/'); // Go back to home
    } catch (error) {
      console.error('Failed to submit game:', error);
      alert(`Error submitting game: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSubmittingGame(false);
    }
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Compact Game Header with Time */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 text-center">
          <h1 className="text-lg font-bold text-gray-800 mb-1">
            In-Game Dashboard
          </h1>
          <p className="text-md text-gray-600 font-medium">
            {selectedGame.awayTeam || selectedGame.awayTeamId} vs {selectedGame.homeTeam || selectedGame.homeTeamId}
          </p>
          
          {/* Current Score Display */}
          <div className="bg-gray-100 rounded-lg p-3 my-3">
            <div className="text-xs text-gray-500 mb-1">CURRENT SCORE</div>
            <div className="flex justify-between items-center text-lg font-bold">
              <div className="text-center">
                <div className="text-xs text-gray-600">{selectedGame.awayTeam || selectedGame.awayTeamId}</div>
                <div className="text-2xl">{currentScore.away}</div>
              </div>
              <div className="text-gray-400">-</div>
              <div className="text-center">
                <div className="text-xs text-gray-600">{selectedGame.homeTeam || selectedGame.homeTeamId}</div>
                <div className="text-2xl">{currentScore.home}</div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{selectedGame.date || selectedGame.gameDate || 'Date TBD'}</span>
            <span className="font-mono">{formatCurrentTime()} • {formatCurrentDate()}</span>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleGoalClick}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg shadow-lg text-lg transition-colors"
          >
            🥅 Record Goal
          </button>

          <button
            onClick={handlePenaltyClick}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-4 rounded-lg shadow-lg text-lg transition-colors"
          >
            ⚠️ Record Penalty
          </button>
        </div>

        {/* Submit Game Button */}
        <div className="mb-4">
          <button
            onClick={handleSubmitGame}
            disabled={isSubmittingGame}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg shadow-lg text-lg transition-colors"
          >
            {isSubmittingGame ? '🔄 Submitting...' : '🏁 Submit Game'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-1">
            This will finalize all game data
          </p>
        </div>

        {/* Integrated Dashboard Components */}
        <div className="space-y-4">
          {/* Recent Events Feed */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              📈 Live Game Feed
            </h3>
            {eventsError ? (
              <p className="text-red-500 text-sm">{eventsError}</p>
            ) : events.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {events.slice(0, 5).map((event, idx) => (
                  <div key={idx} className={`text-sm p-2 rounded border-l-2 ${
                    event.eventType === 'goal' 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-yellow-50 border-yellow-500'
                  }`}>
                    {event.eventType === 'goal' ? (
                      <>
                        <div className="font-medium">⚽ GOAL - {event.scorer}</div>
                        <div className="text-gray-500">{event.scoringTeam} • Period {event.period} • {event.time}</div>
                        {event.assists && event.assists.length > 0 && (
                          <div className="text-xs text-gray-400">Assist: {event.assists.join(', ')}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="font-medium">⚠️ {event.penaltyType} - {event.penalizedPlayer}</div>
                        <div className="text-gray-500">{event.penalizedTeam} • Period {event.period} • {event.time} • {event.penaltyLength} min</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No events recorded yet</p>
            )}
          </div>

          {/* Announcer Controls */}
          <div className="bg-white rounded-lg shadow-md">
            <AnnouncerControls gameId={selectedGame.id || selectedGame.gameId} />
          </div>

          {/* DJ Panel */}
          <div className="bg-white rounded-lg shadow-md">
            <DJPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
