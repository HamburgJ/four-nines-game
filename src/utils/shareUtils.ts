import { getTodaysSeed } from './gameUtils';

type ResultEmoji = '⬛' | '🟨' | '🟩' | '🟦' | '🟥' | '⬜'; // Add more as needed

interface ShareOptions {
  title: string;
  dayNumber?: number;
  score?: number;
  streak?: number;
  timeMs?: number;
  grid?: ResultEmoji[][];
  stats?: GameStats;
  hintsUsed?: number;
  puzzle?: {
    target: number;
    seed: number;
    date: string;
  };
  didSolve: boolean;
}

interface GameStats {
  gamesPlayed: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  averageScore?: number;
  bestTime?: number;
}

/**
 * Format a date in "MMM dd, yyyy" format
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Format time in milliseconds to a readable string
 */
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Generate share text for the game result
 */
export const generateShareText = (options: ShareOptions): string => {
  const lines: string[] = [];
  
  // URL line
  lines.push(window.location.href);
  lines.push('');  // Empty line after URL
  
  // First line: Solved status and date
  const statusLine = `I ${options.didSolve ? 'solved' : "didn't solve"} Four Nines puzzle for ${formatDate(options.puzzle?.date || new Date().toISOString())}`;
  lines.push(statusLine);

  // Second line: Puzzle details
  if (options.puzzle) {
    lines.push(`Make ${options.puzzle.target} with four ${options.puzzle.seed}s`);
  }

  // Third line: Hints used
  if (options.hintsUsed !== undefined) {
    lines.push(`${options.hintsUsed}/2 Hints used`);
  }

  return lines.join('\n');
};

/**
 * Share results using the native share API or fallback to clipboard
 */
export const shareResults = async (text: string, url?: string): Promise<void> => {
  const shareData = {
    title: 'Four Nines Puzzle',
    text,
    url: url || window.location.href
  };

  try {
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(text);
      // You might want to show a toast or notification here
      console.log('Copied to clipboard!');
    }
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      await navigator.clipboard.writeText(text);
      console.log('Fallback: Copied to clipboard!');
    }
  }
};

/**
 * Compare stats with a friend's stats
 * @param myStats My game stats
 * @param friendStats Friend's game stats
 * @returns Comparison text
 */
export const compareStats = (myStats: GameStats, friendStats: GameStats): string => {
  const lines: string[] = [];
  lines.push('📊 Stats Comparison:');
  lines.push('');
  lines.push('           You  Friend');
  lines.push(`Games:     ${myStats.gamesPlayed.toString().padStart(3)} ${friendStats.gamesPlayed.toString().padStart(6)}`);
  lines.push(`Win Rate:  ${(myStats.winRate * 100).toFixed(0).padStart(3)}% ${(friendStats.winRate * 100).toFixed(0).padStart(5)}%`);
  lines.push(`Streak:    ${myStats.currentStreak.toString().padStart(3)} ${friendStats.currentStreak.toString().padStart(6)}`);
  lines.push(`Best:      ${myStats.maxStreak.toString().padStart(3)} ${friendStats.maxStreak.toString().padStart(6)}`);
  
  if (myStats.averageScore !== undefined && friendStats.averageScore !== undefined) {
    lines.push(`Avg Score: ${myStats.averageScore.toFixed(1).padStart(3)} ${friendStats.averageScore.toFixed(1).padStart(6)}`);
  }
  
  if (myStats.bestTime !== undefined && friendStats.bestTime !== undefined) {
    lines.push(`Best Time: ${formatTime(myStats.bestTime).padStart(3)} ${formatTime(friendStats.bestTime).padStart(6)}`);
  }
  
  return lines.join('\n');
}; 