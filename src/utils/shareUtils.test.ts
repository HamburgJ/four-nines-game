import { describe, it, expect } from 'vitest';
import { generateShareText, formatDuration, SHARE_URL } from './shareUtils';

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(107000)).toBe('1:47');
    expect(formatDuration(5000)).toBe('0:05');
    expect(formatDuration(3 * 3600 * 1000 + 65 * 1000)).toBe('3:01:05');
  });
});

describe('generateShareText', () => {
  it('produces the compact solved block', () => {
    const text = generateShareText({
      puzzleNumber: 142,
      solved: true,
      isArchive: false,
      hintsUsed: 0,
      timeMs: 107000,
      symbols: 7,
      par: 5,
    });
    expect(text).toBe(`Four Nines #142\nSolved in 1:47 — 7 symbols (par 5)\n${SHARE_URL}`);
  });

  it('appends hint usage', () => {
    const text = generateShareText({
      puzzleNumber: 142,
      solved: true,
      isArchive: false,
      hintsUsed: 2,
      symbols: 5,
      par: 5,
    });
    expect(text).toContain('5 symbols (par) (2 hints)');
  });

  it('adds the spoiler-safe challenge line when requested', () => {
    const text = generateShareText({
      puzzleNumber: 142,
      solved: true,
      isArchive: false,
      hintsUsed: 0,
      symbols: 7,
      par: 5,
      includeChallenge: true,
    });
    expect(text).toContain('Can you find a 5-symbol solution?');
    expect(text).not.toContain('9'); // never leaks the expression
  });

  it('handles the not-solved case', () => {
    const text = generateShareText({
      puzzleNumber: 142,
      solved: false,
      isArchive: false,
      hintsUsed: 3,
      par: 4,
    });
    expect(text).toContain('Not solved — par was 4 symbols (3 hints)');
  });

  it('marks archive plays', () => {
    const text = generateShareText({
      puzzleNumber: 99,
      solved: true,
      isArchive: true,
      hintsUsed: 0,
      symbols: 3,
      par: 3,
    });
    expect(text.split('\n')[0]).toBe('Four Nines #99 (archive)');
  });

  it('contains no emoji', () => {
    const text = generateShareText({
      puzzleNumber: 142,
      solved: true,
      isArchive: false,
      hintsUsed: 1,
      timeMs: 62000,
      symbols: 6,
      par: 5,
      includeChallenge: true,
    });
    // Reject anything outside basic latin + the em dash used in the layout
    expect(/^[\x20-\x7E\n—]*$/.test(text)).toBe(true);
  });
});
