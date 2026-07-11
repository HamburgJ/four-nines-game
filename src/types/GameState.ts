export interface HintState {
  operators: string[];
  subtrees: string[];
}

export interface GameSettings {
  theme: 'light';
}

export interface GameState {
  schemaVersion: 2;
  date: string;
  currentExpression: string;
  lastPlayed: string | null;
  settings: GameSettings;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  todayCompleted: boolean;
  gaveUp: boolean;
  bestSolutions: Record<string, string>;
  bestScores: Record<string, number>;
  hintsUsed: HintState;
}

export type GameOutcome = 'solved' | 'gave_up';
