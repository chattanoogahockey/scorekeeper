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
    time: '00:00',     // NEW default time
    details: ''
  });

  // Check if form is complete (like GoalRecord.jsx)
  const isFormComplete = formData.team && formData.player && formData.penaltyType && formData.penaltyLength && formData.period && formData.time && formData.time !== '00:00';

  // Handle time button press (copy from GoalRecord.jsx)
  const handleTimeButtonPress = (digit) => {
    const currentTime = formData.time || '00:00';
    let currentDigits = currentTime === '00:00'
      ? ''
      : currentTime.replace(/:/g, '').replace(/^0+/, '');
    if (currentDigits.length >= 4) return;
    const newDigits = currentDigits + digit;
    let formatted;
    if (newDigits.length === 1) formatted = `00:0${newDigits}`;
    else if (newDigits.length === 2) formatted = `00:${newDigits}`;
    else if (newDigits.length === 3) formatted = `0${newDigits.charAt(0)}:${newDigits.slice(1)}`;
    else formatted = `${newDigits.slice(0,2)}:${newDigits.slice(2)}`;
    const [mins, secs] = formatted.split(':').map(Number);
    if (mins > 20 || secs > 59) return;
    setFormData(prev => ({ ...prev, time: formatted }));
  };

  const clearTime = () => setFormData(prev => ({ ...prev, time: '00:00' }));

  const backspaceTime = () => {
    const current = formData.time || '00:00';
    if (current === '00:00') return;
    let digits = current.replace(/:/g, '').replace(/^0+/, '');
    if (digits.length <= 1) {
      setFormData(prev => ({ ...prev, time: '00:00' }));
      return;
    }
    digits = digits.slice(0, -1);
    let formatted;
    if (digits.length === 1) formatted = `00:0${digits}`;
    else if (digits.length === 2) formatted = `00:${digits}`;
    else formatted = `0${digits.charAt(0)}:${digits.slice(1)}`;
    setFormData(prev => ({ ...prev, time: formatted }));
  };

  // Define penalty types and lengths for button selectors
  const penaltyTypes = [
    'Tripping','Slashing','High-sticking','Cross-checking','Interference',
    'Roughing','Boarding','Checking from behind','Unsportsmanlike conduct','Delay of game'
  ];
  const penaltyLengths = ['2','4','5','10','20'];

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
      console.log('🔧 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
      
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
        time: '00:00',
        details: ''
      });

      // Navigate back to in-game menu after short delay
      setTimeout(() => {
        navigate('/ingame');
      }, 1000);

    } catch (error) {
      console.error('❌ ERROR submitting penalty:', error);
      
      // Enhanced error handling with specific messages from backend
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `\n\nDetails: ${error.response.data.details}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('🔗 Failed URL:', apiUrl);
      console.log('📱 Status:', error.response?.status);
      console.log('💬 Backend response:', error.response?.data);
      
      alert(`Failed to record penalty:\n\n${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            ⚠️ Record Penalty
          </h1>
        </div>

        {/* Penalty Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            {/* Period - Moved to top */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <div className="flex space-x-2">
                {[1,2,3].map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, period: period.toString() }))}
                    className={`py-2 px-4 border-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.period === period.toString() 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

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
              <div className="grid grid-cols-2 gap-2">
                {penaltyTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, penaltyType: type }))}
                    className={`py-2 px-2 border-2 rounded-lg text-xs font-medium transition-colors ${
                      formData.penaltyType === type 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalty Length (minutes)
              </label>
              <div className="flex space-x-2">
                {penaltyLengths.map(len => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, penaltyLength: len }))}
                    className={`py-2 px-4 border-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.penaltyLength === len 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Time in Period - Display above number pad like goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time in Period
              </label>
              {/* Display current time */}
              <div className="text-center text-3xl font-bold text-blue-600 bg-blue-50 py-4 rounded-lg border-2 border-blue-200 mb-4">
                {formData.time}
              </div>
              {/* Smaller Time Entry Number Pad */}
              <div className="grid grid-cols-3 gap-1 text-center">
                {[1,2,3,4,5,6,7,8,9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleTimeButtonPress(num.toString())}
                    className="py-2 bg-gray-100 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  type="button"
                  onClick={() => clearTime()} 
                  className="py-2 bg-red-100 rounded-lg font-semibold text-red-700 hover:bg-red-200 transition-colors text-sm"
                >
                  CLR
                </button>
                <button 
                  type="button"
                  onClick={() => handleTimeButtonPress('0')} 
                  className="py-2 bg-gray-100 rounded-lg font-semibold hover:bg-blue-200 transition-colors text-sm"
                >
                  0
                </button>
                <button 
                  type="button"
                  onClick={() => backspaceTime()} 
                  className="py-2 bg-yellow-100 rounded-lg font-semibold text-yellow-700 hover:bg-yellow-200 transition-colors text-sm"
                >
                  ←
                </button>
              </div>
            </div>

            {/* Green submit button when form is complete */}
            <button
              type="submit"
              disabled={!isFormComplete || submitting}
              className={`w-full font-bold py-4 px-6 rounded-lg text-xl transition-colors ${
                (!isFormComplete || submitting)
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
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
