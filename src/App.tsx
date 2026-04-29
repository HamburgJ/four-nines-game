import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';

import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Play } from './pages/Play';
import { GameStateProvider } from './context/GameStateContext';

function App() {
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
  }, []);

  return (
    <GameStateProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <Navigation />
          <Container fluid className="flex-grow-1 px-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/play" element={<Play />} />
            </Routes>
          </Container>
        </div>
      </Router>
    </GameStateProvider>
  );
}

export default App;
