import React, { useMemo } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { loadRecords, computeStats } from '../utils/records';
import { getTodayDateString } from '../utils/gameLogic';

interface StatsModalProps {
  show: boolean;
  onHide: () => void;
}

const EFFICIENCY_LABELS = ['Par', '+1', '+2', '+3', '+4 or more'];

export const StatsModal: React.FC<StatsModalProps> = ({ show, onHide }) => {
  const stats = useMemo(() => {
    if (!show) return null;
    return computeStats(loadRecords(), getTodayDateString());
  }, [show]);

  if (!stats) return null;

  const maxBucket = Math.max(1, ...stats.efficiency);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Statistics</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{stats.played}</div>
            <div className="stat-label">Played</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Math.round(stats.solveRate * 100)}%</div>
            <div className="stat-label">Solve Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.currentStreak}</div>
            <div className="stat-label">Streak</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.maxStreak}</div>
            <div className="stat-label">Max Streak</div>
          </div>
        </div>

        <h6 className="histogram-title">Symbols Over Par</h6>
        {stats.solvedCount === 0 ? (
          <p className="histogram-empty">Solve a puzzle to start your histogram.</p>
        ) : (
          <div className="histogram">
            {stats.efficiency.map((count, i) => (
              <div className="histogram-row" key={EFFICIENCY_LABELS[i]}>
                <div className="histogram-label">{EFFICIENCY_LABELS[i]}</div>
                <div className="histogram-track">
                  <div
                    className={`histogram-bar ${count > 0 ? '' : 'histogram-bar-empty'}`}
                    style={{ width: `${Math.max(7, (count / maxBucket) * 100)}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {stats.solvedCount > 0 && (
          <p className="stats-footnote">
            {stats.solvedCount} solved, {stats.noHintSolves} without hints
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
