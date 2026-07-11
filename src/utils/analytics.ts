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