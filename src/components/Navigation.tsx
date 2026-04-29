import { useState } from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { InfoModal } from './InfoModal';

export const Navigation = () => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <Navbar className="app-nav">
        <Navbar.Brand as={Link} to="/" className="game-title me-auto">
          Four Nines
        </Navbar.Brand>
        <Nav className="nav-icons">
          <Button
            variant="link"
            className="nav-link"
            onClick={() => setShowInfo(true)}
            aria-label="Information"
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </Button>
        </Nav>
      </Navbar>

      <InfoModal show={showInfo} onHide={() => setShowInfo(false)} />
    </>
  );
}; 
