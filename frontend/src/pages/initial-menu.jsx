import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function InitialMenu() {
  const navigate = useNavigate();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleNewGame = () => {
    navigate('/leagues');
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'chahky') {
      navigate('/admin');
    } else {
      setLoginError('Invalid password');
      setAdminPassword('');
    }
  };

  const handleAdminClick = () => {
    setShowAdminLogin(true);
    setLoginError('');
  };

  const handleStatistics = () => {
    navigate('/statistics');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-blue-900 mb-4">
          The Scorekeeper
        </h1>
        <p className="text-xl text-blue-700 mb-8">
          Chattanooga Roller Hockey Scoring & Analytics
        </p>
      </div>

      {!showAdminLogin ? (
        <div className="space-y-6 w-full max-w-md">
          <button
            onClick={handleNewGame}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-colors"
          >
            New Game
          </button>
          
          <button
            onClick={handleStatistics}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-colors"
          >
            📊 Statistics
          </button>
          
          <button
            onClick={handleAdminClick}
            className="w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-colors"
          >
            Admin
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4 text-center">Admin Login</h3>
          
          {loginError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {loginError}
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Login
              </button>
              
              <button
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                  setLoginError('');
                }}
                className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
