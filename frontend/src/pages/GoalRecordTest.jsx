import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext';

/**
 * Simple Goal Recording Test Page - Minimal version for debugging
 */
export default function GoalRecordTest() {
  const navigate = useNavigate();
  const { selectedGame } = useContext(GameContext);
  
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple test function
  const testGoalSubmission = async () => {
    setLoading(true);
    setStatus('Starting test...');
    
    try {
      console.log('🧪 Starting goal submission test...');
      
      // Check selectedGame
      console.log('Selected game:', selectedGame);
      setStatus('Checking selected game...');
      
      if (!selectedGame) {
        throw new Error('No game selected');
      }
      
      if (!selectedGame.id && !selectedGame.gameId) {
        throw new Error('Selected game has no ID');
      }
      
      setStatus('Preparing test data...');
      
      // Test data
      const testGoalData = {
        gameId: selectedGame.id || selectedGame.gameId,
        team: 'Test Team',
        player: 'Test Player',
        period: '1',
        time: '5:30',
        assist: null,
        shotType: 'Wrist Shot',
        goalType: 'Regular',
        breakaway: false
      };
      
      console.log('Test goal data:', testGoalData);
      setStatus('Sending request to backend...');
      
      // Get API URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      console.log('API Base URL:', apiBaseUrl);
      
      const response = await fetch(`${apiBaseUrl}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testGoalData),
      });
      
      console.log('Response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      setStatus(`Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Success result:', result);
      setStatus(`SUCCESS! Goal created with ID: ${result.goal.id}`);
      
    } catch (error) {
      console.error('Test failed:', error);
      setStatus(`ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Goal Test</h1>
          <p className="text-blue-700">Debug version for troubleshooting</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
          {/* Debug Info */}
          <div className="border p-4 rounded bg-gray-50">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p><strong>Selected Game:</strong> {selectedGame ? `${selectedGame.awayTeam} vs ${selectedGame.homeTeam} (ID: ${selectedGame.id || selectedGame.gameId})` : 'None'}</p>
            <p><strong>API URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}</p>
          </div>

          {/* Status */}
          {status && (
            <div className={`p-4 rounded ${status.includes('ERROR') ? 'bg-red-100 text-red-800' : status.includes('SUCCESS') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
              <strong>Status:</strong> {status}
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={testGoalSubmission}
            disabled={loading || !selectedGame}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
              loading || !selectedGame
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Testing...' : 'Test Goal Submission'}
          </button>

          <button
            onClick={() => navigate('/ingame')}
            className="w-full bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Back to In Game Menu
          </button>
        </div>
      </div>
    </div>
  );
}
