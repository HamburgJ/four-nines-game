import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/global.css';

import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Play } from './pages/Play';
import { Archive } from './pages/Archive';
import { GameStateProvider } from './context/GameStateContext';

function App() {
  return (
    <GameStateProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <Navigation />
          <Container fluid className="flex-grow-1 px-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/play" element={<Play />} />
              <Route path="/play/:date" element={<Play />} />
              <Route path="/archive" element={<Archive />} />
            </Routes>
          </Container>
          <ToastContainer position="top-center" autoClose={2000} hideProgressBar closeOnClick />
        </div>
      </Router>
    </GameStateProvider>
  );
}

export default App;
