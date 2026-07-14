import { evaluate } from 'mathjs';
import generatedCatalog from '../../puzzles/puzzle_catalog.json';
import legacyScheduleData from '../../puzzles/legacy_schedule.json';

export interface PuzzleHints {
  leaf_values: string[];
  operators: string[];
  subtrees: string[];
}

export interface Puzzle {
  expression: string;
  complexity: number;
  unique_operators: number;
  par?: number;
  difficulty?: CatalogDifficulty;
  difficulty_score?: number;
  traits?: string[];
  hints: PuzzleHints;
}

type PuzzleMap = {
  [seed: string]: {
    [target: string]: Puzzle;
  };
};

const puzzleData = generatedCatalog as PuzzleMap;
const legacySchedule = legacyScheduleData as Record<string, number[]>;

export interface DailyPuzzle {
  id: string;
  seed: number;
  target: number;
  date: string;
  puzzleNumber: number;
  difficulty?: DailyDifficulty;
  solution?: Puzzle;  // The solution with hints, if available
}

export type CatalogDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type DailyDifficulty = (typeof DIFFICULTIES)[number];

// Generate a pseudo-random number between min and max (inclusive) based on a seed
const seededRandom = (seed: number, min: number, max: number): number => {
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  return Math.floor(rand * (max - min + 1)) + min;
};

// The date of puzzle #1
export const FIRST_PUZZLE_DATE = '2024-01-01';
export const GENERATED_CATALOG_START_DATE = '2026-07-14';

// Today's puzzle date key (UTC, matching the original daily scheme)
export const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

// Whether a string names a real calendar date (strict YYYY-MM-DD) inside the
// playable range [FIRST_PUZZLE_DATE, todayStr]. Guards the /play/:date route:
// getPuzzleForDateString must never be called with an unparseable date
// (Date.parse -> NaN crashes seed selection) or a rollover date like
// 2024-02-30 (which Chrome parses leniently as March 1).
export const isPlayableDateString = (dateStr: string, todayStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) return false;
  if (new Date(parsed).toISOString().split('T')[0] !== dateStr) return false;
  return dateStr >= FIRST_PUZZLE_DATE && dateStr <= todayStr;
};

const puzzleNumberForDate = (dateSeed: number): number =>
  Math.floor((dateSeed - Date.parse(FIRST_PUZZLE_DATE)) / (1000 * 60 * 60 * 24)) + 1;

const getLegacyPuzzleForDateString = (dateStr: string, dateSeed: number): DailyPuzzle => {
  const puzzleNumber = puzzleNumberForDate(dateSeed);
  const availableSeeds = Object.keys(legacySchedule).map(Number);
  const seedIndex = seededRandom(dateSeed + puzzleNumber, 0, availableSeeds.length - 1);
  const seed = availableSeeds[seedIndex];
  const availableTargets = legacySchedule[String(seed)];
  const targetIndex = seededRandom(dateSeed * 31 + puzzleNumber * 17, 0, availableTargets.length - 1);
  const target = availableTargets[targetIndex];
  const solution = puzzleData[String(seed)][String(target)];

  return {
    id: dateStr,
    seed,
    target,
    date: dateStr,
    puzzleNumber,
    difficulty: solution.difficulty === 'expert' ? 'hard' : solution.difficulty,
    solution,
  };
};

