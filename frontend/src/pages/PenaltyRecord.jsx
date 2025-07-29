import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * Penalty Recording Page - Mobile-friendly penalty entry form
 */
export default function PenaltyRecord() {
  const { selectedGame, rosters } = useContext(GameContext);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [formData, setFormData] = useState({
    team: '',
    player: '',
    penaltyType: '',
    penaltyLength: '2',
    period: '1',
    time: '',
    details: ''
  });

  if (!selectedGame) {
    navigate('/');
    return null;
  }

  // Initialize with first team (away team) by default
  useEffect(() => {
    if (selectedGame && !formData.team) {
      const defaultTeam = selectedGame.awayTeam;
      setFormData(prev => ({ ...prev, team: defaultTeam }));
    }
  }, [selectedGame, formData.team]);

  // Update available players when team is selected
  useEffect(() => {
    console.log('Team changed:', formData.team);
    console.log('Available rosters:', rosters);
    
    if (formData.team && rosters) {
      const teamRoster = rosters.find(roster => roster.teamName === formData.team);
      console.log('Found team roster:', teamRoster);
      
      if (teamRoster && teamRoster.players) {
        setAvailablePlayers(teamRoster.players);
        console.log('Set available players:', teamRoster.players);
      } else {
        setAvailablePlayers([]);
        console.log('No players found for team');
      }
    }
  }, [formData.team, rosters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // In development: uses proxy (/api/penalties)
      // In production: uses full URL from environment variable
      const apiUrl = import.meta.env.DEV 
        ? '/api/penalties' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/penalties`;
        
      const penaltyPayload = {
        gameId: selectedGame.id || selectedGame.gameId,
        team: formData.team,
        player: formData.player,
        period: formData.period,
        time: formData.time,
        penaltyType: formData.penaltyType,
        penaltyLength: formData.penaltyLength,
        details: { description: formData.details }
      };

      console.log('📦 Penalty Payload:', JSON.stringify(penaltyPayload, null, 2));
      console.log('🔗 Submitting to:', apiUrl);
      console.log('🌍 Environment mode:', import.meta.env.DEV ? 'Development' : 'Production');
      
      const response = await axios.post(apiUrl, penaltyPayload);

      console.log('✅ SUCCESS! Response:', response.data);

      // Create user-friendly penalty summary
      const penaltySummary = `Penalty Recorded!

${selectedGame.awayTeam} vs ${selectedGame.homeTeam}
${formData.player} (${formData.team}) - ${formData.penaltyType}
Time: ${formData.time} - Period ${formData.period}
Length: ${formData.penaltyLength} minutes`;

      alert(penaltySummary);

      // Reset form after successful submission
      setFormData({
        team: selectedGame.awayTeam, // Keep default team selected
        player: '',
        penaltyType: '',
        penaltyLength: '2',
        period: '1',
        time: '',
        details: ''
      });

    } catch (error) {
      console.error('❌ Failed to record penalty:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Error recording penalty: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <button
            onClick={() => navigate('/ingame')}
            className="text-blue-600 mb-2 flex items-center"
          >
            ← Back to Menu
          </button>
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            ⚠️ Record Penalty
          </h1>
        </div>

        {/* Penalty Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalized Team
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, team: selectedGame.awayTeam, player: '' }))}
                  className={`py-3 px-3 border-2 rounded-lg font-medium transition-colors ${
                    formData.team === selectedGame.awayTeam
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                  style={{ fontSize: '14px' }}
                >
                  {selectedGame.awayTeam}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, team: selectedGame.homeTeam, player: '' }))}
                  className={`py-3 px-3 border-2 rounded-lg font-medium transition-colors ${
                    formData.team === selectedGame.homeTeam
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                  style={{ fontSize: '14px' }}
                >
                  {selectedGame.homeTeam}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalized Player
              </label>
              <select
                value={formData.player}
                onChange={(e) => setFormData(prev => ({ ...prev, player: e.target.value }))}
                disabled={!formData.team || availablePlayers.length === 0}
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
                required
              >
                <option value="">
                  {!formData.team 
                    ? 'Select team first' 
                    : availablePlayers.length === 0 
                      ? 'Loading...' 
                      : 'Choose player'
                  }
                </option>
                {availablePlayers.map((player) => (
                  <option key={player.playerId} value={player.name}>
                    {player.number ? `#${player.number} ` : ''}{player.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalty Type
              </label>
              <select 
                value={formData.penaltyType}
                onChange={(e) => setFormData(prev => ({ ...prev, penaltyType: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
                required
              >
                <option value="">Select penalty...</option>
                <option value="Tripping">Tripping</option>
                <option value="Slashing">Slashing</option>
                <option value="High-sticking">High-sticking</option>
                <option value="Cross-checking">Cross-checking</option>
                <option value="Interference">Interference</option>
                <option value="Roughing">Roughing</option>
                <option value="Boarding">Boarding</option>
                <option value="Checking from behind">Checking from behind</option>
                <option value="Unsportsmanlike conduct">Unsportsmanlike conduct</option>
                <option value="Delay of game">Delay of game</option>
                <option value="Too many men">Too many men</option>
                <option value="Fighting">Fighting</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalty Length
              </label>
              <select 
                value={formData.penaltyLength}
                onChange={(e) => setFormData(prev => ({ ...prev, penaltyLength: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
                required
              >
                <option value="2">2 minutes</option>
                <option value="4">4 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="game">Game misconduct</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select 
                value={formData.period}
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
                required
              >
                <option value="1">1st Period</option>
                <option value="2">2nd Period</option>
                <option value="3">3rd Period</option>
                <option value="OT">Overtime</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time (MM:SS)
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                placeholder="10:30"
                pattern="[0-9]{1,2}:[0-9]{2}"
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                placeholder="Additional description of the penalty..."
                className="w-full p-3 border border-gray-300 rounded-md text-lg h-20 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !formData.team || !formData.player || !formData.penaltyType || !formData.time}
              className={`w-full font-bold py-4 px-6 rounded-lg text-xl transition-colors ${
                (submitting || !formData.team || !formData.player || !formData.penaltyType || !formData.time)
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {submitting ? 'Recording...' : 'Record Penalty'}
            </button>
          </div>
        </form>

        {/* Back Button */}
        <button
          onClick={() => navigate('/ingame')}
          className="w-full mt-3 bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
        >
          Back to In Game Menu
        </button>
      </div>
    </div>
  );
}
