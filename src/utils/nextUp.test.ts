import { afterEach, describe, expect, it, vi } from 'vitest';
import { announcePause, announceResume, finishKind, onBurgerfunSite } from './nextUp';

describe('finishKind', () => {
  it('calls the lane that closes today’s set the daily solve', () => {
    expect(finishKind(false, true)).toBe('daily-solved');
  });

  it('calls an earlier lane, or any archive puzzle, a result', () => {
    expect(finishKind(false, false)).toBe('result');
    expect(finishKind(true, true)).toBe('result');
    expect(finishKind(true, false)).toBe('result');
  });
});

describe('pause events', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('dispatch burgerfun:pause with the kind and burgerfun:resume with none', () => {
    const seen: Array<[string, unknown]> = [];
    vi.stubGlobal('window', { dispatchEvent: (event: CustomEvent) => seen.push([event.type, event.detail]) });
    announcePause('daily-solved');
    announceResume();
    expect(seen).toEqual([
      ['burgerfun:pause', { kind: 'daily-solved' }],
      ['burgerfun:resume', null],
    ]);
  });

  it('are no-ops without a DOM', () => {
    expect(() => announcePause('result')).not.toThrow();
    expect(() => announceResume()).not.toThrow();
  });
});

describe('onBurgerfunSite', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false without the site script’s mark, or without a DOM', () => {
    expect(onBurgerfunSite()).toBe(false);
    vi.stubGlobal('document', { documentElement: { hasAttribute: () => false } });
    expect(onBurgerfunSite()).toBe(false);
  });

  it('is true once html[data-burger-brand] is set', () => {
    vi.stubGlobal('document', { documentElement: { hasAttribute: (name: string) => name === 'data-burger-brand' } });
    expect(onBurgerfunSite()).toBe(true);
  });
});
