import { Link, useLocation } from 'react-router-dom';

interface TopBarProps {
  onHelp: () => void;
  onStats: () => void;
}

// The landing page lives outside this hash-routed app, one level up from the
// vendored /four-nines/play/ build.
const LANDING_URL = '/four-nines/';

export const TopBar = ({ onHelp, onStats }: TopBarProps) => {
  const { pathname } = useLocation();
  const onArchive = pathname.startsWith('/archive');

  return (
    <header className="fn-topbar">
      {/* burgerfun.ca's shared logo moves in here; empty (and hidden) anywhere else. */}
      <span className="fn-brand-slot" data-burger-brand-slot="" />
      <a className="fn-wordmark" href={LANDING_URL} aria-label="Four Nines home">
        <span className="fn-wordmark-text">Four Nines</span>
      </a>
      <nav className="fn-topnav" aria-label="Game">
        {onArchive ? (
          <Link className="fn-topbtn" to="/">
            Today
          </Link>
        ) : (
          <Link className="fn-topbtn" to="/archive">
            Archive
          </Link>
        )}
        <button type="button" className="fn-topbtn" onClick={onStats}>
          Stats
        </button>
        <button type="button" className="fn-topbtn fn-topbtn--icon" onClick={onHelp} aria-label="How to play">
          ?
        </button>
      </nav>
    </header>
  );
};
