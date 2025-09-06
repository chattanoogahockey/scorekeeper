/**
 * TypeScript interfaces for Gold Standard Data Types
 * Frontend type definitions matching backend schemas exactly
 */

/**
 * Game interface - matches backend GAMES_SCHEMA exactly
 */
export interface Game {
  // Required fields
  id: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string; // YYYY-MM-DD format
  gameTime: string; // HH:MM format
  division: string;
  season: string;
  year: number;
  
  // Optional fields
  week?: number;
  status?: string;
  venue?: string;
  rink?: string;
  
  // System fields
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Roster interface - matches backend ROSTERS_SCHEMA exactly
 */
export interface Roster {
  // Required fields
  id: string;
  teamName: string;
  division: string;
  season: string;
  year: number;
  players: Player[];
  
  // System fields
  createdAt: string;
  updatedAt: string;
}

/**
 * Player interface for roster players
 */
export interface Player {
  name: string;
  firstName?: string;
  lastName?: string;
  jerseyNumber?: number;
  position?: string;
}

/**
 * Goal interface - matches backend GOALS_SCHEMA exactly
 */
export interface Goal {
  // Required fields
  id: string;
  gameId: string; // Foreign key to games.id
  teamName: string;
  playerName: string;
  period: number;
  time: string; // MM:SS format
  
  // Optional fields
  assist1?: string;
  assist2?: string;
  shotType?: string;
  goalType?: string; // Even Strength, Power Play, Short Handed, etc.
  
  // System fields
  createdAt: string;
}

/**
 * Penalty interface - matches backend PENALTIES_SCHEMA exactly
 */
export interface Penalty {
  // Required fields
  id: string;
  gameId: string; // Foreign key to games.id
  teamName: string;
  playerName: string;
  penaltyType: string;
  period: number;
  time: string; // MM:SS format
  
  // Optional fields
  duration?: number; // Minutes
  severity?: string; // Minor, Major, Misconduct
  
  // System fields
  createdAt: string;
}

/**
 * Attendance interface - matches backend ATTENDANCE_SCHEMA exactly
 */
export interface Attendance {
  // Required fields
  id: string;
  gameId: string; // Foreign key to games.id
  teamName: string;
  playersPresent: string[];
  
  // Optional fields
  totalRosterSize?: number;
  
  // System fields
  createdAt: string;
}

/**
 * Player Stats interface - matches backend PLAYER_STATS_SCHEMA exactly
 */
export interface PlayerStats {
  // Required fields
  id: string;
  gameId: string; // Foreign key to games.id
  teamName: string;
  playerName: string;
  
  // Statistics fields
  goals?: number;
  assists?: number;
  points?: number;
  penaltyMinutes?: number;
  shots?: number;
  
  // System fields
  createdAt: string;
}

/**
 * Shots on Goal interface - matches backend SHOTS_SCHEMA exactly
 */
export interface ShotsOnGoal {
  // Required fields
  id: string;
  gameId: string; // Foreign key to games.id
  
  // Team shot counts by period
  homeTeamShots: { [period: string]: number }; // { period1: 5, period2: 3, period3: 7 }
  awayTeamShots: { [period: string]: number }; // { period1: 4, period2: 6, period3: 5 }
  
  // System fields
  createdAt: string;
  updatedAt: string;
}

/**
 * OT/Shootout interface - matches backend OT_SHOOTOUT_SCHEMA exactly
 */
export interface OTShootout {
  // Required fields
  id: string;
  gameId: string; // Foreign key to games.id
  type: 'overtime' | 'shootout';
  
  // Result fields
  winningTeam: string;
  losingTeam: string;
  
  // Shootout specific fields (optional for overtime)
  shootoutRounds?: any[];
  
  // System fields
  createdAt: string;
}

/**
 * Game Status enum - matches backend exactly
 */
export enum GameStatus {
  SCHEDULED = 'Scheduled',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  POSTPONED = 'Postponed'
}

/**
 * Division enum - matches backend exactly
 */
export enum Division {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum'
}

/**
 * Season enum - matches backend exactly
 */
export enum Season {
  FALL = 'Fall',
  WINTER = 'Winter',
  SPRING = 'Spring',
  SUMMER = 'Summer'
}

/**
 * API Response interfaces
 */

export interface GamesApiResponse {
  success: boolean;
  games: Game[];
  meta: {
    count: number;
    division: string;
    requestId: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: string;
  required?: string[];
  missing?: string[];
  received?: string[];
  validValues?: string[];
}

/**
 * Component Props interfaces
 */

export interface GameContextType {
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;
  selectedGameId: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
}

export interface GameSelectionProps {
  games: Game[];
  onGameSelect: (game: Game) => void;
  loading?: boolean;
  error?: string;
}

export interface RosterAttendanceProps {
  selectedGame: Game;
  rosters: Roster[];
  onSubmitAttendance: (attendance: Attendance[]) => void;
}

export interface GoalRecordProps {
  selectedGame: Game;
  onGoalSubmit: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
}

export interface PenaltyRecordProps {
  selectedGame: Game;
  onPenaltySubmit: (penalty: Omit<Penalty, 'id' | 'createdAt'>) => void;
}
