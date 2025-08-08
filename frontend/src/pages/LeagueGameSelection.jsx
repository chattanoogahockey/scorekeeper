import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';

export default function LeagueGameSelection() {
  const navigate = useNavigate();
  const { setSelectedLeague, setSelectedGame, reset, setRosters } = useContext(GameContext);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Reset context when visiting selection page
    reset();

    const abortController = new AbortController();

    const fetchGames = async () => {
      console.log('🎮 Fetching games from API...');
      console.log('📍 Current window location:', window.location.href);
      console.log('🕐 Current timestamp:', new Date().toISOString());
      
      setLoading(true);
      setError(null);

      try {
        const requestId = Math.random().toString(36).substr(2, 9);
        const res = await axios.get('/api/games', {
          params: { 
            division: 'all', 
            t: Date.now(),
            v: '4',
            rid: requestId
          },
          signal: abortController.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Request-ID': requestId
          }
        });

        console.log(`📊 SUCCESS: Received ${res.data.length} games from API (Request ID: ${requestId}):`, res.data);

        // Fetch submitted games to exclude them
        const submittedRes = await axios.get('/api/games/submitted');
        const submittedIds = new Set(submittedRes.data.map(g => g.id || g.gameId));
        console.log(`📋 Found ${submittedIds.size} submitted games to exclude:`, Array.from(submittedIds));

        // Filter games - Gold division only, not submitted, with valid teams
        const availableGames = res.data.filter(game => {
          const id = game.id || game.gameId;
          const isGold = game.division?.toLowerCase() === 'gold';
          const hasValidTeams = game.homeTeam && game.awayTeam && 
                               game.homeTeam.trim() !== '' && game.awayTeam.trim() !== '' &&
                               game.homeTeam !== 'vs' && game.awayTeam !== 'vs';
          const notSubmitted = !submittedIds.has(id);
          
          const isValid = isGold && hasValidTeams && notSubmitted;
          
          console.log(`Game ${game.awayTeam} vs ${game.homeTeam}: division=${game.division}, valid=${isValid}, submitted=${submittedIds.has(id)}, status=${game.status}`);
          
          return isValid;
        });

        console.log(`✅ Filtered to ${availableGames.length} available games`);
        setGames(availableGames);
        setError(null);

      } catch (err) {
        if (err.name === 'CanceledError') {
          console.log('🚫 Request cancelled');
          return;
        }
        
        console.error('❌ Failed to load games:', err);
        console.error('Error details:', err.response?.data || err.message);
        
        // Handle structured error responses from backend
        const errorData = err.response?.data;
        let errorMessage = 'Failed to load games from server.';
        
        if (errorData?.error && typeof errorData === 'object') {
          // New structured error format
          errorMessage = errorData.message || errorMessage;
          if (errorData.code === 'DB_UNAVAILABLE') {
            errorMessage += ' Database temporarily unavailable.';
          }
          if (errorData.canRetry) {
            errorMessage += ' Please try refreshing the page.';
          }
        } else {
          // Legacy error format
          errorMessage = errorData?.error || errorData?.message || errorMessage;
          errorMessage += ' Please refresh the page.';
        }
        
        setError(errorMessage);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    // Execute immediately on mount - no delay
    fetchGames();

    // Optional: Very light polling for new games only (once every 5 minutes)
    const pollInterval = setInterval(fetchGames, 300000); // Poll every 5 minutes

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up LeagueGameSelection component');
      abortController.abort();
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatGameDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleGameSelect = async (game) => {
    console.log('🎯 Selected game:', game);
    console.log('🕐 Build timestamp:', new Date().toISOString());
    
    try {
      const gameId = game.id || game.gameId;
      console.log('📋 Checking game status for gameId:', gameId);
      
      // Check for existing game data to determine if this is a new game or continuation
      console.log('🥅 Checking for existing goals...');
      const goalsResponse = await axios.get('/api/goals', { 
        params: { gameId },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const goals = goalsResponse.data || [];
      console.log(`Found ${goals.length} existing goals`);
      
      // Check for existing penalties
      console.log('🚫 Checking for existing penalties...');
      const penaltiesResponse = await axios.get('/api/penalties', { 
        params: { gameId },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const penalties = penaltiesResponse.data || [];
      console.log(`Found ${penalties.length} existing penalties`);
      
      // Check for existing shots on goal
      console.log('🎯 Checking for existing shots on goal...');
      const shotsUrl = import.meta.env.DEV 
        ? `/api/shots-on-goal/game/${gameId}` 
        : `${import.meta.env.VITE_API_BASE_URL}/api/shots-on-goal/game/${gameId}`;
      const shotsResponse = await axios.get(shotsUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const shots = shotsResponse.data || { home: 0, away: 0 };
      const totalShots = (shots.home || 0) + (shots.away || 0);
      console.log(`Found ${totalShots} existing shots on goal (home: ${shots.home}, away: ${shots.away})`);
      
      // Check if any data is already submitted (finalized)
      const hasSubmittedData = goals.some(g => g.gameStatus === 'submitted') || 
                             penalties.some(p => p.gameStatus === 'submitted');
      
      if (hasSubmittedData) {
        alert('This game has already been submitted and finalized. You cannot continue scoring.');
        return;
      }
      
      const hasGameData = goals.length > 0 || penalties.length > 0 || totalShots > 0;
      
      if (hasGameData) {
        // This is a game in progress - ask user what they want to do
        const continueGame = window.confirm(
          `This game has existing data (${goals.length} goals, ${penalties.length} penalties, ${totalShots} shots).\n\n` +
          'Click OK to continue where you left off, or Cancel to start over.'
        );
        
        if (continueGame) {
          // User wants to continue - load rosters and go to in-game menu
          console.log('🎯 User chose to continue existing game - going to in-game menu');
          
          // Load existing rosters
          const rostersResponse = await axios.get('/api/rosters', {
            params: { gameId },
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          const existingRosters = rostersResponse.data || [];
          
          const processedRosters = existingRosters.map(roster => ({
            teamName: roster.teamName,
            teamId: roster.teamName,
            players: roster.players.map(player => ({
              name: player.name,
              firstName: player.firstName || player.name.split(' ')[0],
              lastName: player.lastName || player.name.split(' ').slice(1).join(' '),
              jerseyNumber: player.jerseyNumber,
              position: player.position || 'Player'
            }))
          }));
          
          // CRITICAL: Set context synchronously and persist to sessionStorage as a fallback
          console.log('🎯 Setting context before navigation...');
          setSelectedLeague(game.division);
          setRosters(processedRosters);
          setSelectedGame(game);
          try {
            sessionStorage.setItem('selectedGame', JSON.stringify(game));
            sessionStorage.setItem('selectedRosters', JSON.stringify(processedRosters));
          } catch (e) {
            console.warn('⚠️ Failed to write session storage for game/rosters', e);
          }
          
          // Use setTimeout to ensure context has been set before navigation
          console.log('🎯 Scheduling navigation to in-game menu...');
          setTimeout(() => {
            console.log('🎯 NOW navigating to in-game menu with state:', {
              game: game,
              rosters: processedRosters,
              bypassedRoster: true 
            });
            navigate('/ingame', { 
              state: { 
                game: game,
                rosters: processedRosters,
                bypassedRoster: true 
              },
              replace: true
            });
          }, 100); // Small delay to ensure React state has been updated
          return;
          
        } else {
          // User wants to start over - clear existing data first
          const confirmStartOver = window.confirm(
            'Are you sure you want to start over? This will permanently delete all existing goals, penalties, and shots for this game.'
          );
          
          if (!confirmStartOver) {
            return; // User changed their mind
          }
          
          // Clear existing data
          try {
            console.log('🧹 Clearing existing game data...');
            
            // Delete all goals
            for (const goal of goals) {
              await axios.delete(`/api/goals/${goal.id}`, { params: { gameId } });
            }
            
            // Delete all penalties  
            for (const penalty of penalties) {
              await axios.delete(`/api/penalties/${penalty.id}`, { params: { gameId } });
            }
            
            // Reset shots on goal
            if (totalShots > 0) {
              await axios.delete(shotsUrl);
            }
            
            console.log('✅ Game data cleared successfully');
            alert('Game data cleared. Starting fresh with roster attendance.');
          } catch (error) {
            console.error('❌ Error clearing game data:', error);
            alert('Failed to clear game data. Please try again.');
            return;
          }
        }
      }
      
      // If we reach here, this is either a new game OR user chose to start over
      console.log('🆕 Starting new game or fresh start - proceeding to roster attendance');
      setSelectedGame(game);
      setSelectedLeague(game.division);

      // Preload rosters so the roster page renders immediately
      try {
        const rostersResponse = await axios.get('/api/rosters', {
          params: { gameId },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const existingRosters = rostersResponse.data || [];
        const processedRosters = existingRosters.map(roster => ({
          teamName: roster.teamName,
          teamId: roster.teamName,
          players: roster.players.map(player => ({
            name: player.name,
            firstName: player.firstName || player.name.split(' ')[0],
            lastName: player.lastName || player.name.split(' ').slice(1).join(' '),
            jerseyNumber: player.jerseyNumber,
            position: player.position || 'Player'
          }))
        }));
        setRosters(processedRosters);
        try {
          sessionStorage.setItem('selectedRosters', JSON.stringify(processedRosters));
        } catch {}
      } catch (e) {
        console.warn('⚠️ Failed to preload rosters, roster page will handle display', e);
      }

      navigate('/roster');
      
    } catch (error) {
      console.error('Error checking game data:', error);
      alert('Failed to load game data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <div className="w-full max-w-4xl mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold py-2 px-4 rounded-lg mr-4 transition-all duration-200"
            >
              ← Back to Menu
            </button>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold">Select Game</h1>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-gray-600">
              {currentTime.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      
      {loading && <p className="text-lg">Loading games...</p>}
      {error && <p className="text-red-500 text-lg">{error}</p>}
      
      {!loading && !error && (
        <div className="grid md:grid-cols-2 gap-4 w-full max-w-4xl">
          {games.map((game) => (
            <div
              key={game.id || game.gameId}
              className="border rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="mb-3">
                <h3 className="text-xl font-semibold text-gray-800">
                  {game.awayTeam || game.awayTeamId} vs {game.homeTeam || game.homeTeamId}
                </h3>
              </div>
              
              <div className="space-y-2 text-sm mb-4">
                <p className="text-gray-600">
                  <span className="font-medium">Date:</span> {formatGameDate(game.gameDate || game.date)}
                </p>
                
                {game.division && (
                  <p className="text-gray-600">
                    <span className="font-medium">Division:</span> {game.division}
                  </p>
                )}
                
                <p className="text-gray-500">
                  <span className="font-medium">Status:</span> {game.status || 'Scheduled'}
                </p>
                
                {game.location && (
                  <p className="text-gray-600">
                    <span className="font-medium">Location:</span> {game.location}
                  </p>
                )}
              </div>
              
              {/* Centered Select Game Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => handleGameSelect(game)}
                  className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all duration-200"
                >
                  Select Game
                </button>
              </div>
            </div>
          ))}
          
          {!loading && games.length === 0 && (
            <div className="col-span-2 text-center py-8">
              <p className="text-gray-500 text-lg">No games available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
