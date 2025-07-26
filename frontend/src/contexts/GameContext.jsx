import React, { createContext, useState } from 'react';

/**
 * GameContext holds high-level state shared across pages, such as the
 * currently selected league, game, rosters, and attendance information.
 */
export const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [attendance, setAttendance] = useState({}); // { teamName: [playerName, ...] }
  
  // Tracks whether both teams have submitted attendance
  const bothAttendanceSubmitted =
    rosters.length > 0 &&
    rosters.every((team) => attendance[team.teamName] && attendance[team.teamName].length >= 0);

  const reset = () => {
    setSelectedLeague(null);
    setSelectedGame(null);
    setRosters([]);
    setAttendance({});
  };

  return (
    <GameContext.Provider
      value={{
        selectedLeague,
        setSelectedLeague,
        selectedGame,
        setSelectedGame,
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