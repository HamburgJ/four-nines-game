import ReactGA from 'react-ga4';

// import.meta.env is the Vite-safe way to read env vars in browser code
// (process.env throws "process is not defined" at runtime). The literal is
// burgerfun.ca's public GA4 measurement id: it is the fallback so a build
// without VITE_GA_ID reports instead of silently shipping dark (which is what
// happened to /four-nines/play/ from 2026-09-03 to 2026-09-11).
const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined) || 'G-3ZP8KNH2V1';
const isProduction = import.meta.env.PROD;

export const initGA = () => {
  if (!GA_ID) {
    if (!isProduction) {
      console.log('Analytics disabled: No measurement ID available');
    }
    return;
  }

  try {
    ReactGA.initialize(GA_ID, {
      gaOptions: {
        debug_mode: !isProduction
      },
      gtagOptions: {
        // ReactGA.send below owns the initial page view. Without this, the
        // config call and the explicit send both record the same visit.
        send_page_view: false
      }
    });
    // Send initial pageview
    ReactGA.send({
      hitType: "pageview",
      page: window.location.pathname,
      title: "Four Nines - Daily Math Puzzle"
    });
  } catch (error) {
    if (!isProduction) {
      console.warn('Failed to initialize Google Analytics:', error);
    }
  }
};

export const logPageView = (page: string) => {
  if (!GA_ID) return;

  try {
    ReactGA.send({
      hitType: "pageview",
      page,
      title: "Four Nines - Daily Math Puzzle"
    });
  } catch (error) {
    if (!isProduction) {
      console.warn('Failed to log page view:', error);
    }
  }
};

// burgerfun's shared game-event taxonomy (docs/MEASUREMENT.md in the
// burgerfun repo): every game fires the same small set of snake_case event
// names with a `game` param. The old logGameEvent used react-ga4's
// category/action form, which GA4 recorded as Title-Cased event names
// ('Solve', 'Hint', 'Give-Up', 'Share') — 'Hint' and 'hint_used' were the
// same 23 clicks logged twice in the 2026-09-12 audit, and none of the four
// joined the cross-game reports. Removed; the helpers below replace it.
const GAME = 'four_nines';

/**
 * GA4-native named event with typed params. Like everything above, this
 * no-ops cleanly when no measurement ID is configured.
 */
const logEvent = (name: string, params?: Record<string, string | number>) => {
  if (!GA_ID) return;

  try {
    ReactGA.event(name, params);
  } catch (error) {
    if (!isProduction) {
      console.warn(`Failed to log ${name} event:`, error);
    }
  }
};

/** Player clicked the Share Result button (before the copy attempt resolves). */
export const logShareClicked = (context: 'daily' | 'archive') =>
  logEvent('share_clicked', { game: GAME, detail: context });

/** Player revealed a hint; level is 1-based (1..TOTAL_HINTS). */
export const logHintUsed = (level: number) => logEvent('hint_used', { game: GAME, level });

/** First keystroke into a puzzle's expression — the shared game_start moment. */
export const logGameStart = (context: 'daily' | 'archive') =>
  logEvent('game_start', { game: GAME, detail: context });

/** The puzzle was solved. `symbols` is the expression length the player used. */
export const logPuzzleSolved = (context: 'daily' | 'archive', symbols: number, hints: number) =>
  logEvent('puzzle_solved', { game: GAME, detail: context, count: symbols, hints });

/** Player gave up on the puzzle after exhausting hints. */
export const logGiveUp = (context: 'daily' | 'archive', hints: number) =>
  logEvent('give_up', { game: GAME, detail: context, hints });

/** The share text actually reached the clipboard. */
export const logShare = (context: 'daily' | 'archive') =>
  logEvent('share', { game: GAME, method: 'copy', detail: context });

/** Player opened an archive puzzle (date is the puzzle's YYYY-MM-DD key). */
export const logArchivePlay = (date: string) => logEvent('archive_play', { game: GAME, date });

/** Live daily streak reached a milestone (3, 7, or 30). */
export const logStreakMilestone = (n: number) => logEvent('streak_milestone', { game: GAME, streak: n });

/** Player clicked a post-solve cross-promo link. */
export const logCrossPromoClick = (target: string) =>
  logEvent('cross_game_click', { game: GAME, dest: target }); 