import React, { useEffect, useState, useContext } from 'react';
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
    
    // Load all games directly
    setLoading(true);
    axios.get('/api/games?league=all')
      .then((res) => {
        setGames(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load games', err);
        setError('Failed to load games');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
    console.log('Selected game:', game);
    console.log('Build timestamp:', new Date().toISOString());
    
    // Check if this game has existing data (goals or penalties)
    try {
      const gameId = game.id || game.gameId;
      
      // Check for existing goals
      const goalsResponse = await axios.get('/api/goals', { params: { gameId } });
      const goals = goalsResponse.data || [];
      
      // Check for existing penalties
      const penaltiesResponse = await axios.get('/api/penalties', { params: { gameId } });
      const penalties = penaltiesResponse.data || [];
      
      const hasExistingData = goals.length > 0 || penalties.length > 0;
      
      if (hasExistingData) {
        // Check if any data is already submitted (finalized)
        const hasSubmittedData = goals.some(g => g.gameStatus === 'submitted') || 
                               penalties.some(p => p.gameStatus === 'submitted');
        
        if (hasSubmittedData) {
          alert('This game has already been submitted and finalized. You cannot continue scoring.');
          return;
        }
        
        // Ask user if they want to continue or start over
        const continueGame = confirm(
          `This game has existing data (${goals.length} goals, ${penalties.length} penalties).\n\n` +
          'Do you want to:\n' +
          '✅ YES - Continue where you left off\n' +
          '❌ NO - Start over (this will clear existing data)'
        );
        
        if (!continueGame) {
          // User wants to start over - would need to implement data clearing
          // For now, we'll just warn them
          const confirmStartOver = confirm(
            'Starting over will require manually clearing the existing data. ' +
            'For now, please continue with existing data or contact an administrator to clear the game data.'
          );
          if (!confirmStartOver) {
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing game data:', error);
      // Continue anyway if we can't check
    }
    
    setSelectedGame(game);
    setSelectedLeague(game.league);
    
    try {
      // Load rosters for the game's teams
      console.log('Loading rosters...');
      const rostersResponse = await axios.get('/api/rosters');
      const allRosters = rostersResponse.data;
      console.log('All rosters loaded:', allRosters.length, 'players');
      
      // Get team names from the game
      const awayTeamName = game.awayTeam || game.awayTeamId;
      const homeTeamName = game.homeTeam || game.homeTeamId;
      console.log('Looking for teams:', awayTeamName, 'vs', homeTeamName);
      
      // Group rosters by team for the selected teams
      const gameRosters = [];
      
      if (awayTeamName) {
        const awayPlayers = allRosters.filter(player => 
          player.teamName === awayTeamName
        );
        console.log('Away team players found:', awayPlayers.length, 'for', awayTeamName);
        if (awayPlayers.length > 0) {
          gameRosters.push({
            teamName: awayTeamName,
            teamId: awayTeamName,
            players: awayPlayers.map(player => ({
              name: player.fullName || `${player.firstName} ${player.lastName}`,
              jerseyNumber: player.jerseyNumber,
              position: player.position || 'Player' // Use actual position from roster
            }))
          });
        }
      }
      
      if (homeTeamName) {
        const homePlayers = allRosters.filter(player => 
          player.teamName === homeTeamName
        );
        console.log('Home team players found:', homePlayers.length, 'for', homeTeamName);
        if (homePlayers.length > 0) {
          gameRosters.push({
            teamName: homeTeamName,
            teamId: homeTeamName,
            players: homePlayers.map(player => ({
              name: player.fullName || `${player.firstName} ${player.lastName}`,
              jerseyNumber: player.jerseyNumber,
              position: player.position || 'Player' // Use actual position from roster
            }))
          });
        }
      }
      
      console.log('Final game rosters:', gameRosters);
      setRosters(gameRosters);
    } catch (err) {
      console.error('Failed to load rosters', err);
      setRosters([]); // Fallback to empty rosters
    }
    navigate('/roster');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <div className="w-full max-w-4xl mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Select Game</h1>
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
              className="border rounded-lg shadow-md p-6 cursor-pointer hover:bg-gray-50 hover:shadow-lg transition-all duration-200"
              onClick={() => handleGameSelect(game)}
            >
              <div className="mb-3">
                <h3 className="text-xl font-semibold text-gray-800">
                  {game.awayTeam || game.awayTeamId} vs {game.homeTeam || game.homeTeamId}
                </h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Date:</span> {formatGameDate(game.gameDate || game.date)}
                </p>
                
                {(game.division || game.league) && (
                  <p className="text-gray-600">
                    <span className="font-medium">Division:</span> {game.division || game.league}
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