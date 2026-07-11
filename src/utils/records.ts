/**
 * Per-day play records and derived stats, backed by localStorage.
 *
 * Records are keyed by the puzzle's date string (the same UTC-based key the
 * daily generator uses). A record is "live" when the puzzle was played on its
 * own calendar day — only live solves count toward the daily streak; archive
 * solves are recorded but never extend it.
 */

export interface DayRecord {
  date: string;
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
    return parsed && typeof parsed === 'object' && parsed.days ? parsed.days : {};
  } catch {
    return {};
  }
};

const persist = (days: RecordMap): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, days }));
  } catch {
    // Storage full or unavailable; play on without persistence.
  }
};

export const getRecord = (date: string): DayRecord | undefined => loadRecords()[date];

export const saveRecord = (record: DayRecord): void => {
  const days = loadRecords();
  days[record.date] = record;
  persist(days);
};

export const createRecord = (date: string, seed: number, target: number): DayRecord => ({
  date,
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

export const computeStats = (records: RecordMap, todayStr: string): GameStats => {
  const all = Object.values(records);
  const finished = all.filter((r) => r.solved || r.gaveUp);
  const solvedRecords = all.filter((r) => r.solved);

  // Current streak: consecutive live solves ending today (or yesterday, if
  // today has not been finished yet).
  let cursor = todayStr;
  const today = records[todayStr];
  if (!isLiveSolve(today)) {
    cursor = previousDay(todayStr);
    // An unfinished (or unstarted) today keeps the streak alive; a finished
    // but unsolved today breaks it.
    if (today && (today.solved || today.gaveUp)) {
      cursor = '';
    }
  }
  let currentStreak = 0;
  while (cursor && isLiveSolve(records[cursor])) {
    currentStreak++;
    cursor = previousDay(cursor);
  }

  // Max streak over all live solves.
  let maxStreak = 0;
  const liveDates = all.filter(isLiveSolve).map((r) => r.date).sort();
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
