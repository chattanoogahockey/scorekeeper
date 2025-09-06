import React, { createContext, useState, useContext } from 'react';

/**
 * GameContext holds high-level state shared across pages, such as the
 * currently selected league, game, rosters, and attendance information.
 */
export const GameContext = createContext(null);

/**
 * Custom hook to use the GameContext
 */
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

export function GameProvider({ children }) {
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [attendance, setAttendance] = useState({}); // { teamName: [playerName, ...] }
  
  // Tracks whether both teams have submitted attendance
  const bothAttendanceSubmitted =
    rosters.length > 0 &&
    rosters.every((team) => attendance[team.teamName] && attendance[team.teamName].length >= 0);

  // Derived properties for OTShootoutButton
  const selectedGameId = selectedGame?.id || selectedGame?.gameId;
  const homeTeam = selectedGame?.homeTeam || selectedGame?.hometeam || selectedGame?.homeTeamId;
  const awayTeam = selectedGame?.awayTeam || selectedGame?.awayteam || selectedGame?.awayTeamId;

  const reset = () => {
  setSelectedDivision(null);
    setSelectedGame(null);
    setRosters([]);
    setAttendance({});
  };

  return (
    <GameContext.Provider
      value={{
  selectedDivision,
  setSelectedDivision,
        selectedGame,
        setSelectedGame,
        selectedGameId,
        homeTeam,
        awayTeam,
        rosters,
        setRosters,
        attendance,
        setAttendance,
        bothAttendanceSubmitted,
        reset,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}