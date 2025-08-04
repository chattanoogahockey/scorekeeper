import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // Track which game is being deleted
  const [message, setMessage] = useState('');
  const [voices, setVoices] = useState({ currentVoice: '', availableVoices: [] });
  const [voiceLoading, setVoiceLoading] = useState(false);

  useEffect(() => {
    fetchGames();
    fetchVoices();
  }, []);

  const fetchGames = async () => {
    try {
      console.log('AdminPanel: Fetching submitted games from /api/games/submitted...');
      const response = await axios.get('/api/games/submitted');
      console.log('AdminPanel: Received response:', response.data);
      setGames(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching submitted games:', error);
      setLoading(false);
    }
  };

  const fetchVoices = async () => {
    try {
      const response = await axios.get('/api/admin/voices');
      setVoices(response.data);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const handleDeleteGameScore = async (gameId) => {
    const game = games.find(g => g.id === gameId);
    const confirmMessage = `Delete all scoring data for ${game.awayTeam} vs ${game.homeTeam}? This will completely remove the game from the admin panel.`;
    
    if (!confirm(confirmMessage)) return;
    
    console.log(`AdminPanel: Attempting to delete game ${gameId}`);
    setDeleting(gameId); // Show loading state for this specific game
    setMessage(''); // Clear any previous messages
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? `/api/games/${gameId}/reset` 
        : `${import.meta.env.VITE_API_BASE_URL}/api/games/${gameId}/reset`;
      
      console.log(`AdminPanel: Making DELETE request to ${apiUrl}`);
      const response = await axios.delete(apiUrl);
      console.log(`AdminPanel: Delete response:`, response.data);
      
      if (response.data.success) {
        // Immediately remove the game from local state for instant UI feedback
        setGames(prevGames => prevGames.filter(g => g.id !== gameId));
        
        setMessage(`Game completely removed. Deleted ${response.data.deletedItems.totalDeleted} records total.`);
        console.log('AdminPanel: Refreshing games list...');
        
        // Also refresh from server to ensure consistency
        setTimeout(async () => {
          await fetchGames();
          console.log('AdminPanel: Games list refreshed from server');
        }, 1000);
      } else {
        setMessage(`Error: Deletion response indicated failure`);
      }
    } catch (error) {
      console.error('Error deleting game score:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setDeleting(null); // Clear loading state
    }
  };

  const handleEditScore = (gameId) => {
    // Navigate to the dedicated edit page
    navigate(`/admin/edit/${gameId}`);
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  const handleVoiceChange = async (voiceId) => {
    setVoiceLoading(true);
    try {
      const response = await axios.post('/api/admin/voices/select', { voiceId });
      if (response.data.success) {
        setMessage(`Announcer voice changed to ${voiceId}`);
        fetchVoices(); // Refresh voice info
      }
    } catch (error) {
      console.error('Error changing voice:', error);
      setMessage(`Error changing voice: ${error.response?.data?.error || error.message}`);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleTestVoice = async (voiceId) => {
    try {
      const response = await axios.post('/api/admin/voices/test', { voiceId });
      if (response.data.success) {
        // Play the test audio
        const audio = new Audio(response.data.audioUrl);
        audio.play().catch(audioError => {
          console.error('Error playing audio:', audioError);
          setMessage(`Test audio generated but playback failed: ${audioError.message}`);
        });
        setMessage(`Playing test audio for ${voiceId}`);
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setMessage(`Error testing voice: ${errorMsg}`);
    }
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

        {/* Announcer Voice Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Announcer Voice Settings</h2>
          
          {voices.availableVoices.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-2">
                  Current Voice: <span className="font-semibold">{voices.currentVoice}</span>
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {voices.availableVoices.map((voice) => (
                  <div 
                    key={voice.id} 
                    className={`border-2 rounded-lg p-4 transition-all ${
                      voice.id === voices.currentVoice 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col space-y-2">
                      <h3 className="font-semibold text-gray-800">{voice.name}</h3>
                      <p className="text-sm text-gray-600">{voice.description}</p>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          voice.type === 'Studio' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {voice.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          voice.gender === 'FEMALE' 
                            ? 'bg-pink-100 text-pink-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {voice.gender}
                        </span>
                      </div>
                      
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => handleTestVoice(voice.id)}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
                        >
                          Test
                        </button>
                        {voice.id !== voices.currentVoice && (
                          <button
                            onClick={() => handleVoiceChange(voice.id)}
                            disabled={voiceLoading}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-2 rounded text-sm transition-colors"
                          >
                            {voiceLoading ? 'Setting...' : 'Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                      >
                        Edit Score
                      </button>
                      
                      <button
                        onClick={() => handleDeleteGameScore(game.id)}
                        disabled={deleting === game.id}
                        className={`px-4 py-2 rounded-lg transition-colors text-white ${
                          deleting === game.id 
                            ? 'bg-red-300 cursor-not-allowed' 
                            : 'bg-red-500 hover:bg-red-600'
                        }`}
                      >
                        {deleting === game.id ? 'Deleting...' : 'Delete Score'}
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
