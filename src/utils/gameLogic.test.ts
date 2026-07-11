import { describe, it, expect } from 'vitest';
import {
  getPuzzleForDate,
  getPuzzleForDateString,
  validateAndEvaluate,
  FIRST_PUZZLE_DATE,
} from './gameLogic';
import { getParInfo } from './parData';

describe('daily puzzle generation', () => {
  it('is deterministic for a date string', () => {
    const a = getPuzzleForDateString('2025-03-15');
    const b = getPuzzleForDateString('2025-03-15');
    expect(a).toEqual(b);
    expect(a.date).toBe('2025-03-15');
  });

  it('matches the original Date-based generation (archive = same scheme)', () => {
    for (const iso of ['2024-01-01T05:00:00Z', '2025-06-30T23:10:00Z', '2026-07-11T00:00:01Z']) {
      const date = new Date(iso);
      const fromDate = getPuzzleForDate(date);
      const fromString = getPuzzleForDateString(iso.split('T')[0]);
      expect(fromDate).toEqual(fromString);
    }
  });

  it('numbers puzzles from the first puzzle date', () => {
    expect(getPuzzleForDateString(FIRST_PUZZLE_DATE).puzzleNumber).toBe(1);
    expect(getPuzzleForDateString('2024-01-02').puzzleNumber).toBe(2);
  });

  it('every day for a year has a puzzle with a known par', () => {
    for (let offset = 0; offset < 366; offset++) {
      const date = new Date(Date.parse('2026-01-01') + offset * 24 * 3600 * 1000);
      const puzzle = getPuzzleForDateString(date.toISOString().split('T')[0]);
      expect(puzzle.solution, puzzle.date).toBeDefined();
      const par = getParInfo(puzzle.seed, puzzle.target);
      expect(par, `${puzzle.date}: seed ${puzzle.seed} target ${puzzle.target}`).toBeDefined();
      expect(par!.par).toBeGreaterThan(0);
    }
  });
});

describe('validateAndEvaluate', () => {
  const puzzle = getPuzzleForDateString('2025-03-15');

  it('rejects digits other than the seed', () => {
    const foreign = puzzle.seed === 1 ? '2' : '1';
    const result = validateAndEvaluate(
      `${puzzle.seed}+${puzzle.seed}+${puzzle.seed}+${puzzle.seed}+${foreign}`,
      puzzle
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Only the digit');
  });

  it('accepts the known par solution', () => {
    const par = getParInfo(puzzle.seed, puzzle.target)!;
    const result = validateAndEvaluate(par.expression, puzzle);
    expect(result.isValid).toBe(true);
    expect(result.value).toBeCloseTo(puzzle.target, 4);
  });
});
