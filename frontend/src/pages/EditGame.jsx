import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EditGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState(null);
  const [goals, setGoals] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [teams, setTeams] = useState([]); // Available teams for dropdowns
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state for editing game details
  const [editedGame, setEditedGame] = useState({
    homeTeam: '',
    awayTeam: '',
    gameDate: '',
    league: '',
    homeScore: 0,
    awayScore: 0
  });

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

  const fetchGameData = async () => {
    try {
      setLoading(true);
      
      // Fetch game details
      const gameResponse = await axios.get(`/api/games/${gameId}`);
      const gameData = gameResponse.data;
      setGame(gameData);
      
      // Set initial form state
      setEditedGame({
        homeTeam: gameData.homeTeam || '',
        awayTeam: gameData.awayTeam || '',
        gameDate: gameData.gameDate ? gameData.gameDate.split('T')[0] : '',
        league: gameData.league || '',
        homeScore: gameData.homeScore || 0,
        awayScore: gameData.awayScore || 0
      });

      // Fetch goals
      try {
        const goalsResponse = await axios.get(`/api/goals/game/${gameId}`);
        setGoals(goalsResponse.data || []);
      } catch (err) {
        console.log('No goals found for this game');
        setGoals([]);
      }

      // Fetch penalties
      try {
        const penaltiesResponse = await axios.get(`/api/penalties/game/${gameId}`);
        setPenalties(penaltiesResponse.data || []);
      } catch (err) {
        console.log('No penalties found for this game');
        setPenalties([]);
      }

      // Fetch teams for dropdowns (get all teams from rosters)
      try {
        const teamsResponse = await axios.get('/api/rosters');
        const allTeams = teamsResponse.data || [];
        
        // Get unique teams grouped by division
        const teamsByDivision = allTeams.reduce((acc, roster) => {
          if (!acc[roster.division]) {
            acc[roster.division] = new Set();
          }
          acc[roster.division].add(roster.teamName);
          return acc;
        }, {});
        
        // Convert to array format for easier use
        const formattedTeams = Object.keys(teamsByDivision).map(division => ({
          division,
          teams: Array.from(teamsByDivision[division]).sort()
        }));
        
        setTeams(formattedTeams);
      } catch (err) {
        console.log('Could not fetch teams for dropdowns');
        setTeams([]);
      }

    } catch (error) {
      console.error('Error fetching game data:', error);
      setError('Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedGame(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveGame = async () => {
    try {
      setSaving(true);
      setError('');
      
      const updateData = {
        ...editedGame,
        homeScore: parseInt(editedGame.homeScore) || 0,
        awayScore: parseInt(editedGame.awayScore) || 0
      };
      
      const response = await axios.put(`/api/games/${gameId}`, updateData);
      
      if (response.data.success) {
        setMessage('Game details updated successfully!');
        setGame(prev => ({ ...prev, ...updateData }));
      }
    } catch (error) {
      console.error('Error updating game:', error);
      setError('Failed to update game details');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      await axios.delete(`/api/goals/${goalId}`);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      setMessage('Goal deleted successfully!');
      
      // Recalculate scores
      const updatedGoals = goals.filter(goal => goal.id !== goalId);
      const homeScore = updatedGoals.filter(goal => goal.team === editedGame.homeTeam).length;
      const awayScore = updatedGoals.filter(goal => goal.team === editedGame.awayTeam).length;
      
      setEditedGame(prev => ({
        ...prev,
        homeScore,
        awayScore
      }));
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal');
    }
  };

  const handleDeletePenalty = async (penaltyId) => {
    if (!confirm('Are you sure you want to delete this penalty?')) return;
    
    try {
      await axios.delete(`/api/penalties/${penaltyId}`);
      setPenalties(prev => prev.filter(penalty => penalty.id !== penaltyId));
      setMessage('Penalty deleted successfully!');
    } catch (error) {
      console.error('Error deleting penalty:', error);
      setError('Failed to delete penalty');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game data...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">Game not found</p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Admin Panel
          </button>
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
            <h1 className="text-3xl font-bold text-gray-800">Edit Game</h1>
            <div className="space-x-2">
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Admin
              </button>
              <button
                onClick={handleSaveGame}
                disabled={saving}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Details Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Game Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Team
                </label>
                <select
                  value={editedGame.homeTeam}
                  onChange={(e) => handleInputChange('homeTeam', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Home Team</option>
                  {teams.map(divisionGroup => (
                    <optgroup key={divisionGroup.division} label={`${divisionGroup.division.toUpperCase()} DIVISION`}>
                      {divisionGroup.teams.map(teamName => (
                        <option key={teamName} value={teamName}>{teamName}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Away Team
                </label>
                <select
                  value={editedGame.awayTeam}
                  onChange={(e) => handleInputChange('awayTeam', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Away Team</option>
                  {teams.map(divisionGroup => (
                    <optgroup key={divisionGroup.division} label={`${divisionGroup.division.toUpperCase()} DIVISION`}>
                      {divisionGroup.teams.map(teamName => (
                        <option key={teamName} value={teamName}>{teamName}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  League
                </label>
                <input
                  type="text"
                  value={editedGame.league}
                  onChange={(e) => handleInputChange('league', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Game Date
                </label>
                <input
                  type="date"
                  value={editedGame.gameDate}
                  onChange={(e) => handleInputChange('gameDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editedGame.homeScore}
                    onChange={(e) => handleInputChange('homeScore', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Away Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editedGame.awayScore}
                    onChange={(e) => handleInputChange('awayScore', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Score Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Current Score</h2>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-800 mb-2">
                {editedGame.homeTeam || 'Home'} {editedGame.homeScore} - {editedGame.awayScore} {editedGame.awayTeam || 'Away'}
              </div>
              <p className="text-gray-600">
                {editedGame.league} League • {editedGame.gameDate ? new Date(editedGame.gameDate).toLocaleDateString() : 'No date set'}
              </p>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4">Goals ({goals.length})</h2>
          
          {goals.length === 0 ? (
            <p className="text-gray-500">No goals recorded for this game.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((goal, index) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <span className="font-semibold">Goal #{index + 1}</span>
                    <span className="ml-2 text-gray-600">by {goal.scoredBy} ({goal.team})</span>
                    {goal.assistedBy && <span className="ml-2 text-gray-500">• Assist: {goal.assistedBy}</span>}
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(goal.timeScored).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Penalties Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4">Penalties ({penalties.length})</h2>
          
          {penalties.length === 0 ? (
            <p className="text-gray-500">No penalties recorded for this game.</p>
          ) : (
            <div className="space-y-3">
              {penalties.map((penalty, index) => (
                <div key={penalty.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <span className="font-semibold">Penalty #{index + 1}</span>
                    <span className="ml-2 text-gray-600">{penalty.playerName} ({penalty.team})</span>
                    <span className="ml-2 text-orange-600">• {penalty.penaltyType}</span>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(penalty.timeRecorded).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePenalty(penalty.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
