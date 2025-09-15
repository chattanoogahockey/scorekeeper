import React, { useState } from 'react';
import staticDataService from '../services/staticDataService.js';

export default function ApiTest() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    setLoading(true);
    setResult('Testing static data service...');
    try {
      const health = await staticDataService.healthCheck();
      setResult(`✅ Static Data Service: ${JSON.stringify(health, null, 2)}`);
    } catch (error) {
      setResult(`❌ Static Data Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testVersion = async () => {
    setLoading(true);
    setResult('Testing version endpoint...');
    try {
      const response = await axios.get(`${apiBase}/api/version`, { timeout: 5000 });
      setResult(`✅ Version: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      setResult(`❌ Version Error: ${error.message}`);
    }
    setLoading(false);
  };

  const testGames = async () => {
    setLoading(true);
    setResult('Testing games endpoint...');
    try {
      const response = await axios.get(`${apiBase}/api/games?division=all&includeUpcoming=true`, { timeout: 15000 });
      setResult(`✅ Games: Found ${response.data?.data?.length || response.data?.length || 0} games\n${JSON.stringify(response.data, null, 2).substring(0, 1000)}...`);
    } catch (error) {
      setResult(`❌ Games Error: ${error.message}\nCode: ${error.code}\nResponse: ${error.response?.status} ${error.response?.statusText}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      <p className="mb-4">API Base: {apiBase}</p>
      
      <div className="space-x-4 mb-4">
        <button 
          onClick={testHealth}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test Health
        </button>
        <button 
          onClick={testVersion}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test Version
        </button>
        <button 
          onClick={testGames}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test Games
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Result:</h2>
        <pre className="text-sm whitespace-pre-wrap">{result || 'Click a button to test...'}</pre>
      </div>
    </div>
  );
}
