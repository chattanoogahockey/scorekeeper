import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/game-context.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InitialMenu from './pages/initial-menu.jsx';

/**
 * Step 1: Test with just InitialMenu and GameProvider
 */
export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<InitialMenu />} />
            <Route path="*" element={<div className="p-8 text-center"><h1 className="text-2xl">Page under construction</h1><a href="#/" className="text-blue-500">Back to Home</a></div>} />
          </Routes>
        </HashRouter>
      </GameProvider>
    </ErrorBoundary>
  );
}