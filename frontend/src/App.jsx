import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './contexts/game-context.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy load all page components
const InitialMenu = React.lazy(() => import('./pages/initial-menu.jsx'));
const AdminPanel = React.lazy(() => import('./pages/admin-panel.jsx'));
const EditGame = React.lazy(() => import('./pages/edit-game.jsx'));
const LeagueGameSelection = React.lazy(() => import('./pages/league-game-selection.jsx'));
const RosterAttendance = React.lazy(() => import('./pages/roster-attendance.jsx'));
const InGameMenu = React.lazy(() => import('./pages/in-game-menu.jsx'));
const GoalRecord = React.lazy(() => import('./pages/goal-record.jsx'));
const PenaltyRecord = React.lazy(() => import('./pages/penalty-record.jsx'));
const Dashboard = React.lazy(() => import('./pages/Dashboard.jsx'));
const Statistics = React.lazy(() => import('./pages/Statistics.jsx'));
const ApiTest = React.lazy(() => import('./pages/api-test.jsx'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Main application component defining routes and wrapping with GameProvider.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <HashRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<InitialMenu />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/edit/:gameId" element={<EditGame />} />
              <Route path="/leagues" element={<LeagueGameSelection />} />
              <Route path="/roster" element={<RosterAttendance />} />
              <Route path="/ingame" element={<InGameMenu />} />
              <Route path="/goal" element={<GoalRecord />} />
              <Route path="/penalty" element={<PenaltyRecord />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/test" element={<ApiTest />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </GameProvider>
    </ErrorBoundary>
  );
}