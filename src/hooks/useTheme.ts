import { useEffect } from 'react';
import { useGameState } from '../context/GameStateContext';

export const useTheme = () => {
  const { gameState, updateSettings } = useGameState();

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    if (gameState.settings?.theme !== 'light') {
      updateSettings({ theme: 'light' });
    }
  }, [gameState.settings?.theme, updateSettings]);

  const toggleTheme = () => {
    updateSettings({ theme: 'light' });
  };

  return {
    theme: 'light' as const,
    toggleTheme,
  };
}; 
