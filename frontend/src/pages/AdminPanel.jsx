import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get('/api/games?league=all');
      // Filter for games with status 'submitted' or 'completed'
      setGames(response.data.filter(game => 
        game.gameStatus === 'submitted' || 
        game.gameStatus === 'completed' || 
        game.status === 'submitted' || 
        game.status === 'completed'
      ));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      setLoading(false);
    }
  };

  const handleDeleteGameScore = async (gameId) => {
    const game = games.find(g => g.id === gameId);
    const confirmMessage = `Delete all scoring data for ${game.awayTeam} vs ${game.homeTeam}? This will reset the game to unscored state.`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? `/api/games/${gameId}/reset` 
        : `${import.meta.env.VITE_API_BASE_URL}/api/games/${gameId}/reset`;
      
      const response = await axios.delete(apiUrl);
      
      if (response.data.success) {
        setMessage(`Game scoring data deleted successfully. Game is now available for re-scoring.`);
        fetchGames(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting game score:', error);
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleEditScore = (gameId) => {
    // For now, navigate to the game with a special edit mode
    // This could be expanded to a dedicated edit interface
    setMessage('Score editing feature coming soon');
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <button
              onClick={handleBackToMain}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Main
            </button>
          </div>
          
          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Completed Games</h2>
          
          {loading ? (
            <p className="text-gray-500">Loading games...</p>
          ) : games.length === 0 ? (
            <p className="text-gray-500">No completed games found.</p>
          ) : (
            <div className="space-y-4">
              {games.map((game) => (
                <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {game.awayTeam} vs {game.homeTeam}
                      </h3>
                      <p className="text-gray-600">
                        {game.league} League • {new Date(game.gameDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Game ID: {game.id}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditScore(game.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
                        disabled
                      >
                        Edit Score
                      </button>
                      
                      <button
                        onClick={() => handleDeleteGameScore(game.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Delete Score
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
