import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/game-context.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AccessGate from './components/AccessGate.jsx';

// Lazy load components for better performance
const InitialMenu = lazy(() => import('./pages/initial-menu.jsx'));
const ApiTest = lazy(() => import('./pages/api-test.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Statistics = lazy(() => import('./pages/Statistics.jsx'));

// Loading component for lazy-loaded routes
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * Step 3: Add core viewing pages (Dashboard, Statistics) with lazy loading
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AccessGate>
        <GameProvider>
          <HashRouter>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<InitialMenu />} />
                <Route path="/api-test" element={<ApiTest />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="*" element={
                  <main className="p-8 text-center" role="main">
                    <h1 className="text-2xl mb-4">Hockey Scorekeeper</h1>
                    <p className="mb-6">Navigate to available pages:</p>
                    <nav className="space-x-4" role="navigation" aria-label="Main navigation">
                      <a href="#/" className="text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm">Home</a>
                      <a href="#/dashboard" className="text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm">Dashboard</a>
                      <a href="#/statistics" className="text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm">Statistics</a>
                      <a href="#/api-test" className="text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm">API Test</a>
                    </nav>
                  </main>
                } />
              </Routes>
            </Suspense>
          </HashRouter>
        </GameProvider>
      </AccessGate>
    </ErrorBoundary>
  );
}