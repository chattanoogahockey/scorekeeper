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
    <main
      id="main-content"
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4"
      role="main"
      aria-labelledby="app-title"
    >
      <div className="text-center mb-12">
        <h1
          id="app-title"
          className="text-6xl font-bold text-blue-900 mb-4"
          tabIndex="-1"
        >
          The Scorekeeper
        </h1>
        <p className="text-xl text-blue-700 mb-8">
          Chattanooga Roller Hockey Scoring & Analytics
        </p>
      </div>

      {!showAdminLogin ? (
        <nav
          className="space-y-6 w-full max-w-md"
          role="navigation"
          aria-label="Main navigation"
        >
          <button
            onClick={handleNewGame}
            className="w-full bg-blue-500 hover:bg-blue-600 focus:bg-blue-600 active:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-describedby="new-game-description"
          >
            New Game
          </button>
          <div id="new-game-description" className="sr-only">
            Start a new hockey game scoring session
          </div>

          <button
            onClick={handleStatistics}
            className="w-full bg-green-500 hover:bg-green-600 focus:bg-green-600 active:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-describedby="statistics-description"
          >
            📊 Statistics
          </button>
          <div id="statistics-description" className="sr-only">
            View player and team statistics
          </div>

          <button
            onClick={handleAdminClick}
            className="w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 focus:from-blue-800 focus:to-blue-900 active:from-blue-900 active:to-blue-900 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
            aria-describedby="admin-description"
          >
            Admin
          </button>
          <div id="admin-description" className="sr-only">
            Access administrative functions
          </div>
        </nav>
      ) : (
        <div
          className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md"
          role="dialog"
          aria-labelledby="admin-login-title"
          aria-modal="true"
        >
          <h3
            id="admin-login-title"
            className="text-xl font-bold mb-4 text-center"
          >
            Admin Login
          </h3>

          {loginError && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
              role="alert"
              aria-live="polite"
            >
              {loginError}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdminLogin();
            }}
            aria-labelledby="admin-login-title"
          >
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                autoFocus
                required
                aria-describedby={loginError ? "login-error" : undefined}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 focus:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-describedby="login-button-description"
              >
                Login
              </button>
              <div id="login-button-description" className="sr-only">
                Submit admin login credentials
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                  setLoginError('');
                }}
                className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 focus:from-blue-800 focus:to-blue-900 active:from-blue-900 active:to-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
                aria-describedby="cancel-button-description"
              >
                Cancel
              </button>
              <div id="cancel-button-description" className="sr-only">
                Cancel admin login and return to main menu
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
