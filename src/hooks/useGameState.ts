import { useState, useEffect } from 'react';

interface GameState {
  currentExpression: string;
  todayCompleted: boolean;
  gaveUp: boolean;
  date: string;
  hintsUsed: {
    operators: string[];
    subtrees: string[];
  };
  // Stats for sharing
  gamesPlayed: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
}

const INITIAL_STATE: GameState = {
  currentExpression: '',
  todayCompleted: false,
  gaveUp: false,
  date: new Date().toISOString().split('T')[0],
  hintsUsed: {
    operators: [],
    subtrees: []
  },
  // Initialize stats
  gamesPlayed: 0,
  winRate: 0,
  currentStreak: 0,
  maxStreak: 0
};

export const useGameState = () => {
  // Initialize state from localStorage or default
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('gameState');
    if (!saved) return INITIAL_STATE;

    const parsed = JSON.parse(saved);
    const today = new Date().toISOString().split('T')[0];

    // Reset state if it's a new day
    if (parsed.date !== today) {
      return INITIAL_STATE;
    }

    return parsed;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [gameState]);

  const updateGameState = (update: Partial<GameState>) => {
    setGameState(current => ({
      ...current,
      ...update
    }));
  };

  return { gameState, updateGameState };
}; 