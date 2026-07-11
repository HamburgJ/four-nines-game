import ReactGA from 'react-ga4';

const GA_ID = import.meta.env.VITE_GA_ID || import.meta.env.CF_GA_ID;
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

export type PortfolioGameEvent =
  | 'game_view'
  | 'game_start'
  | 'meaningful_play'
  | 'game_complete'
  | 'game_fail'
  | 'share_click'
  | 'challenge_created'
  | 'challenge_accepted'
  | 'next_game_impression'
  | 'next_game_click';

type PortfolioEventParameters = Record<string, string | number | boolean | undefined>;

export const logPortfolioGameEvent = (
  action: PortfolioGameEvent,
  parameters: PortfolioEventParameters = {},
) => {
  if (!GA_ID) return;

  try {
    ReactGA.event(action, {
      game_id: 'four-nines',
      source_path: window.location.pathname,
      ...parameters,
    });
  } catch (error) {
    if (!isProduction) {
      console.warn('Failed to log portfolio event:', error);
    }
  }
};
