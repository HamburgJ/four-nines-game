/**
 * Per-day play records and derived stats, backed by localStorage.
 *
 * Records are keyed by the puzzle's date string (the same UTC-based key the
 * daily generator uses). A record is "live" when the puzzle was played on its
 * own calendar day — only live solves count toward the daily streak; archive
 * solves are recorded but never extend it.
 */

export interface DayRecord {
  id: string;
  date: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  seed: number;
  target: number;
  solved: boolean;
  gaveUp: boolean;
  /** Played on its own day (counts toward the daily streak). */
  live: boolean;
  /** Number of hints revealed (0-3). */
  hintsUsed: number;
  currentExpression: string;
  startedAt?: number;
  timeMs?: number;
  expression?: string;
  symbols?: number;
  par?: number;
}

export interface GameStats {
  played: number;
  solvedCount: number;
  /** 0..1 */
  solveRate: number;
  currentStreak: number;
  maxStreak: number;
  /** Solves at par, +1, +2, +3, +4 or more over par. */
  efficiency: [number, number, number, number, number];
  noHintSolves: number;
}

const STORAGE_KEY = 'fourNinesRecords';
const LEGACY_KEY = 'gameState';

export type RecordMap = Record<string, DayRecord>;

export const loadRecords = (): RecordMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.days) return {};
    return Object.fromEntries(
      Object.entries(parsed.days as Record<string, DayRecord>).map(([key, record]) => [
        key,
        { ...record, id: record.id || key },
      ])
    );
  } catch {
    return {};
  }
};

const persist = (days: RecordMap): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, days }));
  } catch {
    // Storage full or unavailable; play on without persistence.
  }
};

export const getRecord = (id: string): DayRecord | undefined => loadRecords()[id];

export const getRecordsForDate = (records: RecordMap, date: string): DayRecord[] =>
  Object.values(records).filter((record) => record.date === date);

export const saveRecord = (record: DayRecord): void => {
  const days = loadRecords();
  days[record.id] = record;
  persist(days);
};

export const createRecord = (
  date: string,
  seed: number,
  target: number,
  id = date,
  difficulty?: DayRecord['difficulty']
): DayRecord => ({
  id,
  date,
  difficulty,
  seed,
  target,
  solved: false,
  gaveUp: false,
  live: false,
  hintsUsed: 0,
  currentExpression: '',
});

/**
 * One-time migration of the pre-records completion state (the old
 * 'gameState' key) so an in-flight day is not lost on upgrade.
 */
export const migrateLegacyState = (todayStr: string, seed: number, target: number): void => {
  const days = loadRecords();
  if (days[todayStr]) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw);
    if (!legacy || legacy.date !== todayStr) return;
    const record = createRecord(todayStr, seed, target);
    record.live = true;
    record.currentExpression = typeof legacy.currentExpression === 'string' ? legacy.currentExpression : '';
    if (legacy.todayCompleted) {
      if (legacy.gaveUp) {
        record.gaveUp = true;
      } else {
        record.solved = true;
        record.expression = record.currentExpression || undefined;
      }
    }
    const legacyHints = legacy.hintsUsed;
    if (legacyHints && typeof legacyHints === 'object') {
      const used = (legacyHints.operators?.length || 0) + (legacyHints.subtrees?.length || 0);
      record.hintsUsed = Math.min(3, used);
    }
    days[todayStr] = record;
    persist(days);
  } catch {
    // Corrupt legacy state; ignore.
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const previousDay = (dateStr: string): string =>
  new Date(Date.parse(dateStr) - DAY_MS).toISOString().split('T')[0];

const isLiveSolve = (record: DayRecord | undefined): boolean =>
  !!record && record.solved && record.live;

const isLiveSolveDate = (records: RecordMap, date: string): boolean =>
  getRecordsForDate(records, date).some(isLiveSolve);

/** Streak lengths worth an analytics event. */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 30];

/**
 * The streak length produced by a live solve on `dateStr`: 1 for the solve
 * itself plus consecutive live solves on the preceding days. `dateStr`'s own
 * record does not need to be persisted yet, so this is safe to call at the
 * moment of solving.
 */
export const streakAfterLiveSolve = (records: RecordMap, dateStr: string): number => {
  let streak = 1;
  let cursor = previousDay(dateStr);
  while (isLiveSolveDate(records, cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  return streak;
};

export const computeStats = (records: RecordMap, todayStr: string): GameStats => {
  const all = Object.values(records);
  const finished = all.filter((r) => r.solved || r.gaveUp);
  const solvedRecords = all.filter((r) => r.solved);

  // Current streak: consecutive live solves ending today (or yesterday, if
  // today has not been finished yet).
  let cursor = todayStr;
  const todayRecords = getRecordsForDate(records, todayStr);
  if (!todayRecords.some(isLiveSolve)) {
    cursor = previousDay(todayStr);
    // An unfinished (or unstarted) today keeps the streak alive; a finished
    // but unsolved today breaks it.
    if (todayRecords.length > 0 && todayRecords.every((record) => record.solved || record.gaveUp)) {
      cursor = '';
    }
  }
  let currentStreak = 0;
  while (cursor && isLiveSolveDate(records, cursor)) {
    currentStreak++;
    cursor = previousDay(cursor);
  }

  // Max streak over all live solves.
  let maxStreak = 0;
  const liveDates = [...new Set(all.filter(isLiveSolve).map((r) => r.date))].sort();
  let run = 0;
  let previous = '';
  for (const date of liveDates) {
    run = previous && previousDay(date) === previous ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    previous = date;
  }

  const efficiency: GameStats['efficiency'] = [0, 0, 0, 0, 0];
  for (const record of solvedRecords) {
    if (record.symbols === undefined || record.par === undefined) continue;
    const over = Math.max(0, record.symbols - record.par);
    efficiency[Math.min(over, 4)]++;
  }

  return {
    played: finished.length,
    solvedCount: solvedRecords.length,
    solveRate: finished.length > 0 ? solvedRecords.length / finished.length : 0,
    currentStreak,
    maxStreak,
    efficiency,
    noHintSolves: solvedRecords.filter((r) => r.hintsUsed === 0).length,
  };
};
