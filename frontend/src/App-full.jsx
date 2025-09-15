import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './contexts/game-context.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Direct imports for better reliability
import InitialMenu from './pages/initial-menu.jsx';
import AdminPanel from './pages/admin-panel.jsx';
import EditGame from './pages/edit-game.jsx';
import LeagueGameSelection from './pages/league-game-selection.jsx';
import RosterAttendance from './pages/roster-attendance.jsx';
import InGameMenu from './pages/in-game-menu.jsx';
import GoalRecord from './pages/goal-record.jsx';
import PenaltyRecord from './pages/penalty-record.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Statistics from './pages/Statistics.jsx';
import ApiTest from './pages/api-test.jsx';

/**
 * Main application component defining routes and wrapping with GameProvider.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <HashRouter>
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
        </HashRouter>
      </GameProvider>
    </ErrorBoundary>
  );
}