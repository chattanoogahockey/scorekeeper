import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';
import MediaControlPanel from '../components/MediaControlPanel.jsx';
import OTShootoutButton from '../components/OTShootoutButton.jsx';
import axios from 'axios';

/**
 * Enhanced In-Game Menu with integrated dashboard functionality
 */
export default function InGameMenu() {
  const { selectedGame, setSelectedGame } = useContext(GameContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Handle navigation state for roster bypass
  useEffect(() => {
    console.log('🔍 InGameMenu useEffect - selectedGame:', selectedGame);
    console.log('🔍 InGameMenu useEffect - location.state:', location.state);
    
    if (!selectedGame && location.state?.game) {
      // If we have game data in navigation state but not in context, update context
      console.log('🎮 Setting game from navigation state:', location.state.game);
      setSelectedGame(location.state.game);
    }
    
    // Mark as initialized after context sync attempt
    if (!isInitialized) {
      console.log('🔧 Marking InGameMenu as initialized');
      setIsInitialized(true);
    }
  }, [selectedGame, location.state, setSelectedGame, isInitialized]);
  
  // State for events feed with enhanced descriptions
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState(null);
  const [loadingDescriptions, setLoadingDescriptions] = useState(new Set());
  
  // State for current game score and shots on goal
  const [currentScore, setCurrentScore] = useState({ away: 0, home: 0 });
  const [shotsOnGoal, setShotsOnGoal] = useState({ away: 0, home: 0 });
  const [isSubmittingGame, setIsSubmittingGame] = useState(false);

  // Function to refresh data (can be called from returning navigation)
  const refreshGameData = async () => {
    const gameToUse = selectedGame || location.state?.game;
    if (!gameToUse) return;
    
    try {
      // Fetch penalties, goals, and shots on goal
      const penaltiesUrl = import.meta.env.DEV 
        ? '/api/penalties' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/penalties`;
      const goalsUrl = import.meta.env.DEV 
        ? '/api/goals' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/goals`;
      const shotsUrl = import.meta.env.DEV 
        ? `/api/shots-on-goal/game/${gameToUse.id || gameToUse.gameId}` 
        : `${import.meta.env.VITE_API_BASE_URL}/api/shots-on-goal/game/${gameToUse.id || gameToUse.gameId}`;
        
      const [penaltiesRes, goalsRes, shotsRes] = await Promise.all([
        axios.get(penaltiesUrl, { params: { gameId: gameToUse.id || gameToUse.gameId } }),
        axios.get(goalsUrl, { params: { gameId: gameToUse.id || gameToUse.gameId } }),
        axios.get(shotsUrl)
      ]);
      
      const penalties = (penaltiesRes.data || []).map(p => ({ ...p, eventType: 'penalty' }));
      const goals = (goalsRes.data || []).map(g => ({ ...g, eventType: 'goal' }));
      
      // Combine and sort by recorded time
      const allEvents = [...penalties, ...goals].sort((a, b) => 
        new Date(b.recordedAt) - new Date(a.recordedAt)
      );
      
      setEvents(allEvents);
      setEventsError(null);
      
      // Calculate current score
      const awayScore = goals.filter(g => g.scoringTeam === (gameToUse.awayTeam || gameToUse.awayTeamId)).length;
      const homeScore = goals.filter(g => g.scoringTeam === (gameToUse.homeTeam || gameToUse.homeTeamId)).length;
      setCurrentScore({ away: awayScore, home: homeScore });
      
      // Set shots on goal
      setShotsOnGoal(shotsRes.data || { home: 0, away: 0 });
      
    } catch (err) {
      console.error('Failed to refresh game data', err);
      setEventsError('Error loading events');
    }
  };

  // Event-driven data fetching
  useEffect(() => {
    if (!selectedGame) return;
    
    // Initial fetch on component mount only
    refreshGameData();
    
    // Purely event-driven - only fetch on mount, no polling or visibility changes
    // Data will be refreshed when user returns from goal/penalty entry forms
  }, [selectedGame]);

  // Use game from context or navigation state
  const currentGame = selectedGame || location.state?.game;

  // Only redirect after initialization and if still no game data
  if (isInitialized && !currentGame) {
    console.log('🚨 No game data found after initialization, redirecting to home');
    navigate('/');
    return null;
  }

  // Show loading while initializing
  if (!isInitialized || !currentGame) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading game...</div>
      </div>
    );
  }

  const handleGoalClick = () => {
    navigate('/goal');
  };

  const handlePenaltyClick = () => {
    navigate('/penalty');
  };

  const handleShotsOnGoal = async (team) => {
    console.log(`🎯 handleShotsOnGoal called for team: ${team}`);
    console.log(`🎯 Current game:`, currentGame);
    
    try {
      // Send to backend first
      const apiUrl = import.meta.env.DEV 
        ? '/api/shots-on-goal' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/shots-on-goal`;
      
      console.log(`🎯 Making API call to: ${apiUrl}`);
      console.log(`🎯 Request payload:`, {
        gameId: currentGame.id || currentGame.gameId,
        team: team
      });
      
      const response = await axios.post(apiUrl, {
        gameId: currentGame.id || currentGame.gameId,
        team: team
      });
      
      console.log(`✅ Response received:`, response.data);
      
      // Update local state with the server response to ensure consistency
      if (response.data) {
        setShotsOnGoal({
          home: response.data.home || 0,
          away: response.data.away || 0
        });
        console.log(`✅ Local state updated: home=${response.data.home}, away=${response.data.away}`);
      }
      
      console.log(`✅ Shot on goal recorded for ${team}`);
    } catch (error) {
      console.error('❌ Failed to record shot on goal:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      alert(`Failed to record shot on goal: ${error.response?.data?.error || error.message}`);
      // Refresh game data to get current state from server
      refreshGameData();
    }
  };

  const handleUndo = async () => {
    if (!confirm('Are you sure you want to undo the last action? This will delete the most recent goal or penalty from the database.')) {
      return;
    }
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/undo-last-action' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/undo-last-action`;
      
      await axios.post(apiUrl, {
        gameId: currentGame.id || currentGame.gameId
      });
      
      // Refresh game data after undo
      refreshGameData();
      
    } catch (error) {
      console.error('Failed to undo last action:', error);
      alert(`Error undoing last action: ${error.response?.data?.error || error.message}`);
    }
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
        gameId: currentGame.id || currentGame.gameId,
        finalScore: {
          [currentGame.awayTeam || currentGame.awayTeamId]: currentScore.away,
          [currentGame.homeTeam || currentGame.homeTeamId]: currentScore.home
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

  const handleGameCompleted = (gameId) => {
    // Game was completed via OT/Shootout, redirect to home
    console.log(`Game ${gameId} completed via OT/Shootout`);
    navigate('/');
  };

  const handleCancelGame = async () => {
    if (!confirm('Are you sure you want to cancel this game? This will delete ALL game data including goals and penalties. This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('Final confirmation: Delete ALL data for this game and return to the menu?')) {
      return;
    }
    
    try {
      const gameId = currentGame.id || currentGame.gameId;
      
      // Delete all goals for this game
      const goalsResponse = await axios.get('/api/goals', { params: { gameId } });
      for (const goal of goalsResponse.data || []) {
        await axios.delete(`/api/goals/${goal.id}`, { params: { gameId } });
      }
      
      // Delete all penalties for this game
      const penaltiesResponse = await axios.get('/api/penalties', { params: { gameId } });
      for (const penalty of penaltiesResponse.data || []) {
        await axios.delete(`/api/penalties/${penalty.id}`, { params: { gameId } });
      }
      
      alert('Game cancelled successfully. All data has been cleared.');
      navigate('/'); // Go back to home
    } catch (error) {
      console.error('Failed to cancel game:', error);
      alert(`Error cancelling game: ${error.response?.data?.error || error.message}`);
    }
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
            {currentGame.awayTeam || currentGame.awayTeamId} vs {currentGame.homeTeam || currentGame.homeTeamId}
          </p>
          
          {/* Current Score Display with Shots on Goal */}
          <div className="bg-gray-100 rounded-lg p-3 my-3">
            <div className="text-xs text-gray-500 mb-1">CURRENT SCORE</div>
            <div className="flex justify-between items-center text-lg font-bold">
              <div className="text-center">
                <div className="text-xs text-gray-600">{currentGame.awayTeam || currentGame.awayTeamId}</div>
                <div className="text-2xl">{currentScore.away}</div>
                <button
                  onClick={() => handleShotsOnGoal('away')}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded mt-1 transition-colors"
                >
                  S.O.G. ({shotsOnGoal.away})
                </button>
              </div>
              <div className="text-gray-400">-</div>
              <div className="text-center">
                <div className="text-xs text-gray-600">{currentGame.homeTeam || currentGame.homeTeamId}</div>
                <div className="text-2xl">{currentScore.home}</div>
                <button
                  onClick={() => handleShotsOnGoal('home')}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded mt-1 transition-colors"
                >
                  S.O.G. ({shotsOnGoal.home})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scorekeeper Panel */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Scorekeeper</h2>

          {/* 8 buttons in 2x4 grid layout */}
          <div className="grid grid-cols-2 gap-2">
            {/* Row 1: Goal and Penalty */}
            <button
              onClick={handleGoalClick}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center"
            >
              Goal
            </button>
            <button
              onClick={handlePenaltyClick}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center"
            >
              Penalty
            </button>

            {/* Row 2: OT-Shootout and Rosters */}
            <div className="col-span-1">
              <OTShootoutButton onGameCompleted={handleGameCompleted} />
            </div>
            <button
              onClick={() => navigate('/roster')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center h-full"
            >
              Rosters
            </button>

            {/* Row 3: Undo and Admin (swapped) */}
            <button
              onClick={handleUndo}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center"
            >
              Undo
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center"
            >
              Admin
            </button>

            {/* Row 4: Cancel and Submit */}
            <button
              onClick={handleCancelGame}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200"
            >
              Cancel Game
            </button>
            <button
              onClick={handleSubmitGame}
              disabled={isSubmittingGame}
              className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200"
            >
              {isSubmittingGame ? 'Submitting...' : 'Submit Game'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-3">
            Submit finalizes data • Cancel deletes all game data • Undo removes last action
          </p>
        </div>

        {/* Integrated Dashboard Components */}
        <div className="space-y-4">
          {/* Announcer Controls */}
          {/* Media Control Panel - Combined DJ and Announcer */}
          <div className="bg-white rounded-lg shadow-md">
            <MediaControlPanel gameId={selectedGame.id || selectedGame.gameId} />
          </div>

          {/* Recent Events Feed - Moved to bottom */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              Live Game Feed
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
                        <div className="font-medium">GOAL - {event.scorer}</div>
                        <div className="text-gray-500">{event.scoringTeam} • Period {event.period} • {event.time}</div>
                        {event.assists && event.assists.length > 0 && (
                          <div className="text-xs text-gray-400">Assist: {event.assists.join(', ')}</div>
                        )}
                        {event.aiDescription && (
                          <div className="text-xs text-blue-600 mt-1 italic">
                            🤖 {event.aiDescription}
                          </div>
                        )}
                        {loadingDescriptions.has(`${event.id}-${event.eventType}`) && (
                          <div className="text-xs text-gray-400 mt-1">
                            ⏳ Generating AI description...
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="font-medium">{event.penaltyType} - {event.penalizedPlayer}</div>
                        <div className="text-gray-500">{event.penalizedTeam} • Period {event.period} • {event.time} • {event.penaltyLength} min</div>
                        {event.aiDescription && (
                          <div className="text-xs text-blue-600 mt-1 italic">
                            🤖 {event.aiDescription}
                          </div>
                        )}
                        {loadingDescriptions.has(`${event.id}-${event.eventType}`) && (
                          <div className="text-xs text-gray-400 mt-1">
                            ⏳ Generating AI description...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No events recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
