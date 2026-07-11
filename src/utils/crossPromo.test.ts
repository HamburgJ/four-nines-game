import { describe, it, expect } from 'vitest';
import {
  PROMO_TARGETS,
  PROMO_PICK_COUNT,
  pickPromos,
  dayIndexForDate,
} from './crossPromo';

describe('PROMO_TARGETS', () => {
  it('has unique ids and absolute burgerfun URLs', () => {
    const ids = PROMO_TARGETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const target of PROMO_TARGETS) {
      expect(target.url).toMatch(/^https:\/\/burgerfun\.ca\/.+\/$/);
      expect(target.name.length).toBeGreaterThan(0);
      expect(target.blurb.length).toBeGreaterThan(0);
    }
  });

  it('contains no emoji in user-facing text', () => {
    // Hard rule: no emojis in on-screen UI.
    const emoji = /\p{Extended_Pictographic}/u;
    for (const target of PROMO_TARGETS) {
      expect(emoji.test(target.name)).toBe(false);
      expect(emoji.test(target.blurb)).toBe(false);
    }
  });
});

describe('dayIndexForDate', () => {
  it('advances by one per day', () => {
    expect(dayIndexForDate('2026-07-11') - dayIndexForDate('2026-07-10')).toBe(1);
    expect(dayIndexForDate('2026-08-01') - dayIndexForDate('2026-07-31')).toBe(1);
  });

  it('falls back to 0 for unparseable dates', () => {
    expect(dayIndexForDate('not-a-date')).toBe(0);
  });
});

describe('pickPromos', () => {
  it('returns exactly two distinct targets', () => {
    const picks = pickPromos('2026-07-11');
    expect(picks).toHaveLength(PROMO_PICK_COUNT);
    expect(picks[0].id).not.toBe(picks[1].id);
  });

  it('is deterministic for the same date', () => {
    expect(pickPromos('2026-07-11')).toEqual(pickPromos('2026-07-11'));
  });

  it('rotates so consecutive days never show the identical pair', () => {
    const a = pickPromos('2026-07-11').map((t) => t.id).join(',');
    const b = pickPromos('2026-07-12').map((t) => t.id).join(',');
    expect(a).not.toBe(b);
  });

  it('shows every target within a full cycle of days', () => {
    const seen = new Set<string>();
    const base = Date.parse('2026-07-01');
    for (let i = 0; i < PROMO_TARGETS.length; i++) {
      const date = new Date(base + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      for (const pick of pickPromos(date)) seen.add(pick.id);
    }
    expect(seen.size).toBe(PROMO_TARGETS.length);
  });

  it('handles unparseable dates without throwing', () => {
    const picks = pickPromos('garbage');
    expect(picks).toHaveLength(PROMO_PICK_COUNT);
  });

  it('caps the pick count for short target lists', () => {
    const solo = [PROMO_TARGETS[0]];
    expect(pickPromos('2026-07-11', solo)).toEqual(solo);
    expect(pickPromos('2026-07-11', [])).toEqual([]);
  });
});
