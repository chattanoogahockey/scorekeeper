import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * Goal Recording Page - Mobile-friendly goal entry form
 */
export default function GoalRecord() {
  const { selectedGame, rosters } = useContext(GameContext);
  const navigate = useNavigate();
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [formData, setFormData] = useState({
    team: '',
    player: '',
    assist: '',
    period: '1', // Default to period 1
    time: '',
    shotType: 'Wrist Shot',
    goalType: 'Regular',
    breakaway: false
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

  // Handle team selection
  const handleTeamSelect = (teamName) => {
    console.log('Team button clicked:', teamName);
    setFormData(prev => {
      const newData = { ...prev, team: teamName, player: '', assist: '' };
      console.log('New form data:', newData);
      return newData;
    });
  };

  // Handle period selection
  const handlePeriodSelect = (period) => {
    console.log('Period button clicked:', period);
    setFormData(prev => {
      const newData = { ...prev, period };
      console.log('New form data:', newData);
      return newData;
    });
  };

  // Handle time input from number pad
  const handleTimeButtonPress = (digit) => {
    console.log('Time button pressed:', digit, 'Current time:', formData.time);
    
    // Start fresh if we're at 00:00 (cleared state)
    const currentTime = formData.time || '00:00';
    let currentDigits = '';
    
    if (currentTime === '00:00') {
      // Starting fresh
      currentDigits = '';
    } else {
      // Get current digits without colon and remove leading zeros
      currentDigits = currentTime.replace(/:/g, '').replace(/^0+/, '') || '';
    }
    
    console.log('Current digits (processed):', currentDigits, 'Length:', currentDigits.length);
    
    // Only allow up to 4 digits
    if (currentDigits.length >= 4) {
      console.log('Max digits reached');
      return;
    }
    
    // Add the new digit
    const newDigits = currentDigits + digit;
    console.log('New digits string:', newDigits);
    
    // Format based on length for display
    let formattedTime = '';
    if (newDigits.length === 1) {
      formattedTime = `00:0${newDigits}`;
    } else if (newDigits.length === 2) {
      formattedTime = `00:${newDigits}`;
    } else if (newDigits.length === 3) {
      // First digit becomes minutes, last two become seconds
      const mins = newDigits.charAt(0);
      const secs = newDigits.substring(1);
      formattedTime = `0${mins}:${secs}`;
    } else if (newDigits.length === 4) {
      // First two digits become minutes, last two become seconds
      const mins = newDigits.substring(0, 2);
      const secs = newDigits.substring(2);
      formattedTime = `${mins}:${secs}`;
    }
    
    console.log('Formatted time:', formattedTime);
    
    // Extract minutes and seconds for validation
    const [minutes, seconds] = formattedTime.split(':').map(Number);
    
    // Validate the time (no more than 20:00, no more than 59 seconds)
    if (minutes > 20 || seconds > 59) {
      console.log('Invalid time - minutes:', minutes, 'seconds:', seconds);
      return;
    }
    
    console.log('Setting time to:', formattedTime);
    setFormData(prev => ({ ...prev, time: formattedTime }));
  };

  // Clear time
  const clearTime = () => {
    console.log('Clearing time');
    setFormData(prev => ({ ...prev, time: '00:00' }));
  };

  // Backspace
  const backspaceTime = () => {
    console.log('Backspace time, current:', formData.time);
    
    const currentTime = formData.time || '00:00';
    
    // If we're at cleared state, do nothing
    if (currentTime === '00:00') {
      return;
    }
    
    // Get current digits without colon and remove leading zeros
    let currentDigits = currentTime.replace(/:/g, '').replace(/^0+/, '') || '';
    
    if (currentDigits.length <= 1) {
      // If only one digit or less, go back to cleared state
      setFormData(prev => ({ ...prev, time: '00:00' }));
      return;
    }
    
    // Remove the last digit
    const newDigits = currentDigits.slice(0, -1);
    console.log('New digits after backspace:', newDigits);
    
    // Format the remaining digits
    let formattedTime = '';
    if (newDigits.length === 1) {
      formattedTime = `00:0${newDigits}`;
    } else if (newDigits.length === 2) {
      formattedTime = `00:${newDigits}`;
    } else if (newDigits.length === 3) {
      const mins = newDigits.charAt(0);
      const secs = newDigits.substring(1);
      formattedTime = `0${mins}:${secs}`;
    }
    
    console.log('Formatted time after backspace:', formattedTime);
    setFormData(prev => ({ ...prev, time: formattedTime }));
  };

  // Check if form is complete
  const isFormComplete = formData.team && formData.player && formData.period && formData.time && formData.time !== '00:00' && formData.time !== '';

  // Calculate goal context data (this would normally come from backend)
  const calculateGoalData = () => {
    // For now, we'll use placeholder values since we don't have access to current game state
    // The backend will calculate these properly when we submit
    const scoringTeamGoalsFor = 1; // Will be calculated by backend
    const scoringTeamGoalsAgainst = 0; // Will be calculated by backend
    const scorerGoalsInGame = 1; // Will be calculated by backend
    
    // Calculate goal description based on hypothetical score
    let goalDescription = "Goal";
    const totalGoals = scoringTeamGoalsFor + scoringTeamGoalsAgainst;
    
    if (totalGoals === 1) {
      goalDescription = "First goal of the game";
    } else if (scoringTeamGoalsFor === scoringTeamGoalsAgainst) {
      goalDescription = "Tying goal";
    } else if (scoringTeamGoalsFor > scoringTeamGoalsAgainst) {
      goalDescription = "Go-ahead goal";
    } else {
      goalDescription = "Goal";
    }
    
    // Build complete goal data matching Cosmos DB structure
    return {
      // Basic form data
      gameId: selectedGame.gameId,
      period: parseInt(formData.period),
      scoringTeamId: formData.team,
      scorerId: formData.player,
      assistId: formData.assist || null,
      goalTime: formData.time,
      shotType: formData.shotType,
      goalType: formData.goalType,
      breakaway: formData.breakaway,
      
      // Calculated data (backend will recalculate these)
      scoringTeamGoalsFor,
      scoringTeamGoalsAgainst,
      goalDescription,
      scorerGoalsInGame,
      
      // Metadata
      timestampRecorded: new Date().toISOString(),
      timestampOccurred: new Date().toISOString(), // Approximate, could be adjusted
      enteredBy: "scorekeeper-app",
      status: "pending" // Will be finalized later
    };
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Record Goal</h1>
          <p className="text-blue-700">
            {selectedGame.homeTeam} vs {selectedGame.awayTeam}
          </p>
        </div>

        {/* Goal Recording Form */}
        <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
          {/* Team Selection & Period */}
          <div className="grid grid-cols-4 gap-2">
            {/* Team Selection - Takes 3 columns */}
            <div className="col-span-3">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Select Team
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleTeamSelect(selectedGame.awayTeam)}
                  className={`py-2 px-2 border-2 rounded-lg font-medium transition-colors ${
                    formData.team === selectedGame.awayTeam
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                  style={{ fontSize: '8px' }}
                >
                  {selectedGame.awayTeam}
                </button>
                <button
                  type="button"
                  onClick={() => handleTeamSelect(selectedGame.homeTeam)}
                  className={`py-2 px-2 border-2 rounded-lg font-medium transition-colors ${
                    formData.team === selectedGame.homeTeam
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                  style={{ fontSize: '8px' }}
                >
                  {selectedGame.homeTeam}
                </button>
              </div>
            </div>

            {/* Period Selection - Takes 1 column */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Period
              </label>
              <div className="grid grid-cols-3 gap-1">
                {['1', '2', '3'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handlePeriodSelect(period)}
                    className={`py-1 px-1 border-2 rounded-lg font-medium transition-colors text-xs ${
                      formData.period === period
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Goal Scorer & Assist */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Goal Scorer
              </label>
              <select
                value={formData.player}
                onChange={(e) => {
                  console.log('Player selected:', e.target.value);
                  setFormData(prev => ({ ...prev, player: e.target.value, assist: '' }));
                }}
                disabled={!formData.team || availablePlayers.length === 0}
                className="w-full py-2 px-2 border border-gray-300 rounded-lg text-xs"
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
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Assist
              </label>
              <select
                value={formData.assist}
                onChange={(e) => {
                  console.log('Assist selected:', e.target.value);
                  setFormData(prev => ({ ...prev, assist: e.target.value }));
                }}
                disabled={!formData.team || availablePlayers.length === 0}
                className="w-full py-2 px-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="">No assist</option>
                {availablePlayers
                  .filter(player => player.name !== formData.player)
                  .map((player) => (
                    <option key={player.playerId} value={player.name}>
                      {player.number ? `#${player.number} ` : ''}{player.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Shot Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Shot Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Wrist Shot', 'Slap Shot', 'Snap Shot', 'Backhand'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    console.log('Shot type selected:', type);
                    setFormData(prev => ({ ...prev, shotType: type }));
                  }}
                  className={`py-2 px-2 border-2 rounded-lg font-medium transition-colors text-xs ${
                    formData.shotType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Goal Type
            </label>
            <div className="grid grid-cols-3 gap-1">
              {['Regular', 'Power Play', 'Short Handed'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    console.log('Goal type selected:', type);
                    setFormData(prev => ({ ...prev, goalType: type }));
                  }}
                  className={`py-1 px-1 border-2 rounded-lg font-medium transition-colors text-xs ${
                    formData.goalType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {type === 'Power Play' ? 'PP' : type === 'Short Handed' ? 'SH' : type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {['Penalty Shot', 'Empty Net'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    console.log('Goal type selected:', type);
                    setFormData(prev => ({ ...prev, goalType: type }));
                  }}
                  className={`py-1 px-1 border-2 rounded-lg font-medium transition-colors text-xs ${
                    formData.goalType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {type === 'Penalty Shot' ? 'Pen Shot' : 'Empty Net'}
                </button>
              ))}
            </div>
          </div>

          {/* Breakaway */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Breakaway
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  console.log('Breakaway selected: false');
                  setFormData(prev => ({ ...prev, breakaway: false }));
                }}
                className={`py-1 px-2 border-2 rounded-lg font-medium transition-colors text-xs ${
                  !formData.breakaway
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Breakaway selected: true');
                  setFormData(prev => ({ ...prev, breakaway: true }));
                }}
                className={`py-1 px-2 border-2 rounded-lg font-medium transition-colors text-xs ${
                  formData.breakaway
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {/* Time Input with Number Pad */}
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-2">
              Time
            </label>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-blue-600 mb-3 p-3 bg-blue-50 border-2 border-blue-500 rounded-lg">
                {formData.time || '00:00'}
              </div>
              
              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleTimeButtonPress(digit)}
                    className="py-3 px-4 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg font-bold text-lg hover:bg-blue-100 transition-colors"
                  >
                    {digit}
                  </button>
                ))}
              </div>
              
              {/* Bottom Row: Clear, 0, Backspace */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={clearTime}
                  className="py-2 px-3 border-2 border-red-500 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeButtonPress('0')}
                  className="py-3 px-4 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg font-bold text-lg hover:bg-blue-100 transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={backspaceTime}
                  className="py-2 px-3 border-2 border-gray-500 bg-gray-50 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={!isFormComplete}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
              isFormComplete
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
            onClick={async () => {
              const goalData = calculateGoalData();
              console.log('Goal Data for Cosmos DB:', goalData);
              
              try {
                // Send goal data to backend API
                const response = await fetch('http://localhost:3001/api/goals', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    gameId: selectedGame.gameId,
                    team: formData.team,
                    player: formData.player,
                    period: formData.period,
                    time: formData.time,
                    assist: formData.assist || null,
                    shotType: formData.shotType,
                    goalType: formData.goalType,
                    breakaway: formData.breakaway,
                    goalDescription: goalData.goalDescription
                  }),
                });

                if (!response.ok) {
                  throw new Error(`Failed to record goal: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Goal recorded successfully:', result);

                // Create user-friendly goal summary using the response data
                const assistText = formData.assist ? ` (assist: ${formData.assist})` : '';
                const goalSummary = `Goal Recorded!

${selectedGame.awayTeam} vs ${selectedGame.homeTeam}
Current Score: ${result.event.scoringTeamGoalsAgainst} - ${result.event.scoringTeamGoalsFor}

${formData.player} scored for ${formData.team}${assistText}
Goals in game: ${result.event.scorerGoalsInGame}
Time: ${formData.time} - Period ${formData.period}`;

                alert(goalSummary);

                // Reset form after successful submission
                setFormData({
                  team: selectedGame.awayTeam, // Keep default team selected
                  player: '',
                  assist: '',
                  period: '1',
                  time: '00:00',
                  shotType: 'Wrist Shot',
                  goalType: 'Regular',
                  breakaway: false
                });

              } catch (error) {
                console.error('Error recording goal:', error);
                alert(`Error recording goal: ${error.message}`);
              }
            }}
          >
            Record Goal
          </button>
        </div>

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
