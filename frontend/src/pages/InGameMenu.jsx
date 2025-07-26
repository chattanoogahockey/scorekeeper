import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * In Game Menu - Mobile-friendly main menu for game operations
 */
export default function InGameMenu() {
  const { selectedGame } = useContext(GameContext);
  const navigate = useNavigate();

  if (!selectedGame) {
    // If no game selected, redirect back to home
    navigate('/');
    return null;
  }

  const handleGoalClick = () => {
    navigate('/goal');
  };

  const handlePenaltyClick = () => {
    navigate('/penalty');
  };

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Game In Progress
          </h1>
          <p className="text-lg text-gray-600">
            {selectedGame.awayTeam || selectedGame.awayTeamId} vs {selectedGame.homeTeam || selectedGame.homeTeamId}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(selectedGame.gameDate).toLocaleDateString()}
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-4 mb-6">
          <button
            onClick={handleGoalClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-6 rounded-lg shadow-lg text-xl transition-colors"
          >
            🥅 Record Goal
          </button>

          <button
            onClick={handlePenaltyClick}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-6 px-6 rounded-lg shadow-lg text-xl transition-colors"
          >
            ⚠️ Record Penalty
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="space-y-3">
          <button
            onClick={handleViewDashboard}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg shadow text-lg transition-colors"
          >
            📊 View Full Dashboard
          </button>
        </div>

        {/* Quick Info */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Quick Actions</h3>
          <p className="text-sm text-gray-600">
            • Tap <strong>Goal</strong> to record a goal scored
          </p>
          <p className="text-sm text-gray-600">
            • Tap <strong>Penalty</strong> to record a penalty
          </p>
          <p className="text-sm text-gray-600">
            • Use <strong>Dashboard</strong> for announcer controls, DJ panel, and live feed
          </p>
        </div>
      </div>
    </div>
  );
}
