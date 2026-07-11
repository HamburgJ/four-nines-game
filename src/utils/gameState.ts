import type { GameOutcome, GameState, HintState } from '../types/GameState';
import { getLocalDateKey } from './gameLogic';

export const GAME_STATE_STORAGE_KEY = 'four-nines.game-state';
export const LEGACY_GAME_STATE_STORAGE_KEY = 'gameState';

const emptyHints = (): HintState => ({ operators: [], subtrees: [] });

export const createDefaultGameState = (date = getLocalDateKey()): GameState => ({
  schemaVersion: 2,
  date,
  currentExpression: '',
  lastPlayed: null,
  settings: { theme: 'light' },
  gamesPlayed: 0,
  wins: 0,
  winRate: 0,
  currentStreak: 0,
  maxStreak: 0,
  todayCompleted: false,
  gaveUp: false,
  bestSolutions: {},
  bestScores: {},
  hintsUsed: emptyHints(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

const stringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const recordOf = <T extends string | number>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): Record<string, T> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, T] => predicate(entry[1])));
};

const dateFromLegacyState = (value: Record<string, unknown>, today: string) => {
  if (typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date)) return value.date;
  if (typeof value.lastPlayed === 'string') {
    const parsed = new Date(value.lastPlayed);
    if (!Number.isNaN(parsed.getTime())) return getLocalDateKey(parsed);
  }
  return today;
};

export const migrateGameState = (value: unknown, today = getLocalDateKey()): GameState => {
  if (!isRecord(value)) return createDefaultGameState(today);

  const savedDate = dateFromLegacyState(value, today);
  const gamesPlayed = Math.floor(finiteNumber(value.gamesPlayed));
  const storedWinRate = Math.min(finiteNumber(value.winRate), 1);
  const wins = Math.min(
    gamesPlayed,
    Math.floor(finiteNumber(value.wins, Math.round(gamesPlayed * storedWinRate))),
  );
  const currentStreak = Math.floor(finiteNumber(value.currentStreak, finiteNumber(value.streak)));
  const hints = isRecord(value.hintsUsed) ? value.hintsUsed : {};
  const isCurrentDay = savedDate === today;

  return {
    schemaVersion: 2,
    date: today,
    currentExpression: isCurrentDay && typeof value.currentExpression === 'string' ? value.currentExpression : '',
    lastPlayed: typeof value.lastPlayed === 'string' ? value.lastPlayed : null,
    settings: { theme: 'light' },
    gamesPlayed,
    wins,
    winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    currentStreak,
    maxStreak: Math.max(currentStreak, Math.floor(finiteNumber(value.maxStreak))),
    todayCompleted: isCurrentDay && value.todayCompleted === true,
    gaveUp: isCurrentDay && value.gaveUp === true,
    bestSolutions: recordOf(value.bestSolutions, (item): item is string => typeof item === 'string'),
    bestScores: recordOf(value.bestScores, (item): item is number => typeof item === 'number' && Number.isFinite(item)),
    hintsUsed: isCurrentDay
      ? { operators: stringArray(hints.operators), subtrees: stringArray(hints.subtrees) }
      : emptyHints(),
  };
};

export const startNewDay = (state: GameState, date: string): GameState => {
  if (state.date === date) return state;
  return {
    ...state,
    date,
    currentExpression: '',
    todayCompleted: false,
    gaveUp: false,
    hintsUsed: emptyHints(),
  };
};

export const completeGame = (
  state: GameState,
  outcome: GameOutcome,
  expression?: string,
): GameState => {
  if (state.todayCompleted) return state;

  const solved = outcome === 'solved';
  const gamesPlayed = state.gamesPlayed + 1;
  const wins = state.wins + (solved ? 1 : 0);
  const normalizeDate = (value: string | null) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : getLocalDateKey(parsed);
  };
  const previousDate = new Date(`${state.date}T12:00:00`);
  previousDate.setDate(previousDate.getDate() - 1);
  const continuesStreak = normalizeDate(state.lastPlayed) === getLocalDateKey(previousDate);
  const currentStreak = solved ? (continuesStreak ? state.currentStreak + 1 : 1) : 0;
  const bestSolutions = solved && expression
    ? { ...state.bestSolutions, [state.date]: expression }
    : state.bestSolutions;

  return {
    ...state,
    lastPlayed: state.date,
    gamesPlayed,
    wins,
    winRate: wins / gamesPlayed,
    currentStreak,
    maxStreak: Math.max(state.maxStreak, currentStreak),
    todayCompleted: true,
    gaveUp: !solved,
    bestSolutions,
    bestScores: solved && expression
      ? { ...state.bestScores, [state.date]: expression.replace(/\s/g, '').length }
      : state.bestScores,
  };
};
