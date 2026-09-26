import { useState } from 'react';
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import './styles/numberLab.css';
import './styles/app.css';

import { TopBar } from './components/TopBar';
import { HelpSheet } from './components/HelpSheet';
import { StatsSheet } from './components/StatsSheet';
import { Play } from './pages/Play';
import { Archive } from './pages/Archive';

const SEEN_HELP_KEY = 'fourNinesSeenHelp';

const hasSeenHelp = (): boolean => {
  try {
    return localStorage.getItem(SEEN_HELP_KEY) === '1';
  } catch {
    return true;
  }
};

function App() {
  // First visit opens the rules once; after that they live behind "?".
  const [helpOpen, setHelpOpen] = useState(() => !hasSeenHelp());
  const [statsOpen, setStatsOpen] = useState(false);

  const closeHelp = () => {
    setHelpOpen(false);
    try {
      localStorage.setItem(SEEN_HELP_KEY, '1');
    } catch {
      // Storage unavailable; the sheet will just open again next visit.
    }
  };

  return (
    <Router>
      <div className="nl fn-app">
        <TopBar onHelp={() => setHelpOpen(true)} onStats={() => setStatsOpen(true)} />
        <main className="fn-main">
          <Routes>
            <Route path="/" element={<Play onShowStats={() => setStatsOpen(true)} onShowHelp={() => setHelpOpen(true)} />} />
            <Route path="/play" element={<Navigate to="/" replace />} />
            <Route path="/play/:date" element={<Play onShowStats={() => setStatsOpen(true)} onShowHelp={() => setHelpOpen(true)} />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <HelpSheet open={helpOpen} onClose={closeHelp} />
        <StatsSheet open={statsOpen} onClose={() => setStatsOpen(false)} />
      </div>
    </Router>
  );
}

export default App;
