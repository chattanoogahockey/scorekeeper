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
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-3 rounded-lg shadow-md text-sm transition-all duration-200 flex items-center justify-center h-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open overtime or shootout result dialog"
        aria-describedby="ot-shootout-description"
      >
        <span>OT/Shootout</span>
      </button>
      <div id="ot-shootout-description" className="sr-only">
        Open dialog to record overtime or shootout game results
      </div>

      {/* OT/Shootout Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="presentation">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ot-dialog-title"
            aria-describedby="ot-dialog-description"
          >
            {/* Dialog Header */}
            <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 id="ot-dialog-title" className="text-xl font-bold text-center">OT/Shootout Result</h2>
              <p id="ot-dialog-description" className="text-blue-100 text-center mt-1">
                {homeTeam} vs {awayTeam}
              </p>
            </header>

            {/* Dialog Content */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              {/* Game Type Selection */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  Game Type
                </legend>
                <div className="flex gap-4" role="radiogroup" aria-labelledby="game-type-legend">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="shootout"
                      checked={gameType === 'shootout'}
                      onChange={(e) => setGameType(e.target.value)}
                      className="mr-2 focus:ring-blue-500"
                      aria-describedby="shootout-description"
                    />
                    <span className="text-gray-700">Shootout</span>
                  </label>
                  <div id="shootout-description" className="sr-only">
                    Select shootout for penalty shot competition
                  </div>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="overtime"
                      checked={gameType === 'overtime'}
                      onChange={(e) => setGameType(e.target.value)}
                      className="mr-2 focus:ring-blue-500"
                      aria-describedby="overtime-description"
                    />
                    <span className="text-gray-700">Overtime</span>
                  </label>
                  <div id="overtime-description" className="sr-only">
                    Select overtime for extended play period
                  </div>
                </div>
              </fieldset>

              {/* Winner Selection */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  Winner
                </legend>
                <div className="space-y-2" role="radiogroup" aria-labelledby="winner-legend">
                  <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <input
                      type="radio"
                      value={homeTeam}
                      checked={selectedWinner === homeTeam}
                      onChange={(e) => setSelectedWinner(e.target.value)}
                      className="mr-3 focus:ring-blue-500"
                      aria-describedby="home-team-description"
                    />
                    <span className="font-medium text-gray-900">{homeTeam}</span>
                  </label>
                  <div id="home-team-description" className="sr-only">
                    Select {homeTeam} as the winner of the game
                  </div>

                  <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <input
                      type="radio"
                      value={awayTeam}
                      checked={selectedWinner === awayTeam}
                      onChange={(e) => setSelectedWinner(e.target.value)}
                      className="mr-3 focus:ring-blue-500"
                      aria-describedby="away-team-description"
                    />
                    <span className="font-medium text-gray-900">{awayTeam}</span>
                  </label>
                  <div id="away-team-description" className="sr-only">
                    Select {awayTeam} as the winner of the game
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleCloseDialog}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Cancel and close the dialog"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOTShootout}
                disabled={isSubmitting || !selectedWinner}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={isSubmitting ? "Submitting game result" : "Submit result and complete the game"}
                aria-describedby="submit-description"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Complete Game'}
              </button>
              <div id="submit-description" className="sr-only">
                Submit the selected winner and game type to complete the game record
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OTShootoutButton;
