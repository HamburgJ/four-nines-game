/**
 * burgerfun.ca's "Next up" row. On the site, the injected site script marks
 * <html data-burger-brand> and /shared/next.js defines <burger-next-cards> and
 * listens for these pause events. Anywhere else (the game repo's own host, a
 * local dev server) nothing listens, the events are no-ops and the page keeps
 * its own CrossPromo strip.
 */

export type PauseKind = 'result' | 'daily-solved';

const announce = (type: 'burgerfun:pause' | 'burgerfun:resume', detail?: { kind: PauseKind }) => {
  try {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  } catch {
    // No DOM (tests): nothing is listening.
  }
};

/**
 * The pause a finished lane is: the lane that closes today's set is the daily
 * solve; any other finish (an earlier lane, an archive puzzle) is a result.
 */
export const finishKind = (isArchive: boolean, setDone: boolean): PauseKind =>
  !isArchive && setDone ? 'daily-solved' : 'result';

/** A lane just finished (solved or given up). */
export const announcePause = (kind: PauseKind) => announce('burgerfun:pause', { kind });

/** Play restarted on an open lane. */
export const announceResume = () => announce('burgerfun:resume');

/** True once the site script has run on this document (burgerfun.ca only). */
export const onBurgerfunSite = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.hasAttribute('data-burger-brand');

/** Notify when the site script marks the document (it runs after this app). */
export const subscribeSiteBrand = (onChange: () => void): (() => void) => {
  if (typeof MutationObserver === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-burger-brand'] });
  return () => observer.disconnect();
};
