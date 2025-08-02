import React, { useState } from 'react';
import axios from 'axios';
import { useGameContext } from '../contexts/GameContext';

const OTShootoutButton = ({ onGameCompleted }) => {
  const { selectedGameId, homeTeam, awayTeam } = useGameContext();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [gameType, setGameType] = useState('overtime');
  const [finalScore, setFinalScore] = useState({ home: '', away: '' });
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
    setGameType('overtime');
    setFinalScore({ home: '', away: '' });
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
        finalScore: {
          home: parseInt(finalScore.home) || 0,
          away: parseInt(finalScore.away) || 0,
          homeTeam,
          awayTeam
        },
        submittedBy: 'Scorekeeper'
      };

      const response = await axios.post('/api/otshootout', payload);
      
      if (response.data.success) {
        alert(`${gameType === 'overtime' ? 'Overtime' : 'Shootout'} winner recorded! Game completed and submitted automatically.`);
        handleCloseDialog();
        
        // Notify parent component that game is completed
        if (onGameCompleted) {
          onGameCompleted(selectedGameId);
        }
      }
    } catch (error) {
      console.error('Error submitting OT/Shootout:', error);
      setError(error.response?.data?.error || 'Failed to submit OT/Shootout result');
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
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
      >
        <span className="text-2xl">🏒</span>
        <span className="text-lg">OT/Shootout</span>
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
                      value="overtime"
                      checked={gameType === 'overtime'}
                      onChange={(e) => setGameType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Overtime</span>
                  </label>
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

              {/* Final Score (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Score (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">{homeTeam}</label>
                    <input
                      type="number"
                      value={finalScore.home}
                      onChange={(e) => setFinalScore(prev => ({ ...prev, home: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-center"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <span className="text-gray-500 font-bold">-</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">{awayTeam}</label>
                    <input
                      type="number"
                      value={finalScore.away}
                      onChange={(e) => setFinalScore(prev => ({ ...prev, away: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-center"
                      placeholder="0"
                      min="0"
                    />
                  </div>
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
