import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameOutcome, GameState } from '../types/GameState';
import {
  completeGame as completeGameState,
  createDefaultGameState,
  GAME_STATE_STORAGE_KEY,
  LEGACY_GAME_STATE_STORAGE_KEY,
  migrateGameState,
  startNewDay as startNewDayState,
} from '../utils/gameState';
import { getLocalDateKey } from '../utils/gameLogic';
import { GameStateContext } from './gameStateContextValue';

const loadGameState = () => {
  try {
    const stored = localStorage.getItem(GAME_STATE_STORAGE_KEY)
      ?? localStorage.getItem(LEGACY_GAME_STATE_STORAGE_KEY);
    return stored ? migrateGameState(JSON.parse(stored)) : createDefaultGameState();
  } catch (error) {
    console.warn('Four Nines could not read saved progress; starting with a clean state.', error);
    return createDefaultGameState();
  }
};

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(loadGameState);

  useEffect(() => {
    try {
      localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(gameState));
      localStorage.removeItem(LEGACY_GAME_STATE_STORAGE_KEY);
    } catch (error) {
      console.warn('Four Nines could not save progress.', error);
    }
  }, [gameState]);

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState(current => ({ ...current, ...updates }));
  }, []);

  const resetGameState = useCallback(() => {
    setGameState(createDefaultGameState(getLocalDateKey()));
  }, []);

  const updateSettings = useCallback((updates: Partial<GameState['settings']>) => {
    setGameState(current => ({
      ...current,
      settings: { ...current.settings, ...updates },
    }));
  }, []);

  const startNewDay = useCallback((date = getLocalDateKey()) => {
    setGameState(current => startNewDayState(current, date));
  }, []);

  const completeGame = useCallback((outcome: GameOutcome, expression?: string) => {
    setGameState(current => completeGameState(current, outcome, expression));
  }, []);

  const value = useMemo(() => ({
    gameState,
    updateGameState,
    resetGameState,
    updateSettings,
    startNewDay,
    completeGame,
  }), [gameState, updateGameState, resetGameState, updateSettings, startNewDay, completeGame]);

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
};
