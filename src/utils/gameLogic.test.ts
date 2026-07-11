import { describe, expect, it } from 'vitest';
import { getLocalDateKey, getMillisecondsUntilNextPuzzle, getPuzzleForDate } from './gameLogic';

describe('daily puzzle calendar', () => {
  it('uses the local calendar date', () => {
    const lateEvening = new Date(2026, 6, 11, 23, 30);
    expect(getLocalDateKey(lateEvening)).toBe('2026-07-11');
    expect(getPuzzleForDate(lateEvening).date).toBe('2026-07-11');
  });

  it('keeps puzzle numbers consecutive across daylight-saving boundaries', () => {
    const before = getPuzzleForDate(new Date(2026, 2, 7, 12));
    const after = getPuzzleForDate(new Date(2026, 2, 8, 12));
    expect(after.puzzleNumber - before.puzzleNumber).toBe(1);
  });

  it('counts down to the same local midnight that changes the puzzle', () => {
    const now = new Date(2026, 6, 11, 23, 59, 30);
    expect(getMillisecondsUntilNextPuzzle(now)).toBe(30_000);
  });
});
