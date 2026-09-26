import { useMemo } from 'react';
import { Sheet } from './Sheet';
import { computeStats, loadRecords } from '../utils/records';
import { getTodayDateString } from '../utils/gameLogic';

interface StatsSheetProps {
  open: boolean;
  onClose: () => void;
}

const BUCKETS = ['Par', '+1', '+2', '+3', '+4'];

export const StatsSheet = ({ open, onClose }: StatsSheetProps) => {
  // Re-read storage every time the sheet opens so a fresh solve shows up.
  const stats = useMemo(() => (open ? computeStats(loadRecords(), getTodayDateString()) : null), [open]);
  const maxBucket = stats ? Math.max(1, ...stats.efficiency) : 1;

  return (
    <Sheet open={open} onClose={onClose} title="Stats">
      {stats && (
        <>
          <dl className="fn-stat-grid">
            <div>
              <dt className="nl-label">Played</dt>
              <dd>{stats.played}</dd>
            </div>
            <div>
              <dt className="nl-label">Solved</dt>
              <dd>{Math.round(stats.solveRate * 100)}%</dd>
            </div>
            <div>
              <dt className="nl-label">Streak</dt>
              <dd className={stats.currentStreak > 0 ? 'fn-stat-hot' : undefined}>{stats.currentStreak}</dd>
            </div>
            <div>
              <dt className="nl-label">Best</dt>
              <dd>{stats.maxStreak}</dd>
            </div>
          </dl>

          <h3 className="fn-help-h">Symbols over par</h3>
          {stats.solvedCount === 0 ? (
            <p className="nl-small">Solve a puzzle and this fills in.</p>
          ) : (
            <div className="fn-hist" role="list">
              {stats.efficiency.map((count, index) => (
                <div className="fn-hist-row" role="listitem" key={BUCKETS[index]}>
                  <span className="fn-hist-label">{index === 4 ? '+4 or more' : BUCKETS[index]}</span>
                  <span className="fn-hist-track">
                    <span
                      className={`fn-hist-bar${index === 0 ? ' fn-hist-bar--par' : ''}${count === 0 ? ' fn-hist-bar--empty' : ''}`}
                      style={{ width: `${Math.max(count === 0 ? 0 : 8, (count / maxBucket) * 100)}%` }}
                    />
                  </span>
                  <span className="fn-hist-count">{count}</span>
                </div>
              ))}
            </div>
          )}
          {stats.solvedCount > 0 && (
            <p className="nl-small fn-stat-foot">
              {stats.solvedCount} solved, {stats.noHintSolves} without hints.
            </p>
          )}
        </>
      )}
    </Sheet>
  );
};
