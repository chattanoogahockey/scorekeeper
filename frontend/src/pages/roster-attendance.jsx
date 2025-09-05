import React, { useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/game-context.jsx';

/**
 * Roster attendance page allows the scorekeeper to record which players
 * are present for each team. Once submitted, this will capture all attendance
 * data and calculate games played statistics.
 */
export default function RosterAttendance() {
  const {
    selectedGame,
    rosters,
    setAttendance,
  } = useContext(GameContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // API base URL
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  if (!selectedGame) {
    // If no game selected, redirect back to home
    navigate('/');
    return null;
  }

  if (!rosters || rosters.length === 0) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Loading Rosters...
        </h2>
        <p className="text-gray-600 text-center mb-4">
          Loading player rosters for {selectedGame.awayteam || selectedGame.awayTeamId} vs {selectedGame.hometeam || selectedGame.homeTeamId}
        </p>
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white rounded transition-colors"
          >
            Back to Game Selection
          </button>
        </div>
      </div>
    );
  }

  // Handler for submitting attendance for all teams
  const handleSubmitAllAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      console.log('🔍 Starting attendance submission...');
      const attendanceData = {};
      
      // Collect attendance for each team
      for (const teamRoster of rosters) {
        const teamName = teamRoster.teamName;
        const checkedInputs = document.querySelectorAll(
          `input[name="attendance-${teamName}"]:checked`
        );
        const playersPresent = Array.from(checkedInputs).map((input) => input.value);
        attendanceData[teamName] = playersPresent;
        console.log(`📋 ${teamName}: ${playersPresent.length} players present:`, playersPresent);
      }

      const submitData = {
        gameId: selectedGame.gameId || selectedGame.id || `game-${Date.now()}`,
        attendance: attendanceData,
        totalRoster: rosters.map(team => ({
          teamName: team.teamName,
          teamId: team.teamId,
          totalPlayers: team.players.map(p => p.name)
        }))
      };
      
      console.log('📤 Submitting attendance data:', submitData);
      console.log('🎯 Selected game object:', selectedGame);

      // In development: uses proxy (/api/attendance)
      // In production: uses full URL from environment variable
      const apiUrl = `${apiBase}/api/attendance`;

      console.log('🔗 Submitting to:', apiUrl);
      console.log('🌍 Environment mode:', import.meta.env.DEV ? 'Development' : 'Production');

      // Submit attendance for all teams in one call
      const response = await axios.post(apiUrl, submitData);
      
      console.log('✅ Attendance submission successful:', response.data);
      setAttendance(attendanceData);
      setSubmitted(true);
      
      // Navigate to in-game menu after short delay
      setTimeout(() => {
        navigate('/ingame', { replace: true });
      }, 600);
      
    } catch (err) {
      console.error('❌ Failed to submit attendance:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(`Failed to submit attendance. Please try again. Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Who is here for today's game?
      </h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      
      <form onSubmit={handleSubmitAllAttendance} className="space-y-8 max-w-3xl mx-auto">
        {rosters.map((teamRoster) => {
          const teamName = teamRoster.teamName;
          return (
            <div key={teamName} className="border rounded shadow p-4">
              <h3 className="text-xl font-semibold mb-2">{teamName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {teamRoster.players.map((player) => {
                  const isSub = player.position === 'Sub' || player.name === 'Sub';
                  const isDisabled = submitted;
                  return (
                    <label key={player.name} className="flex items-center space-x-2 p-2 rounded">
                      <input
                        type="checkbox"
                        name={`attendance-${teamName}`}
                        value={player.name}
                        defaultChecked={isSub ? false : true}
                        disabled={isDisabled}
                        className="h-4 w-4"
                      />
                      <span>
                        {isSub ? 'Sub' : player.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        <div className="text-center">
          <button
            type="submit"
            disabled={submitted || submitting}
            className={`px-8 py-3 rounded text-white text-lg ${
              submitted 
                ? 'bg-green-600 cursor-not-allowed' 
                : submitting
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitted 
              ? '✓ Attendance Recorded' 
              : submitting 
              ? 'Recording Attendance...' 
              : 'Record Attendance'
            }
          </button>
        </div>
      </form>
      
      {submitted && (
        <div className="mt-4 text-center">
          <p className="text-green-600 font-semibold">
            Attendance recorded! Loading game menu...
          </p>
        </div>
      )}
    </div>
  );
}