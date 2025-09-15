import React, { useState } from 'react';
import staticDataService from '../services/staticDataService.js';
import { useGameContext } from '../contexts/game-context.jsx';

const OTShootoutButton = ({ onGameCompleted }) => {
  const { selectedGameId, homeTeam, awayTeam } = useGameContext();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [gameType, setGameType] = useState('shootout');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenDialog = () => {
    if (!selectedGameId) {
      alert('Please select a game first');
      return;
    }
    setShowDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedWinner('');
    setGameType('shootout');
    setError('');
  };

  const handleSubmitOTShootout = async () => {
    if (!selectedWinner) {
      setError('Please select a winner');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        gameId: selectedGameId,
        winner: selectedWinner,
        gameType,
        submittedBy: 'Scorekeeper'
      };

      // Save to local storage instead of API call
      const gameData = staticDataService.getGameData(selectedGameId);
      if (gameData) {
        const updatedGameData = {
          ...gameData,
          otShootoutResult: {
            winner: selectedWinner,
            gameType,
            submittedBy: 'Scorekeeper',
            submittedAt: new Date().toISOString()
          },
          status: 'completed'
        };
        staticDataService.saveGameData(selectedGameId, updatedGameData);
      }

      alert(`${gameType === 'overtime' ? 'Overtime' : 'Shootout'} winner recorded! Game completed and saved locally.`);
      handleCloseDialog();

      // Notify parent component that game is completed
      if (onGameCompleted) {
        onGameCompleted(selectedGameId);
      }
    } catch (error) {
      console.error('Error saving OT/Shootout:', error);
      setError('Failed to save OT/Shootout result locally');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedGameId) {
    return null;
  }

  return (
    <>
      {/* OT/Shootout Button */}
      <button
        onClick={handleOpenDialog}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center h-full"
      >
        <span>OT/Shootout</span>
      </button>

      {/* OT/Shootout Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Dialog Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-xl font-bold text-center">OT/Shootout Result</h2>
              <p className="text-blue-100 text-center mt-1">
                {homeTeam} vs {awayTeam}
              </p>
            </div>

            {/* Dialog Content */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Game Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="shootout"
                      checked={gameType === 'shootout'}
                      onChange={(e) => setGameType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Shootout</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="overtime"
                      checked={gameType === 'overtime'}
                      onChange={(e) => setGameType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Overtime</span>
                  </label>
                </div>
              </div>

              {/* Winner Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Winner
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value={homeTeam}
                      checked={selectedWinner === homeTeam}
                      onChange={(e) => setSelectedWinner(e.target.value)}
                      className="mr-3"
                    />
                    <span className="font-medium text-gray-900">{homeTeam}</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value={awayTeam}
                      checked={selectedWinner === awayTeam}
                      onChange={(e) => setSelectedWinner(e.target.value)}
                      className="mr-3"
                    />
                    <span className="font-medium text-gray-900">{awayTeam}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleCloseDialog}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOTShootout}
                disabled={isSubmitting || !selectedWinner}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Complete Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OTShootoutButton;
