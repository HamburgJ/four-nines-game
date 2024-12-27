import { useEffect } from 'react';
import { useGameState } from '../context/GameStateContext';

export const useTheme = () => {
  const { gameState, updateSettings } = useGameState();
  const theme = gameState.settings?.theme;

  // Initialize theme and listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial theme if not set
    if (!theme) {
      updateSettings({ theme: mediaQuery.matches ? 'dark' : 'light' });
    }

    // Update document theme
    document.documentElement.setAttribute('data-bs-theme', theme || 'light');

    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('gameState')) {
        updateSettings({ theme: e.matches ? 'dark' : 'light' });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateSettings]);

  const toggleTheme = () => {
    updateSettings({ theme: theme === 'light' ? 'dark' : 'light' });
  };

  return {
    theme: theme || 'light',
    toggleTheme,
  };
}; 