import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * Penalty Recording Page - Mobile-friendly penalty entry form
 */
export default function PenaltyRecord() {
  const { selectedGame } = useContext(GameContext);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!selectedGame) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // TODO: Implement penalty recording logic
    
    setTimeout(() => {
      navigate('/ingame');
    }, 1000);
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
              <select className="w-full p-3 border border-gray-300 rounded-md text-lg">
                <option value="">{selectedGame.awayTeam || selectedGame.awayTeamId}</option>
                <option value="">{selectedGame.homeTeam || selectedGame.homeTeamId}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalized Player
              </label>
              <input
                type="text"
                placeholder="Player name"
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalty Type
              </label>
              <select className="w-full p-3 border border-gray-300 rounded-md text-lg">
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
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalty Length
              </label>
              <select className="w-full p-3 border border-gray-300 rounded-md text-lg">
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
              <select className="w-full p-3 border border-gray-300 rounded-md text-lg">
                <option value="1">1st Period</option>
                <option value="2">2nd Period</option>
                <option value="3">3rd Period</option>
                <option value="OT">Overtime</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="text"
                placeholder="MM:SS"
                className="w-full p-3 border border-gray-300 rounded-md text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg text-xl"
            >
              {submitting ? 'Recording...' : 'Record Penalty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
