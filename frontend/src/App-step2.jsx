import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/game-context.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InitialMenu from './pages/initial-menu.jsx';
import ApiTest from './pages/api-test.jsx';

/**
 * Step 2: Add API test page to verify static data service works
 */
export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<InitialMenu />} />
            <Route path="/api-test" element={<ApiTest />} />
            <Route path="*" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl mb-4">Page under construction</h1>
                <div className="space-x-4">
                  <a href="#/" className="text-blue-500 hover:underline">Home</a>
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