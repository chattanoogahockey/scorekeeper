import React, { useState } from 'react';
import staticDataService from '../services/staticDataService.js';

export default function ApiTest() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    setLoading(true);
    setResult('Testing static data service health...');
    try {
      const health = await staticDataService.healthCheck();
      setResult(`✅ Static Data Service Health: ${JSON.stringify(health, null, 2)}`);
    } catch (error) {
      setResult(`❌ Static Data Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testGames = async () => {
    setLoading(true);
    setResult('Testing games data...');
    try {
      const games = await staticDataService.getGames();
      setResult(`✅ Games: Found ${games.length} games\n${JSON.stringify(games.slice(0, 2), null, 2)}${games.length > 2 ? '\n...(showing first 2 games)' : ''}`);
    } catch (error) {
      setResult(`❌ Games Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testPlayers = async () => {
    setLoading(true);
    setResult('Testing players data...');
    try {
      const players = await staticDataService.getPlayers();
      setResult(`✅ Players: Found ${players.length} players\n${JSON.stringify(players.slice(0, 3), null, 2)}${players.length > 3 ? '\n...(showing first 3 players)' : ''}`);
    } catch (error) {
      setResult(`❌ Players Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testTeams = async () => {
    setLoading(true);
    setResult('Testing teams data...');
    try {
      const teams = await staticDataService.getTeams();
      setResult(`✅ Teams: Found ${teams.length} teams\n${JSON.stringify(teams, null, 2)}`);
    } catch (error) {
      setResult(`❌ Teams Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testStatistics = async () => {
    setLoading(true);
    setResult('Testing statistics...');
    try {
      const stats = await staticDataService.getPlayerStats();
      setResult(`✅ Statistics: ${JSON.stringify(stats, null, 2)}`);
    } catch (error) {
      setResult(`❌ Statistics Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Static Data Service Test</h1>
      <p className="text-gray-600 mb-6">Test the static JSON data loading functionality.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button 
          onClick={testHealth}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Health Check
        </button>
        <button 
          onClick={testGames}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Games Data
        </button>
        <button 
          onClick={testPlayers}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Players Data
        </button>
        <button 
          onClick={testTeams}
          disabled={loading}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Teams Data
        </button>
        <button 
          onClick={testStatistics}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Statistics
        </button>
      </div>

      {loading && (
        <div className="mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span>Loading...</span>
          </div>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Results:</h2>
        <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
          {result || 'Click a button to test the static data service...'}
        </pre>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p><strong>Note:</strong> This is now a static data service test page.</p>
        <p>All data is loaded from JSON files in the <code>/data/</code> directory.</p>
        <p>No server or API calls are made - everything runs in your browser.</p>
      </div>
    </div>
  );
}