import { describe, it, expect } from 'vitest';
import {
  getPuzzleForDate,
  getPuzzleForDateString,
  getPuzzlesForDateString,
  validateAndEvaluate,
  isPlayableDateString,
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

  it('serves easy, medium, and hard every day after the catalog cutover', () => {
    const hardSources = new Set<string>();
    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(Date.parse('2026-07-14') + offset * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0];
      const puzzles = getPuzzlesForDateString(date);
      expect(puzzles.map((puzzle) => puzzle.difficulty)).toEqual(['easy', 'medium', 'hard']);
      expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(3);
      expect(new Set(puzzles.map((puzzle) => puzzle.seed)).size).toBe(3);
      hardSources.add(puzzles[2].solution!.difficulty!);
    }
    expect(hardSources).toEqual(new Set(['hard', 'expert']));
  });

  it('keeps one legacy puzzle per archived day before the cutover', () => {
    expect(getPuzzlesForDateString('2026-07-13')).toHaveLength(1);
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

describe('isPlayableDateString', () => {
  const today = '2026-07-11';

  it('accepts real dates inside the playable range', () => {
    expect(isPlayableDateString(FIRST_PUZZLE_DATE, today)).toBe(true);
    expect(isPlayableDateString('2025-02-28', today)).toBe(true);
    expect(isPlayableDateString('2024-02-29', today)).toBe(true); // leap day
    expect(isPlayableDateString(today, today)).toBe(true);
  });

  it('rejects dates outside the range', () => {
    expect(isPlayableDateString('2023-12-31', today)).toBe(false);
    expect(isPlayableDateString('2026-07-12', today)).toBe(false);
  });

  it('rejects unparseable strings that would crash puzzle generation', () => {
    expect(isPlayableDateString('not-a-date', today)).toBe(false);
    expect(isPlayableDateString('2024-99-99', today)).toBe(false);
    expect(isPlayableDateString('9999-99-99', today)).toBe(false);
  });

  it('rejects rollover dates that Chrome parses leniently', () => {
    expect(isPlayableDateString('2024-02-30', today)).toBe(false);
    expect(isPlayableDateString('2025-04-31', today)).toBe(false);
    expect(isPlayableDateString('2025-02-29', today)).toBe(false); // not a leap year
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
