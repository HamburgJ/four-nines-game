import { evaluate } from 'mathjs';
import allPuzzles from '../../puzzles/all_puzzles_with_hints.json';

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
  // Convert date to YYYY-MM-DD format
  const dateStr = date.toISOString().split('T')[0];
  
  // Create a seed from the date
  const dateSeed = Date.parse(dateStr);
  
  // Generate puzzle number (days since Jan 1, 2024)
  const startDate = new Date('2024-01-01');
  const puzzleNumber = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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
  if (!/^[0-9+\-*/^%()!.\s]+$/.test(expression)) {
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

    // Replace sqrt with Math.sqrt for mathjs
    const normalizedExpr = expr.replace(/sqrt/g, 'Math.sqrt');
    const value = evaluate(normalizedExpr);
    
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
  } catch (e) {
    return { isValid: false, error: 'Invalid expression' };
  }
}; 