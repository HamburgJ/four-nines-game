import ReactGA from 'react-ga4';

// import.meta.env is the Vite-safe way to read env vars in browser code
// (process.env throws "process is not defined" at runtime).
const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
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

export const logGameEvent = (action: string, label?: string, value?: number) => {
  if (!GA_ID) return;

  try {
    ReactGA.event({
      category: 'Game',
      action,
      label,
      value
    });
  } catch (error) {
    if (!isProduction) {
      console.warn('Failed to log game event:', error);
    }
  }
};

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
  logEvent('share_clicked', { context });

/** Player revealed a hint; level is 1-based (1..TOTAL_HINTS). */
export const logHintUsed = (level: number) => logEvent('hint_used', { level });

/** Player opened an archive puzzle (date is the puzzle's YYYY-MM-DD key). */
export const logArchivePlay = (date: string) => logEvent('archive_play', { date });

/** Live daily streak reached a milestone (3, 7, or 30). */
export const logStreakMilestone = (n: number) => logEvent('streak_milestone', { streak: n });

/** Player clicked a post-solve cross-promo link. */
export const logCrossPromoClick = (target: string) =>
  logEvent('cross_promo_click', { target }); 