import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTIES, FIRST_PUZZLE_DATE, getPuzzlesForDateString, getTodayDateString } from '../utils/gameLogic';
import { DayRecord, loadRecords } from '../utils/records';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const LANE_TONE = { easy: 'green', medium: 'yellow', hard: 'red' } as const;

const pad = (n: number): string => n.toString().padStart(2, '0');

type LaneState = 'solved' | 'gave-up' | 'started' | 'open';

const laneState = (record: DayRecord | undefined): LaneState => {
  if (!record) return 'open';
  if (record.solved) return 'solved';
  if (record.gaveUp) return 'gave-up';
  if (record.currentExpression) return 'started';
  return 'open';
};

export const Archive = () => {
  const navigate = useNavigate();
  const todayStr = getTodayDateString();
  const records = useMemo(() => loadRecords(), []);

  const [year, setYear] = useState(() => Number(todayStr.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(todayStr.slice(5, 7))); // 1-12

  const firstYear = Number(FIRST_PUZZLE_DATE.slice(0, 4));
  const firstMonth = Number(FIRST_PUZZLE_DATE.slice(5, 7));
  const atFirstMonth = year === firstYear && month === firstMonth;
  const atCurrentMonth = year === Number(todayStr.slice(0, 4)) && month === Number(todayStr.slice(5, 7));

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

  const days = useMemo(() => {
    const out: Array<{ date: string; day: number; playable: boolean; lanes: Array<{ tone: string; state: LaneState }> }> = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const playable = date >= FIRST_PUZZLE_DATE && date <= todayStr;
      const lanes = playable
        ? getPuzzlesForDateString(date).map((puzzle) => ({
            tone: LANE_TONE[puzzle.difficulty ?? 'easy'],
            state: laneState(records[puzzle.id]),
          }))
        : [];
      out.push({ date, day, playable, lanes });
    }
    return out;
  }, [records, year, month, daysInMonth, todayStr]);

  const playableDays = days.filter((day) => day.playable);
  const fullySolved = playableDays.filter((day) => day.lanes.every((lane) => lane.state === 'solved')).length;

  return (
    <div className="fn-archive">
      <div className="fn-archive-head">
        <h1 className="nl-h2">Archive</h1>
        <p className="nl-small">
          Every past puzzle, playable. They count toward your stats; only same-day solves extend your streak.
        </p>
      </div>

      <div className="fn-month">
        <button
          type="button"
          className="fn-month-btn"
          onClick={() => changeMonth(-1)}
          disabled={atFirstMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="fn-month-label">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <button
          type="button"
          className="fn-month-btn"
          onClick={() => changeMonth(1)}
          disabled={atCurrentMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="fn-cal" role="grid" aria-label={`${MONTH_NAMES[month - 1]} ${year}`}>
        {WEEKDAYS.map((weekday, index) => (
          <div className="fn-cal-weekday" key={`${weekday}-${index}`} aria-hidden="true">
            {weekday}
          </div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, index) => (
          <div key={`pad-${index}`} aria-hidden="true" />
        ))}
        {days.map(({ date, day, playable, lanes }) => {
          if (!playable) {
            return (
              <div className="fn-cal-day is-future" key={date} aria-hidden="true">
                <span className="fn-cal-num">{day}</span>
              </div>
            );
          }
          const isToday = date === todayStr;
          const allSolved = lanes.every((lane) => lane.state === 'solved');
          const solvedCount = lanes.filter((lane) => lane.state === 'solved').length;
          return (
            <button
              type="button"
              key={date}
              className={`fn-cal-day${isToday ? ' is-today' : ''}${allSolved ? ' is-complete' : ''}`}
              onClick={() => navigate(isToday ? '/' : `/play/${date}`)}
              aria-label={`${isToday ? "Today's puzzles" : `Puzzles for ${date}`}: ${solvedCount} of ${lanes.length} solved`}
            >
              <span className="fn-cal-num">{day}</span>
              <span className="fn-cal-dots" aria-hidden="true">
                {lanes.map((lane, index) => (
                  <span key={index} className={`fn-cal-dot fn-cal-dot--${lane.tone} is-${lane.state}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fn-legend">
        {DIFFICULTIES.map((difficulty) => (
          <span key={difficulty} className="fn-legend-item">
            <span className={`fn-cal-dot fn-cal-dot--${LANE_TONE[difficulty]} is-solved`} />{' '}
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} solved
          </span>
        ))}
        <span className="fn-legend-item">
          <span className="fn-cal-dot is-open" /> Not yet
        </span>
      </div>

      <p className="fn-archive-summary nl-mono">
        {fullySolved} of {playableDays.length} days fully solved this month
      </p>
    </div>
  );
};