/** One deterministic puzzle in each difficulty lane for a calendar date. */
export const getPuzzlesForDateString = (dateStr: string): DailyPuzzle[] => {
  // Create a seed from the date
  const dateSeed = Date.parse(dateStr);
  if (dateStr < GENERATED_CATALOG_START_DATE) {
    return [getLegacyPuzzleForDateString(dateStr, dateSeed)];
  }

  const puzzleNumber = puzzleNumberForDate(dateSeed);
  const usedSeeds = new Set<number>();
  return DIFFICULTIES.map((difficulty, difficultyIndex) => {
    const sourceDifficulty: CatalogDifficulty = difficulty === 'hard'
      ? (seededRandom(dateSeed + puzzleNumber * 43, 0, 1) === 0 ? 'hard' : 'expert')
      : difficulty;
    const eligibleSeeds = Object.keys(puzzleData)
      .map(Number)
      .filter((seed) => Object.values(puzzleData[String(seed)]).some((puzzle) => puzzle.difficulty === sourceDifficulty));
    const firstSeedIndex = seededRandom(
      dateSeed + puzzleNumber * (29 + difficultyIndex * 11),
      0,
      eligibleSeeds.length - 1
    );
    let seed = eligibleSeeds[firstSeedIndex];
    for (let offset = 0; offset < eligibleSeeds.length && usedSeeds.has(seed); offset++) {
      seed = eligibleSeeds[(firstSeedIndex + offset + 1) % eligibleSeeds.length];
    }
    usedSeeds.add(seed);

    const targets = Object.entries(puzzleData[String(seed)])
      .filter(([, puzzle]) => puzzle.difficulty === sourceDifficulty)
      .map(([target]) => Number(target));
    const targetIndex = seededRandom(
      dateSeed * (31 + difficultyIndex * 6) + puzzleNumber * (17 + difficultyIndex * 8),
      0,
      targets.length - 1
    );
    const target = targets[targetIndex];

    return {
      id: `${dateStr}:${difficulty}`,
      seed,
      target,
      date: dateStr,
      puzzleNumber,
      difficulty,
      solution: puzzleData[String(seed)][String(target)],
    };
  });
};

// Compatibility helper: the first lane is the easy daily puzzle.
export const getPuzzleForDateString = (dateStr: string): DailyPuzzle =>
  getPuzzlesForDateString(dateStr)[0];

// Get puzzle for a specific date
export const getPuzzleForDate = (date: Date): DailyPuzzle => {
  return getPuzzleForDateString(date.toISOString().split('T')[0]);
};

// Get today's puzzle
export const getTodaysPuzzle = (): DailyPuzzle => {
  return getPuzzleForDate(new Date());
};

export const getTodaysPuzzles = (): DailyPuzzle[] =>
  getPuzzlesForDateString(getTodayDateString());

// Count occurrences of a digit in an expression
export const countDigitOccurrences = (expression: string, digit: number): number => {
  return (expression.match(new RegExp(digit.toString(), 'g')) || []).length;
};

// Calculate complexity score of an expression
export const calculateScore = (expression: string): number => {
  // Remove whitespace and count characters
  return expression.replace(/\s/g, '').length;
};

// Validate and evaluate an expression
export const validateAndEvaluate = (expression: string, puzzle: DailyPuzzle): { 
  isValid: boolean;
  value?: number;
  error?: string;
  digitCount?: number;
} => {
  if (!expression.trim()) {
    return { isValid: false, error: 'Expression is empty' };
  }

  // Count occurrences of the seed digit
  const digitCount = countDigitOccurrences(expression, puzzle.seed);
  let error = undefined;

  if (digitCount !== 4) {
    error = digitCount < 4 ? 'Not enough digits' : 'Too many digits';
  }

  // Check for invalid characters (excluding parentheses which we'll handle separately)
  if (!/^[0-9+\-*/^%()!.\ssqrt]+$/.test(expression)) {
    return { isValid: false, error: 'Invalid characters in expression' };
  }

  // Only the seed digit may be used (the rules allow no other digits)
  const foreignDigit = (expression.match(/[0-9]/g) || []).find(d => d !== puzzle.seed.toString());
  if (foreignDigit !== undefined) {
    return { isValid: false, error: `Only the digit ${puzzle.seed} can be used` };
  }

  try {
    // Balance parentheses
    let expr = expression;
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      expr = expr + ')'.repeat(openCount - closeCount);
    }

    // No need to replace sqrt - mathjs has its own sqrt function
    const value = evaluate(expr);

    // Check if result is a number
    if (typeof value !== 'number' || isNaN(value)) {
      return { isValid: false, error: 'Invalid expression' };
    }

    // Check if result equals target
    const isCorrect = Math.abs(value - puzzle.target) < 0.0001;
    if (!isCorrect && !error) {
      error = 'Not equal to target';
    }

    return { 
      isValid: isCorrect && digitCount === 4,
      value: Number(value.toFixed(6)),
      error,
      digitCount
    };
  } catch {
    return { isValid: false, error: 'Invalid expression' };
  }
};
