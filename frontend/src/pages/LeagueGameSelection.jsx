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
    setSelectedGame(game);
    setSelectedLeague(game.league);
    
    try {
      // For now, set empty rosters - you can implement roster loading later
      // based on your rosters container structure
      setRosters([]);
    } catch (err) {
      console.error('Failed to load rosters', err);
    }
    navigate('/roster');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">Select League & Game</h1>
      
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
                
                {game.league && (
                  <p className="text-gray-600">
                    <span className="font-medium">League:</span> {game.league}
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