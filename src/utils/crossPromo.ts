/**
 * Post-solve cross-promo: a quiet strip of other games shown after the daily
 * result panel. Pure rotation logic lives here so it can be unit tested.
 */

export interface PromoTarget {
  /** Stable identifier reported to analytics. */
  id: string;
  name: string;
  url: string;
  /** One dry line, matching the target game's tone. */
  blurb: string;
}

export const PROMO_TARGETS: PromoTarget[] = [
  {
    id: 'win-or-die',
    name: 'WIN OR DIE',
    url: 'https://burgerfun.ca/win-or-die/',
    blurb: 'Twenty rooms, one hint each, no sympathy.',
  },
  {
    id: 'attention',
    name: 'Attention',
    url: 'https://burgerfun.ca/attention/',
    blurb: 'A game that wants exactly one thing from you.',
  },
  {
    id: 'this-game-will-piss-you-off',
    name: 'This Game Will Piss You Off',
    url: 'https://burgerfun.ca/this-game-will-piss-you-off/',
    blurb: 'The title is a promise, not a warning.',
  },
  {
    id: 'weird-browser-games',
    name: 'Weird Browser Games',
    url: 'https://burgerfun.ca/weird-browser-games/',
    blurb: 'The rest of the shelf, catalogued.',
  },
];

export const PROMO_PICK_COUNT = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Day index for a YYYY-MM-DD date string (UTC, same convention as the daily
 * puzzle keys). Returns 0 for unparseable input so the picker still works.
 */
export const dayIndexForDate = (dateStr: string): number => {
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) return 0;
  return Math.floor(parsed / DAY_MS);
};

/**
 * Deterministically pick PROMO_PICK_COUNT consecutive targets for a given
 * date. The start index advances one slot per day, so over targets.length
 * days every target appears (twice, in fact) and adjacent days never show
 * the identical pair.
 */
export const pickPromos = (
  dateStr: string,
  targets: PromoTarget[] = PROMO_TARGETS
): PromoTarget[] => {
  if (targets.length === 0) return [];
  const count = Math.min(PROMO_PICK_COUNT, targets.length);
  const start = ((dayIndexForDate(dateStr) % targets.length) + targets.length) % targets.length;
  return Array.from({ length: count }, (_, i) => targets[(start + i) % targets.length]);
};
