import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function RinkReport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">🏒 The Rink Report</h1>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Main
            </button>
          </div>
          
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
              The Rink Report Coming Soon
            </h2>
            <p className="text-gray-500 mb-8">
              Your comprehensive hockey news and analysis hub. Get the latest updates, 
              game recaps, player spotlights, and insider stories from the rink.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-400">
                <h3 className="font-semibold text-red-800 mb-2">📰 Game Recaps</h3>
                <p className="text-sm text-red-600">Detailed analysis and highlights from recent games</p>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                <h3 className="font-semibold text-blue-800 mb-2">⭐ Player Spotlights</h3>
                <p className="text-sm text-blue-600">Feature stories on standout players and performances</p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-400">
                <h3 className="font-semibold text-green-800 mb-2">📈 League News</h3>
                <p className="text-sm text-green-600">Updates on standings, schedules, and league announcements</p>
              </div>
              
              <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
                <h3 className="font-semibold text-yellow-800 mb-2">🎯 Insider Analysis</h3>
                <p className="text-sm text-yellow-600">Expert commentary and strategic breakdowns</p>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">📧 Stay Updated</h4>
              <p className="text-sm text-gray-600">
                Subscribe to get the latest rink reports delivered straight to your inbox
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
