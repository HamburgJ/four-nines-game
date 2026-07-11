import allPuzzles from '../../puzzles/all_puzzles_with_hints.json';
import { evaluateExpression } from './expressionEvaluator';

export interface PuzzleHints {
  leaf_values: string[];
  operators: string[];
  subtrees: string[];
}

export interface Puzzle {
  expression: string;
  complexity: number;
  unique_operators: number;
  hints: PuzzleHints;
}

type PuzzleMap = {
  [seed: string]: {
    [target: string]: Puzzle;
  };
};

const puzzleData = allPuzzles as PuzzleMap;

export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMillisecondsUntilNextPuzzle = (date = new Date()): number => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  return Math.max(0, nextDay.getTime() - date.getTime());
};

export interface DailyPuzzle {
  seed: number;
  target: number;
  date: string;
  puzzleNumber: number;
  solution?: Puzzle;  // The solution with hints, if available
}

// Generate a pseudo-random number between min and max (inclusive) based on a seed
const seededRandom = (seed: number, min: number, max: number): number => {
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  return Math.floor(rand * (max - min + 1)) + min;
};

// Get puzzle for a specific date
export const getPuzzleForDate = (date: Date): DailyPuzzle => {
  // A daily puzzle follows the player's local calendar day. Using UTC here while
  // counting down to local midnight made the puzzle change hours before the timer.
  const dateStr = getLocalDateKey(date);
  
  // Create a seed from the date
  const dateSeed = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Generate puzzle number (days since Jan 1, 2024)
  const startDate = Date.UTC(2024, 0, 1);
  const puzzleNumber = Math.floor((dateSeed - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // Get all available seeds and their targets
  const availableSeeds = Object.keys(puzzleData).map(Number);
  
  // Use puzzle number to help with seed selection to ensure variety
  const seedIndex = seededRandom(dateSeed + puzzleNumber, 0, availableSeeds.length - 1);
  const seed = availableSeeds[seedIndex];
  
  // Use a different part of the date seed for target selection
  const availableTargets = Object.keys(puzzleData[seed.toString()]).map(Number);
  const targetIndex = seededRandom(dateSeed * 31 + puzzleNumber * 17, 0, availableTargets.length - 1);
  const target = availableTargets[targetIndex];

  // Get the solution with hints
  const solution = puzzleData[seed.toString()][target.toString()];

  return {
    seed,
    target,
    date: dateStr,
    puzzleNumber,
    solution
  };
};

// Get today's puzzle
export const getTodaysPuzzle = (): DailyPuzzle => {
  return getPuzzleForDate(new Date());
};

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
    console.log('Invalid characters in expression:', expression);
    return { isValid: false, error: 'Invalid characters in expression' };
  }

  try {
    // Balance parentheses
    let expr = expression;
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      expr = expr + ')'.repeat(openCount - closeCount);
    }

    console.log('Original expression:', expression);
    console.log('Balanced expression:', expr);

    // No need to replace sqrt - mathjs has its own sqrt function
    console.log('Expression to evaluate:', expr);

    const value = evaluateExpression(expr);
    console.log('Evaluated value:', value);
    
    // Check if result is a number
    if (typeof value !== 'number' || isNaN(value)) {
      console.log('Invalid result type or NaN:', value);
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
  } catch (e) {
    console.log('Evaluation error:', e);
    return { isValid: false, error: 'Invalid expression' };
  }
};
