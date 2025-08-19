import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * Goal Recording Page - Mobile-friendly goal entry form
 */
export default function GoalRecord() {
  const { selectedGame, rosters } = useContext(GameContext);
  const navigate = useNavigate();
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [currentScore, setCurrentScore] = useState({ away: 0, home: 0 });
  const [existingGoals, setExistingGoals] = useState([]);
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

  // Fetch existing goals to calculate current score
  useEffect(() => {
    const fetchExistingGoals = async () => {
      try {
        const apiUrl = import.meta.env.DEV 
          ? '/api/goals' 
          : `${import.meta.env.VITE_API_BASE_URL}/api/goals`;
        
        const response = await axios.get(apiUrl, {
          params: { gameId: selectedGame.id || selectedGame.gameId }
        });
        
        const goals = response.data || [];
        setExistingGoals(goals);
        
        // Calculate current score
        const awayScore = goals.filter(g => g.scoringTeam === selectedGame.awayTeam).length;
        const homeScore = goals.filter(g => g.scoringTeam === selectedGame.homeTeam).length;
        setCurrentScore({ away: awayScore, home: homeScore });
        
      } catch (error) {
        console.error('Error fetching existing goals:', error);
        // Set default score if fetch fails
        setCurrentScore({ away: 0, home: 0 });
      }
    };

    if (selectedGame) {
      fetchExistingGoals();
    }
  }, [selectedGame]);

  // Function to determine goal context for AI announcer
  const determineGoalContext = (scoringTeam) => {
    const awayTeam = selectedGame.awayTeam;
    const homeTeam = selectedGame.homeTeam;
    const isAwayTeamScoring = scoringTeam === awayTeam;
    
    // Calculate score after this goal
    const newAwayScore = currentScore.away + (isAwayTeamScoring ? 1 : 0);
    const newHomeScore = currentScore.home + (isAwayTeamScoring ? 0 : 1);
    
    // Total goals before this one
    const totalGoals = currentScore.away + currentScore.home;
    
    // First goal of the game
    if (totalGoals === 0) {
      return "First goal of game";
    }
    
    // Tying goal (score becomes tied)
    if (newAwayScore === newHomeScore) {
      return "Tying goal";
    }
    
    // Go-ahead goal (from tied to leading)
    if (currentScore.away === currentScore.home) {
      return "Go-ahead goal";
    }
    
    // Game-winning goal scenarios (extending lead significantly)
    const leadDifference = Math.abs(newAwayScore - newHomeScore);
    if (leadDifference >= 3) {
      return "Insurance goal";
    }
    
    // Comeback goal (reducing opponent's lead)
    const previousLead = Math.abs(currentScore.away - currentScore.home);
    const newLead = Math.abs(newAwayScore - newHomeScore);
    if (previousLead > newLead && previousLead >= 2) {
      return "Comeback goal";
    }
    
    // Power play goal or short-handed goal could be determined here with more context
    
    // Default case
    return leadDifference === 1 ? "Go-ahead goal" : "Goal";
  };

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
      // Get current digits without colon, preserving all digits
      currentDigits = currentTime.replace(/:/g, '');
      // Only remove leading zeros if we have more than just zeros
      if (currentDigits !== '0000' && currentDigits !== '000' && currentDigits !== '00' && currentDigits !== '0') {
        currentDigits = currentDigits.replace(/^0+/, '');
      } else {
        currentDigits = '';
      }
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
    
    // Defer strict validation until 4 digits entered so sequences like 1-6-0-0 work
    if (newDigits.length === 4) {
      // Enforce range: 00:01 to 17:00 inclusive
      if (minutes > 17) {
        console.log('Invalid time - minutes exceeds 17');
        return;
      }
      if (minutes === 17 && seconds !== 0) {
        console.log('Invalid time - beyond 17:00');
        return;
      }
      if (minutes === 0 && seconds === 0) {
        console.log('Invalid time - below 00:01');
        return;
      }
      if (seconds > 59) {
        console.log('Invalid time - seconds exceed 59');
        return;
      }
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
              console.log('🚀 GOAL SUBMIT BUTTON CLICKED');
              console.log('🎮 Selected Game:', selectedGame);
              console.log('📝 Form Data:', formData);
              console.log('✅ Form Complete:', isFormComplete);
              
              // Add extra safety checks
              if (!selectedGame) {
                console.error('❌ No game selected');
                alert('Error: No game selected. Please select a game first.');
                return;
              }
              
              if (!selectedGame.id && !selectedGame.gameId) {
                console.error('❌ Game has no ID:', selectedGame);
                alert('Error: Selected game has no ID');
                return;
              }
              
              if (!formData.team || !formData.player || !formData.period || !formData.time) {
                console.error('❌ Missing required form data:', formData);
                alert('Error: Please fill in all required fields');
                return;
              }
              
              console.log('📡 Starting goal submission...');
              
              try {
                // Send goal data to backend API
                // In development: uses proxy (/api/goals)
                // In production: uses full URL from environment variable
                const apiUrl = import.meta.env.DEV 
                  ? '/api/goals' 
                  : `${import.meta.env.VITE_API_BASE_URL}/api/goals`;
                  
                const goalContext = determineGoalContext(formData.team);
                
                const goalPayload = {
                  gameId: selectedGame.id || selectedGame.gameId,
                  team: formData.team,
                  player: formData.player,
                  period: formData.period,
                  time: formData.time,
                  assist: formData.assist || null,
                  shotType: formData.shotType,
                  goalType: formData.goalType,
                  breakaway: formData.breakaway,
                  // Enhanced data for AI announcer
                  gameContext: {
                    goalContext: goalContext,
                    scoreBeforeGoal: {
                      away: currentScore.away,
                      home: currentScore.home,
                      awayTeam: selectedGame.awayTeam,
                      homeTeam: selectedGame.homeTeam
                    },
                    scoreAfterGoal: {
                      away: currentScore.away + (formData.team === selectedGame.awayTeam ? 1 : 0),
                      home: currentScore.home + (formData.team === selectedGame.homeTeam ? 1 : 0),
                      awayTeam: selectedGame.awayTeam,
                      homeTeam: selectedGame.homeTeam
                    },
                    totalGoalsInGame: existingGoals.length + 1,
                    period: formData.period,
                    timeInPeriod: formData.time
                  }
                };
                
                console.log('📦 Goal Payload:', JSON.stringify(goalPayload, null, 2));
                console.log('🔗 Submitting to:', apiUrl);
                console.log('🌍 Environment mode:', import.meta.env.DEV ? 'Development' : 'Production');
                
                const response = await axios.post(apiUrl, goalPayload);

                console.log('✅ SUCCESS! Response:', response.data);

                // Create user-friendly goal summary using the response data
                const assistText = formData.assist ? ` (assist: ${formData.assist})` : '';
                const goalSummary = `Goal Recorded!

${selectedGame.awayTeam} vs ${selectedGame.homeTeam}
${formData.player} scored for ${formData.team}${assistText}
Time: ${formData.time} - Period ${formData.period}
Shot Type: ${formData.shotType}`;

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

                // Automatically navigate back to in-game menu
                navigate('/ingame');

              } catch (error) {
                console.error('❌ Failed to record goal:', error);
                console.error('Error details:', {
                  message: error.message,
                  response: error.response?.data,
                  status: error.response?.status
                });
                alert(`Error recording goal: ${error.response?.data?.error || error.message}`);
              }
            }}
          >
            Record Goal
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/ingame')}
          className="w-full mt-3 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white py-2 rounded-lg font-medium transition-colors text-sm"
        >
          Back to In Game Menu
        </button>
      </div>
    </div>
  );
}
