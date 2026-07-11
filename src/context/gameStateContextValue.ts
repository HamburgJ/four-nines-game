import { createContext } from 'react';
import type { GameOutcome, GameState } from '../types/GameState';

export interface GameStateContextType {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState>) => void;
  resetGameState: () => void;
  updateSettings: (updates: Partial<GameState['settings']>) => void;
  startNewDay: (date?: string) => void;
  completeGame: (outcome: GameOutcome, expression?: string) => void;
}

export const GameStateContext = createContext<GameStateContextType | undefined>(undefined);
