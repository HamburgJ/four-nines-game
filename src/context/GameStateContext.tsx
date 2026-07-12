import React, { useState, useEffect } from 'react';
import { GameState, DEFAULT_GAME_STATE } from '../types/GameState';
import { GameStateContext } from './gameStateContextInstance';

const STORAGE_KEY = 'gameState';

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure hintsUsed has the correct structure
      if (!parsed.hintsUsed || typeof parsed.hintsUsed !== 'object') {
        parsed.hintsUsed = {
          operators: [],
          subtrees: []
        };
      }
      return parsed;
    }
    return DEFAULT_GAME_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  const updateGameState = (updates: Partial<GameState>) => {
    setGameState(current => ({
      ...current,
      ...updates,
    }));
  };

  const resetGameState = () => {
    const now = new Date();
    setGameState({
      ...DEFAULT_GAME_STATE,
      lastPlayed: now.toISOString(),
      streak: 1,
    });
  };

  const updateSettings = (updates: Partial<GameState['settings']>) => {
    setGameState(current => ({
      ...current,
      settings: {
        ...current.settings,
        ...updates,
      },
    }));
  };

  return (
    <GameStateContext.Provider value={{ gameState, updateGameState, resetGameState, updateSettings }}>
      {children}
    </GameStateContext.Provider>
  );
};
