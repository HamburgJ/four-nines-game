import { useState } from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faSun, faMoon, faChartColumn, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../hooks/useTheme';
import { SettingsModal } from './SettingsModal';
import { InfoModal } from './InfoModal';
import { StatsModal } from './StatsModal';

export const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <>
      <Navbar className="px-3">
        <Navbar.Brand as={Link} to="/" className="game-title me-auto">Four Nines</Navbar.Brand>
        <Nav className="nav-icons">
          <Link to="/archive" className="nav-link" aria-label="Puzzle archive">
            <FontAwesomeIcon icon={faCalendarDays} />
          </Link>
          <Button
            variant="link"
            className="nav-link"
            onClick={() => setShowStats(true)}
            aria-label="Statistics"
          >
            <FontAwesomeIcon icon={faChartColumn} />
          </Button>
          <Button
            variant="link"
            onClick={toggleTheme}
            className="nav-link"
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
          </Button>
          <Button
            variant="link"
            className="nav-link"
            onClick={() => setShowInfo(true)}
            aria-label="Information"
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </Button>
          {/*
          <Button
            variant="link"
            className="nav-link"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            <FontAwesomeIcon icon={faCog} />
          </Button>
          */}
        </Nav>
      </Navbar>

      <SettingsModal show={showSettings} onHide={() => setShowSettings(false)} />
      <InfoModal show={showInfo} onHide={() => setShowInfo(false)} />
      <StatsModal show={showStats} onHide={() => setShowStats(false)} />
    </>
  );
}; 