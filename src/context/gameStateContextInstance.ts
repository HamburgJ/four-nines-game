import { createContext } from 'react';
import { GameState } from '../types/GameState';

export interface GameStateContextType {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState>) => void;
  resetGameState: () => void;
  updateSettings: (updates: Partial<GameState['settings']>) => void;
}

export const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
);
