import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/game-context.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InitialMenu from './pages/initial-menu.jsx';
import ApiTest from './pages/api-test.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Statistics from './pages/Statistics.jsx';

/**
 * Step 3: Add core viewing pages (Dashboard, Statistics)
 */
export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<InitialMenu />} />
            <Route path="/api-test" element={<ApiTest />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="*" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl mb-4">Hockey Scorekeeper</h1>
                <p className="mb-6">Navigate to available pages:</p>
                <div className="space-x-4">
                  <a href="#/" className="text-blue-500 hover:underline">Home</a>
                  <a href="#/dashboard" className="text-blue-500 hover:underline">Dashboard</a>
                  <a href="#/statistics" className="text-blue-500 hover:underline">Statistics</a>
                  <a href="#/api-test" className="text-blue-500 hover:underline">API Test</a>
                </div>
              </div>
            } />
          </Routes>
        </HashRouter>
      </GameProvider>
    </ErrorBoundary>
  );
}