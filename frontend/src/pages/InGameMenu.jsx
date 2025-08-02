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
        const apiUrl = import.meta.env.DEV 
          ? '/api/penalties' 
          : `${import.meta.env.VITE_API_BASE_URL}/api/penalties`;
        const res = await axios.get(apiUrl, { 
          params: { gameId: selectedGame.id || selectedGame.gameId } 
        });
        setEvents(res.data || []);
        setEventsError(null);
      } catch (err) {
        console.error('Failed to fetch events', err);
        setEventsError('Error loading events');
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
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
          <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
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
                  <div key={idx} className="text-sm bg-gray-50 p-2 rounded border-l-2 border-yellow-500">
                    <div className="font-medium">{event.penaltyType} - {event.penalizedPlayer}</div>
                    <div className="text-gray-500">{event.penalizedTeam} • Period {event.period} • {event.time}</div>
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
