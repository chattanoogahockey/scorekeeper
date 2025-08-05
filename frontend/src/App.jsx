import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InitialMenu from './pages/InitialMenu.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import EditGame from './pages/EditGame.jsx';
import LeagueGameSelection from './pages/LeagueGameSelection.jsx';
import RosterAttendance from './pages/RosterAttendance.jsx';
import InGameMenu from './pages/InGameMenu.jsx';
import GoalRecord from './pages/GoalRecord.jsx';
import PenaltyRecord from './pages/PenaltyRecord.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Statistics from './pages/Statistics.jsx';
import RinkReport from './pages/RinkReport.jsx';
import { GameProvider } from './contexts/GameContext.jsx';

/**
 * Main application component defining routes and wrapping with GameProvider.
 */
export default function App() {
  return (
    <GameProvider>
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
        <Route path="/rink-report" element={<RinkReport />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </GameProvider>
  );
}