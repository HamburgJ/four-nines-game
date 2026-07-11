import { describe, expect, it } from 'vitest';
import { completeGame, createDefaultGameState, migrateGameState, startNewDay } from './gameState';

describe('game state persistence', () => {
  it('recovers safely from an invalid saved value', () => {
    expect(migrateGameState(null, '2026-07-11')).toEqual(createDefaultGameState('2026-07-11'));
  });

  it('migrates the legacy play-hook schema without losing stats', () => {
    const migrated = migrateGameState({
      date: '2026-07-11',
      currentExpression: '9+9',
      gamesPlayed: 10,
      winRate: 0.7,
      currentStreak: 3,
      maxStreak: 5,
      todayCompleted: true,
      gaveUp: false,
      hintsUsed: { operators: ['+'], subtrees: [] },
    }, '2026-07-11');

    expect(migrated).toMatchObject({
      schemaVersion: 2,
      date: '2026-07-11',
      gamesPlayed: 10,
      wins: 7,
      winRate: 0.7,
      currentStreak: 3,
      todayCompleted: true,
    });
  });

  it('starts a new day without erasing lifetime progress', () => {
    const state = {
      ...createDefaultGameState('2026-07-10'),
      gamesPlayed: 4,
      wins: 3,
      todayCompleted: true,
      gaveUp: true,
      currentExpression: '9+9+9+9',
    };

    expect(startNewDay(state, '2026-07-11')).toMatchObject({
      date: '2026-07-11',
      gamesPlayed: 4,
      wins: 3,
      todayCompleted: false,
      gaveUp: false,
      currentExpression: '',
    });
  });
});

describe('game completion', () => {
  it('records a win once and advances a consecutive-day streak', () => {
    const state = {
      ...createDefaultGameState('2026-07-11'),
      lastPlayed: '2026-07-10',
      gamesPlayed: 2,
      wins: 1,
      currentStreak: 1,
      maxStreak: 1,
    };
    const completed = completeGame(state, 'solved', '9 + 9 + 9 + 9');

    expect(completed).toMatchObject({
      gamesPlayed: 3,
      wins: 2,
      winRate: 2 / 3,
      currentStreak: 2,
      maxStreak: 2,
      todayCompleted: true,
      gaveUp: false,
    });
    expect(completed.bestSolutions['2026-07-11']).toBe('9 + 9 + 9 + 9');
    expect(completeGame(completed, 'solved')).toBe(completed);
  });

  it('starts a new streak after a missed day and resets it after giving up', () => {
    const stale = {
      ...createDefaultGameState('2026-07-11'),
      lastPlayed: '2026-07-08',
      currentStreak: 8,
    };
    expect(completeGame(stale, 'solved').currentStreak).toBe(1);
    expect(completeGame(stale, 'gave_up').currentStreak).toBe(0);
  });
});
