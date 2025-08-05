import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Statistics() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">📊 Statistics</h1>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Main
            </button>
          </div>
          
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
              Statistics Dashboard Coming Soon
            </h2>
            <p className="text-gray-500 mb-8">
              This page will feature comprehensive game statistics, player performance metrics, 
              team analytics, and historical data visualization.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Player Stats</h3>
                <p className="text-sm text-blue-600">Goals, assists, penalties, and performance metrics</p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Team Analytics</h3>
                <p className="text-sm text-green-600">Win/loss records, scoring trends, and team comparisons</p>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Game History</h3>
                <p className="text-sm text-purple-600">Historical data, season summaries, and league standings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
