import React, { useMemo, useState } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FIRST_PUZZLE_DATE, getPuzzlesForDateString, getTodayDateString } from '../utils/gameLogic';
import { loadRecords, DayRecord, getRecordsForDate } from '../utils/records';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number): string => n.toString().padStart(2, '0');

const cellState = (dayRecords: DayRecord[], puzzleIds: string[]): string => {
  if (dayRecords.length === 0) return 'unplayed';
  if (puzzleIds.every((id) => dayRecords.some((record) => record.id === id && record.solved))) return 'solved';
  if (puzzleIds.every((id) => dayRecords.some((record) => record.id === id && (record.solved || record.gaveUp)))) return 'gave-up';
  if (dayRecords.some((record) => record.currentExpression || record.solved || record.gaveUp)) return 'in-progress';
  return 'unplayed';
};

export const Archive: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = getTodayDateString();
  const records = useMemo(() => loadRecords(), []);

  const [year, setYear] = useState(() => Number(todayStr.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(todayStr.slice(5, 7))); // 1-12

  const firstYear = Number(FIRST_PUZZLE_DATE.slice(0, 4));
  const firstMonth = Number(FIRST_PUZZLE_DATE.slice(5, 7));
  const todayYear = Number(todayStr.slice(0, 4));
  const todayMonth = Number(todayStr.slice(5, 7));

  const atFirstMonth = year === firstYear && month === firstMonth;
  const atCurrentMonth = year === todayYear && month === todayMonth;

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    setYear(y);
    setMonth(m);
  };

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const solvedThisMonth = useMemo(() => {
    let solved = 0;
    let available = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      if (date < FIRST_PUZZLE_DATE || date > todayStr) continue;
      available++;
      const puzzleIds = getPuzzlesForDateString(date).map((puzzle) => puzzle.id);
      if (puzzleIds.every((id) => records[id]?.solved)) solved++;
    }
    return { solved, available };
  }, [records, year, month, daysInMonth, todayStr]);

  return (
    <Container className="archive-page py-3">
      <h1 className="archive-title">Archive</h1>
      <p className="archive-subtitle">
        Play any past daily puzzle. Archive solves count in your stats, but only
        same-day solves extend your streak.
      </p>

      <div className="archive-month-nav">
        <Button
          variant="link"
          className="archive-nav-button"
          onClick={() => changeMonth(-1)}
          disabled={atFirstMonth}
          aria-label="Previous month"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Button>
        <div className="archive-month-label">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <Button
          variant="link"
          className="archive-nav-button"
          onClick={() => changeMonth(1)}
          disabled={atCurrentMonth}
          aria-label="Next month"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </Button>
      </div>

      <div className="archive-grid">
        {WEEKDAYS.map((d, i) => (
          <div className="archive-weekday" key={`${d}-${i}`}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = `${year}-${pad(month)}-${pad(day)}`;
          const playable = date >= FIRST_PUZZLE_DATE && date <= todayStr;
          const isToday = date === todayStr;
          if (!playable) {
            return (
              <div className="archive-day archive-day-disabled" key={date}>
                {day}
              </div>
            );
          }
          const puzzleIds = getPuzzlesForDateString(date).map((puzzle) => puzzle.id);
          const state = cellState(getRecordsForDate(records, date), puzzleIds);
          return (
            <button
              type="button"
              key={date}
              className={`archive-day archive-day-${state} ${isToday ? 'archive-day-today' : ''}`}
              onClick={() => navigate(isToday ? '/play' : `/play/${date}`)}
              aria-label={`${isToday ? "Today's puzzle" : `Puzzle for ${date}`} (${state.replace('-', ' ')})`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="archive-legend">
        <span className="archive-legend-item">
          <span className="archive-day archive-day-solved archive-legend-swatch" /> Solved
        </span>
        <span className="archive-legend-item">
          <span className="archive-day archive-day-gave-up archive-legend-swatch" /> Given up
        </span>
        <span className="archive-legend-item">
          <span className="archive-day archive-day-unplayed archive-legend-swatch" /> Unplayed
        </span>
      </div>

      <p className="archive-month-summary">
        {solvedThisMonth.solved} of {solvedThisMonth.available} solved this month
      </p>
    </Container>
  );
};
