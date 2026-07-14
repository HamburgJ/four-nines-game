import { describe, it, expect } from 'vitest';
import { computeStats, previousDay, DayRecord, RecordMap } from './records';

const day = (
  date: string,
  overrides: Partial<DayRecord> = {}
): DayRecord => ({
  id: date,
  date,
  seed: 9,
  target: 42,
  solved: false,
  gaveUp: false,
  live: false,
  hintsUsed: 0,
  currentExpression: '',
  ...overrides,
});

const liveSolve = (date: string, overrides: Partial<DayRecord> = {}): DayRecord =>
  day(date, { solved: true, live: true, ...overrides });

const asMap = (records: DayRecord[]): RecordMap =>
  Object.fromEntries(records.map((r) => [r.id, r]));

const TODAY = '2026-07-11';

describe('previousDay', () => {
  it('steps back one calendar day, across month boundaries', () => {
    expect(previousDay('2026-07-11')).toBe('2026-07-10');
    expect(previousDay('2026-07-01')).toBe('2026-06-30');
    expect(previousDay('2024-03-01')).toBe('2024-02-29');
  });
});

describe('computeStats: streaks', () => {
  it('counts consecutive live solves ending today', () => {
    const stats = computeStats(
      asMap([liveSolve('2026-07-09'), liveSolve('2026-07-10'), liveSolve('2026-07-11')]),
      TODAY
    );
    expect(stats.currentStreak).toBe(3);
    expect(stats.maxStreak).toBe(3);
  });

  it('keeps the streak alive while today is still unplayed', () => {
    const stats = computeStats(asMap([liveSolve('2026-07-09'), liveSolve('2026-07-10')]), TODAY);
    expect(stats.currentStreak).toBe(2);
  });

  it('breaks the streak when today was given up', () => {
    const stats = computeStats(
      asMap([liveSolve('2026-07-10'), day('2026-07-11', { gaveUp: true, live: true })]),
      TODAY
    );
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(1);
  });

  it('does not extend the streak with archive solves', () => {
    const stats = computeStats(
      asMap([
        liveSolve('2026-07-10'),
        liveSolve('2026-07-11'),
        day('2026-07-09', { solved: true, live: false }), // solved later from the archive
      ]),
      TODAY
    );
    expect(stats.currentStreak).toBe(2);
    expect(stats.maxStreak).toBe(2);
    expect(stats.solvedCount).toBe(3);
  });

  it('finds the max streak in the past', () => {
    const stats = computeStats(
      asMap([
        liveSolve('2026-06-01'),
        liveSolve('2026-06-02'),
        liveSolve('2026-06-03'),
        liveSolve('2026-06-04'),
        liveSolve('2026-07-11'),
      ]),
      TODAY
    );
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(4);
  });
});

describe('computeStats: rates and histogram', () => {
  it('computes played count and solve rate from finished days only', () => {
    const stats = computeStats(
      asMap([
        liveSolve('2026-07-09'),
        day('2026-07-10', { gaveUp: true, live: true }),
        day('2026-07-11', { currentExpression: '9+9' }), // in progress, not played yet
      ]),
      TODAY
    );
    expect(stats.played).toBe(2);
    expect(stats.solvedCount).toBe(1);
    expect(stats.solveRate).toBeCloseTo(0.5);
  });

  it('buckets solves by symbols over par', () => {
    const stats = computeStats(
      asMap([
        liveSolve('2026-07-01', { symbols: 3, par: 3 }),
        liveSolve('2026-07-02', { symbols: 4, par: 3 }),
        liveSolve('2026-07-03', { symbols: 5, par: 3 }),
        liveSolve('2026-07-04', { symbols: 9, par: 3 }),
        liveSolve('2026-07-05', { symbols: 2, par: 3 }), // beat par; counts as at-par
      ]),
      TODAY
    );
    expect(stats.efficiency).toEqual([2, 1, 1, 0, 1]);
  });

  it('counts hint-free solves', () => {
    const stats = computeStats(
      asMap([liveSolve('2026-07-10', { hintsUsed: 2 }), liveSolve('2026-07-11')]),
      TODAY
    );
    expect(stats.noHintSolves).toBe(1);
  });
});
