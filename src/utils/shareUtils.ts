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
 * Generate a result grid visual (like Wordle's colored squares)
 * @param grid 2D array of result emojis
 * @returns Formatted string of emojis
 */
export const generateResultGrid = (grid: ResultEmoji[][]): string => {
  return grid.map(row => row.join('')).join('\n');
};

/**
 * Format time in milliseconds to a readable string
 * @param ms Time in milliseconds
 * @returns Formatted string like "1:23"
 */
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Generate share text for the game result
 * @param options Share options including score, stats, etc.
 * @returns Formatted share text
 */
export const generateShareText = (options: ShareOptions): string => {
  const lines: string[] = [];

  // Title and day number
  lines.push(`${options.title}${options.dayNumber ? ` #${options.dayNumber}` : ''}`);

  // Score
  if (options.score !== undefined) {
    lines.push(`Score: ${options.score}${options.hintsUsed ? ` (${options.hintsUsed} hints used)` : ''}`);
  }

  // Grid
  if (options.grid) {
    lines.push('');
    lines.push(generateResultGrid(options.grid));
  }

  // Time
  if (options.timeMs) {
    lines.push(`Time: ${formatTime(options.timeMs)}`);
  }

  // Stats
  if (options.stats) {
    lines.push('');
    lines.push(`Played: ${options.stats.gamesPlayed}`);
    lines.push(`Win Rate: ${Math.round(options.stats.winRate * 100)}%`);
    lines.push(`Current Streak: ${options.stats.currentStreak}`);
    lines.push(`Max Streak: ${options.stats.maxStreak}`);
  }

  return lines.join('\n');
};

/**
 * Share results using the native share API or fallback to clipboard
 * @param text Text to share
 * @param url Optional URL to share
 * @returns Promise that resolves when sharing is complete
 */
export const shareResults = async (text: string, url?: string): Promise<void> => {
  if (navigator.share) {
    try {
      await navigator.share({
        text,
        url,
        title: 'Game Results',
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        await navigator.clipboard.writeText(text);
      }
    }
  } else {
    await navigator.clipboard.writeText(text);
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