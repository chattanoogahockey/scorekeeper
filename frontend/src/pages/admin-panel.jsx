import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import staticDataService from '../services/staticDataService.js';
import { GameContext } from '../contexts/game-context.jsx';

// Version information component
const VersionInfo = () => {
  const [versionInfo, setVersionInfo] = useState(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        // Try backend API first with cache busting
        const response = await axios.get(`${apiBase}/api/version`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          params: {
            t: Date.now() // Cache busting
          }
        });
        
        console.log('Version info received:', response.data);
        setVersionInfo(response.data);
      } catch (error) {
        console.error('Error fetching version from API:', error);
        
        // Fallback to static version file
        try {
          const staticResponse = await fetch(`/version.json?t=${Date.now()}`);
          if (staticResponse.ok) {
            const staticData = await staticResponse.json();
            console.log('Static version info:', staticData);
            setVersionInfo(staticData);
          } else {
            throw new Error('Static version file not found');
          }
        } catch (staticError) {
          console.error('Error fetching static version:', staticError);
          // Final fallback - but preserve existing buildTime format
          setVersionInfo({
            version: '1.0.0',
            commit: 'unknown',
            branch: 'unknown',
            buildTime: 'Unknown build time'
          });
        }
      }
    };

    fetchVersionInfo();
  }, []);

  if (!versionInfo) return null;

  return (
    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <span><strong>Version:</strong> {versionInfo.version}</span>
        <span><strong>Commit:</strong> {versionInfo.commit?.substring(0, 8) || 'unknown'}</span>
        <span><strong>Branch:</strong> {versionInfo.branch || 'unknown'}</span>
        <span><strong>Build:</strong> {versionInfo.buildTime || 'Unknown'}</span>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { gameData } = useContext(GameContext);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // Track which game is being deleted
  const [message, setMessage] = useState('');
  
  // Voice configuration state
  const [voiceConfig, setVoiceConfig] = useState({ maleVoice: '', femaleVoice: '' });
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // API base URL
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const [voiceConfigLoading, setVoiceConfigLoading] = useState(false);

  // Check if there's an active game (has teams and not submitted)
  const hasActiveGame = gameData && gameData.team1 && gameData.team2 && !gameData.submitted;

  useEffect(() => {
    fetchGames();
    fetchVoiceConfig();
    fetchAvailableVoices();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${apiBase}/api/games/submitted`);
      setGames(response.data.data || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching submitted games:', error);
      setLoading(false);
    }
  };

  const fetchVoiceConfig = async () => {
    try {
      const response = await axios.get(`${apiBase}/api/admin/voice-config`);
      if (response.data.success) {
        setVoiceConfig({
          maleVoice: response.data.config.maleVoice || 'en-US-Studio-Q',
          femaleVoice: response.data.config.femaleVoice || 'en-US-Studio-O'
        });
      }
    } catch (error) {
      console.error('Error fetching voice config:', error);
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      const response = await axios.get(`${apiBase}/api/admin/available-voices`);
      if (response.data.success) {
        setAvailableVoices(response.data.voices);
      }
    } catch (error) {
      console.error('Error fetching available voices:', error);
    }
  };

  const handleVoiceConfigSave = async () => {
    setVoiceConfigLoading(true);
    try {
      const response = await axios.post(`${apiBase}/api/admin/voice-config`, voiceConfig);
      if (response.data.success) {
        setMessage(`Voice configuration saved! Al: ${voiceConfig.maleVoice}, Linda: ${voiceConfig.femaleVoice}`);
      }
    } catch (error) {
      console.error('Error saving voice config:', error);
      setMessage(`Error saving voice configuration: ${error.response?.data?.error || error.message}`);
    } finally {
      setVoiceConfigLoading(false);
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
      const apiUrl = `${apiBase}/api/games/${gameId}/reset`;
      
      console.log(`AdminPanel: Making DELETE request to ${apiUrl}`);
      const response = await axios.delete(apiUrl);
      console.log(`AdminPanel: Delete response:`, response.data);
      
      if (response.data.success) {
        // Immediately remove the game from local state for instant UI feedback
        setGames(prevGames => prevGames.filter(g => g.id !== gameId));
        
        // Show the server's actual message instead of hardcoded text
        const serverMessage = response.data.message || 'Game deletion completed';
        setMessage(serverMessage);
        console.log('AdminPanel: Refreshing games list...');
        
        // Force immediate refresh from server to ensure consistency
        setTimeout(async () => {
          await fetchGames();
          console.log('AdminPanel: Games list refreshed from server');
        }, 500);
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
    if (hasActiveGame) {
      // Navigate back to the in-game menu if there's an active game
  navigate('/ingame');
    } else {
      // Navigate to main menu if no active game
      navigate('/');
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
              {hasActiveGame ? 'Back to Game' : 'Back to Main'}
            </button>
          </div>
          
          {/* Version Information */}
          <VersionInfo />
          
          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}
        </div>

        {/* Voice Configuration Section - Disabled for Static Version */}
        <div className="bg-gray-100 rounded-lg shadow-md p-6 mb-6 border-2 border-dashed border-gray-300">
          <h2 className="text-2xl font-bold mb-4 text-gray-500">Announcer Voice Configuration</h2>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔇</div>
            <p className="text-gray-600 mb-2">Text-to-Speech Announcer Disabled</p>
            <p className="text-sm text-gray-500">
              Voice announcements are not available in the static version.<br/>
              Audio files are played locally for game sounds and DJ controls.
            </p>
          </div>
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
