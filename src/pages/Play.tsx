import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  DIFFICULTIES,
  DailyDifficulty,
  DailyPuzzle,
  countDigitOccurrences,
  getPuzzlesForDateString,
  getTodayDateString,
  isPlayableDateString,
  validateAndEvaluate,
} from '../utils/gameLogic';
import { countSymbols } from '../utils/solver';
import { TOTAL_HINTS, buildHints, getParInfo } from '../utils/parData';
import {
  DayRecord,
  STREAK_MILESTONES,
  computeStats,
  createRecord,
  getRecord,
  loadRecords,
  migrateLegacyState,
  saveRecord,
  streakAfterLiveSolve,
} from '../utils/records';
import { copyShareText, formatDuration, generateShareText } from '../utils/shareUtils';
import {
  logArchivePlay,
  logGameStart,
  logGiveUp,
  logHintUsed,
  logPuzzleSolved,
  logShare,
  logShareClicked,
  logStreakMilestone,
} from '../utils/analytics';
import { DigitPips, ExpressionCalculator, SevenSegment } from '../components/Calculator';
import { type KeySpec, prettyExpression } from '../components/expression';
import { CrossPromo } from '../components/CrossPromo';
import { Sheet } from '../components/Sheet';

const LANE_TONE: Record<DailyDifficulty, 'green' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const MAX_REPORTED_TIME_MS = 3 * 60 * 60 * 1000;

const initRecord = (puzzle: DailyPuzzle, live: boolean): DayRecord => {
  if (live) {
    migrateLegacyState(puzzle.date, puzzle.seed, puzzle.target);
  }
  const existing = getRecord(puzzle.id);
  if (existing) return existing;
  const record = createRecord(puzzle.date, puzzle.seed, puzzle.target, puzzle.id, puzzle.difficulty);
  saveRecord(record);
  return record;
};

const statusOf = (record: DayRecord | undefined): 'open' | 'solved' | 'gave-up' => {
  if (record?.solved) return 'solved';
  if (record?.gaveUp) return 'gave-up';
  return 'open';
};

/** Fit a value into the eight-digit LCD. */
const formatLcd = (value: number): string => {
  if (!Number.isFinite(value)) return 'Error';
  const plain = String(Number(value.toFixed(6)));
  if (plain.replace(/[-.]/g, '').length <= 8) return plain;
  const intDigits = Math.trunc(Math.abs(value)).toString().length;
  if (intDigits < 8) return String(Number(value.toFixed(8 - intDigits)));
  return value.toExponential(2).replace('e+', 'E').replace('e', 'E');
};

/** Milliseconds until the next UTC midnight — puzzle dates are UTC. */
const msUntilNextUtcMidnight = (now: Date): number => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
};

const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
};

const formatDate = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

interface PlayProps {
  onShowStats: () => void;
  onShowHelp: () => void;
}

export const Play = ({ onShowStats, onShowHelp }: PlayProps) => {
  const { date: dateParam } = useParams<{ date: string }>();
  const todayStr = getTodayDateString();
  // Validate BEFORE computing the puzzle: unparseable or rollover dates
  // (2024-02-30) would crash seed selection or create phantom puzzles. When
  // invalid, fall back to today so the hooks stay safe; the <Navigate> guard
  // before render then redirects.
  const validDate = !dateParam || isPlayableDateString(dateParam, todayStr);
  const dateStr = validDate && dateParam ? dateParam : todayStr;
  const isArchive = dateStr !== todayStr;
  const context = isArchive ? 'archive' : 'daily';

  const puzzleSet = useMemo(() => getPuzzlesForDateString(dateStr), [dateStr]);

  // Land on the first lane you haven't finished yet.
  const [selectedDifficulty, setSelectedDifficulty] = useState<DailyDifficulty>(() => {
    const open = puzzleSet.find((candidate) => statusOf(getRecord(candidate.id)) === 'open');
    return open?.difficulty ?? 'easy';
  });
  const puzzle = puzzleSet.find((candidate) => candidate.difficulty === selectedDifficulty) || puzzleSet[0];
  const parInfo = useMemo(() => getParInfo(puzzle.seed, puzzle.target), [puzzle.seed, puzzle.target]);
  const hints = useMemo(() => (parInfo ? buildHints(parInfo) : []), [parInfo]);

  const [record, setRecord] = useState<DayRecord>(() => initRecord(puzzle, !isArchive));
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [includeChallenge, setIncludeChallenge] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [countdown, setCountdown] = useState('');
  const [justFinished, setJustFinished] = useState(false);
  const tapeRef = useRef<HTMLDivElement>(null);

  // Reload the record when the puzzle changes (lane switch, archive
  // navigation, day rollover). Adjusting state during render is React's
  // recommended way to reset state on a changed key.
  const [trackedPuzzleId, setTrackedPuzzleId] = useState(puzzle.id);
  if (trackedPuzzleId !== puzzle.id) {
    setTrackedPuzzleId(puzzle.id);
    setRecord(initRecord(puzzle, !isArchive));
    setCopyState('idle');
    setJustFinished(false);
  }

  const finished = record.solved || record.gaveUp;
  const expression = record.currentExpression;
  const evaluation = useMemo(
    () => (expression.trim() && !finished ? validateAndEvaluate(expression, puzzle) : null),
    [expression, finished, puzzle],
  );
  const digitsUsed = countDigitOccurrences(expression, puzzle.seed);
  const liveSymbols = countSymbols(expression);
  const par = record.par ?? parInfo?.par;

  useEffect(() => {
    if (isArchive) logArchivePlay(puzzle.date);
  }, [puzzle.date, isArchive]);

  // Countdown to the next daily set, once today's lane is done.
  useEffect(() => {
    if (!finished || isArchive) return undefined;
    const tick = () => setCountdown(formatCountdown(msUntilNextUtcMidnight(new Date())));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [finished, isArchive]);

  // Bring the freshly printed tape into view on short screens.
  useEffect(() => {
    if (!justFinished) return;
    const timer = window.setTimeout(() => {
      tapeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 380);
    return () => window.clearTimeout(timer);
  }, [justFinished]);

  const updateRecord = (patch: Partial<DayRecord>) => {
    setRecord((current) => {
      const next = { ...current, ...patch };
      saveRecord(next);
      return next;
    });
  };

  const finalizeSolve = (solution: string, startedAt: number | undefined) => {
    const symbols = countSymbols(solution);
    // Never report a par above what the player just achieved: their solution
    // is proof of achievability.
    const solvedPar = parInfo ? Math.min(parInfo.par, symbols) : undefined;
    if (!isArchive) {
      // Check before saving: streakAfterLiveSolve doesn't need today's record.
      const records = loadRecords();
      const alreadySolvedToday = Object.values(records).some(
        (saved) => saved.date === puzzle.date && saved.solved && saved.live,
      );
      const streak = streakAfterLiveSolve(records, puzzle.date);
      if (!alreadySolvedToday && STREAK_MILESTONES.includes(streak)) {
        logStreakMilestone(streak);
      }
    }
    updateRecord({
      currentExpression: solution,
      startedAt,
      solved: true,
      gaveUp: false,
      live: !isArchive,
      expression: solution,
      symbols,
      par: solvedPar,
      timeMs: startedAt !== undefined ? Date.now() - startedAt : undefined,
    });
    logPuzzleSolved(context, symbols, record.hintsUsed);
    setJustFinished(true);
  };

  const handleExpression = (next: string) => {
    if (finished) return;
    if (record.startedAt === undefined && next.trim()) logGameStart(context);
    const startedAt = record.startedAt ?? Date.now();
    const result = next.trim() ? validateAndEvaluate(next, puzzle) : null;
    if (result?.isValid && result.value === puzzle.target) {
      finalizeSolve(next, startedAt);
      return;
    }
    updateRecord({ currentExpression: next, startedAt });
  };

  const revealHint = () => {
    if (record.hintsUsed >= TOTAL_HINTS || hints.length === 0) return;
    updateRecord({ hintsUsed: record.hintsUsed + 1 });
    logHintUsed(record.hintsUsed + 1);
  };

  const giveUp = () => {
    setConfirmGiveUp(false);
    updateRecord({ gaveUp: true, solved: false, live: !isArchive, par: parInfo?.par });
    logGiveUp(context, record.hintsUsed);
    setJustFinished(true);
  };

  const shareResult = () => ({
    puzzleNumber: puzzle.puzzleNumber,
    difficulty: puzzle.difficulty,
    solved: record.solved,
    isArchive,
    hintsUsed: record.hintsUsed,
    timeMs: record.timeMs !== undefined && record.timeMs < MAX_REPORTED_TIME_MS ? record.timeMs : undefined,
    symbols: record.symbols,
    par,
    includeChallenge,
  });

  const share = async () => {
    logShareClicked(context);
    const copied = await copyShareText(generateShareText(shareResult()));
    setCopyState(copied ? 'copied' : 'failed');
    if (copied) logShare(context);
    window.setTimeout(() => setCopyState('idle'), 2200);
  };

  const streak = useMemo(
    () => (finished && !isArchive ? computeStats(loadRecords(), todayStr).currentStreak : 0),
    // Recompute when this puzzle's outcome changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finished, record.solved, isArchive, todayStr, puzzle.id],
  );

  if (!validDate) {
    return <Navigate to="/" replace />;
  }

  const hintsLeft = hints.length > 0 && record.hintsUsed < TOTAL_HINTS;
  const actionKey: KeySpec = hintsLeft
    ? {
        onPress: revealHint,
        label: (
          <span className="fn-key-stack">
            Hint
            <small>
              {record.hintsUsed}/{TOTAL_HINTS}
            </small>
          </span>
        ),
        kind: 'hint',
        ariaLabel: `Reveal hint ${record.hintsUsed + 1} of ${TOTAL_HINTS}`,
      }
    : { onPress: () => setConfirmGiveUp(true), label: 'Give up', kind: 'danger', ariaLabel: 'Give up and see the solution' };

  const keys: KeySpec[] = finished
    ? []
    : [
        { action: 'clear', label: 'AC', kind: 'util', ariaLabel: 'Clear' },
        { token: '(', label: '(', ariaLabel: 'Open parenthesis', kind: 'fn' },
        { token: ')', label: ')', ariaLabel: 'Close parenthesis', kind: 'fn' },
        { action: 'back', label: '⌫', kind: 'util', ariaLabel: 'Backspace' },
        { token: '+', label: '+', ariaLabel: 'Plus' },
        { token: '-', label: '−', ariaLabel: 'Minus' },
        { token: '*', label: '×', ariaLabel: 'Times' },
        { token: '/', label: '÷', ariaLabel: 'Divided by' },
        { token: 'sqrt(', label: '√', ariaLabel: 'Square root', kind: 'fn' },
        { token: '!', label: 'x!', ariaLabel: 'Factorial', kind: 'fn' },
        { token: '^', label: 'xʸ', ariaLabel: 'Power', kind: 'fn' },
        { token: '%', label: '%', ariaLabel: 'Remainder (modulo)', kind: 'fn' },
        actionKey,
        { token: '.', label: '.', ariaLabel: 'Decimal point', kind: 'fn' },
        { token: String(puzzle.seed), label: puzzle.seed, kind: 'digit', span: 2, ariaLabel: `Digit ${puzzle.seed}` },
      ];

  // The big seven-segment row shows the live value, like any calculator.
  let lcdValue = '0';
  let lcdNote: React.ReactNode = null;
  let tone: 'neutral' | 'exact' | 'error' = 'neutral';
  if (record.solved) {
    lcdValue = String(puzzle.target);
    lcdNote = <span className="nl-lcd-flag">Solved</span>;
    tone = 'exact';
  } else if (record.gaveUp) {
    lcdNote = <span className="nl-lcd-flag">Answer on tape</span>;
    tone = 'error';
  } else if (evaluation && evaluation.value !== undefined) {
    lcdValue = formatLcd(evaluation.value);
    if (digitsUsed !== 4) {
      lcdNote = (
        <span className="nl-screen-label">
          {digitsUsed < 4 ? `${4 - digitsUsed} more ${puzzle.seed}` : `${digitsUsed - 4} too many`}
        </span>
      );
    }
  } else if (evaluation) {
    lcdValue = '';
  }
  const status = {
    text: (
      <>
        {lcdNote}
        <SevenSegment value={lcdValue} slots={8} className="fn-lcd-number" />
      </>
    ),
    tone,
  };

  const shownExpression = record.gaveUp ? '' : expression;
  const overPar = record.solved && record.symbols !== undefined && par !== undefined ? record.symbols - par : undefined;
  const nextOpen = puzzleSet.find(
    (candidate) => candidate.id !== puzzle.id && statusOf(candidate.id === puzzle.id ? record : getRecord(candidate.id)) === 'open',
  );
  const setComplete = puzzleSet.every(
    (candidate) => statusOf(candidate.id === puzzle.id ? record : getRecord(candidate.id)) !== 'open',
  );
  const revealed = parInfo?.expression || puzzle.solution?.expression;

  return (
    <div className="fn-play">
      <div className="fn-meta">
        {isArchive ? (
          <Link to="/archive" className="fn-meta-back">
            ← Archive
          </Link>
        ) : (
          <span className="nl-label">Today</span>
        )}
        <span className="nl-label">
          No. {puzzle.puzzleNumber} · {formatDate(puzzle.date)}
        </span>
      </div>

      {puzzleSet.length > 1 && (
        <div className="fn-lanes" role="tablist" aria-label="Difficulty">
          {DIFFICULTIES.map((difficulty) => {
            const candidate = puzzleSet.find((item) => item.difficulty === difficulty);
            if (!candidate) return null;
            const laneStatus = statusOf(candidate.id === puzzle.id ? record : getRecord(candidate.id));
            const active = candidate.id === puzzle.id;
            return (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`fn-lane fn-lane--${LANE_TONE[difficulty]}${active ? ' is-active' : ''} is-${laneStatus}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSelectedDifficulty(difficulty)}
              >
                <span className="fn-lane-dot" aria-hidden="true" />
                <span className="fn-lane-name">{difficulty}</span>
                <span className="fn-lane-mark" aria-label={laneStatus === 'open' ? 'not finished' : laneStatus.replace('-', ' ')}>
                  {laneStatus === 'solved' ? '✓' : laneStatus === 'gave-up' ? '–' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <h1 className="fn-puzzle">
        Make <span className="fn-puzzle-n">{puzzle.target}</span> with four{' '}
        <span className="fn-puzzle-n fn-puzzle-digit">{puzzle.seed}</span>s
      </h1>

      <div className={`fn-machine${finished ? ' is-finished' : ''}${record.solved ? ' is-solved' : ''}`}>
        <ExpressionCalculator
          value={shownExpression}
          onChange={handleExpression}
          keys={keys}
          captureGlobalKeys={!finished}
          disabled={finished}
          typeableDigits={String(puzzle.seed)}
          ariaLabel={`Your expression. Make ${puzzle.target} with four ${puzzle.seed}s.`}
          placeholder={record.gaveUp ? '' : `Four ${puzzle.seed}s. Any keys.`}
          header={
            <div className="fn-annunciators">
              <button type="button" className="fn-score" onClick={onShowHelp} aria-label="How scoring works">
                <span className="nl-screen-label">Sym</span>
                <span className={`fn-score-n${!finished && par !== undefined && liveSymbols > par ? ' is-over' : ''}`}>
                  {record.solved ? record.symbols : record.gaveUp ? '-' : liveSymbols}
                </span>
                <span className="nl-screen-label">Par</span>
                <span className="fn-score-n">{par ?? '-'}</span>
              </button>
              <DigitPips digit={puzzle.seed} used={record.gaveUp ? 0 : digitsUsed} />
            </div>
          }
          status={status}
          brand={
            finished ? undefined : (
              <>
                <span>Four Nines</span>
                <small>One-key puzzle calculator</small>
              </>
            )
          }
          screenFooter={
            record.hintsUsed > 0 && hints.length > 0 && !finished ? (
              <ol className="fn-hints" aria-label="Hints">
                {hints.slice(0, record.hintsUsed).map((hint, index) => (
                  <li key={hint.label}>
                    <span className="fn-hint-n">H{index + 1}</span>
                    <span>
                      {index === 2 ? (
                        <>
                          Shape: <span className="fn-hint-shape">{hint.text}</span>
                        </>
                      ) : (
                        hint.text
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : undefined
          }
        />

        {finished && (
          <div className="fn-printer">
            <div className="fn-slot" aria-hidden="true" />
            <div className={`fn-tape-roll${justFinished ? ' is-printing' : ''}`} ref={tapeRef}>
              <div className="nl-tape fn-tape" aria-label="Your result">
                <div className="nl-tape-line">
                  <span className="fn-tape-strong">FOUR NINES</span>
                  <span>NO. {puzzle.puzzleNumber}</span>
                </div>
                <div className="nl-tape-line nl-tape-muted">
                  <span>{(puzzle.difficulty ?? 'daily').toUpperCase()}</span>
                  <span>{isArchive ? `ARCHIVE ${puzzle.date}` : puzzle.date}</span>
                </div>
                <hr className="nl-tape-rule" />
                {record.solved && record.expression ? (
                  <>
                    <div className="nl-tape-expr fn-tape-expr">{prettyExpression(record.expression, { spaced: true })}</div>
                    <div className="nl-tape-line fn-tape-total">
                      <span />
                      <span>= {puzzle.target}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="nl-tape-line">
                      <span className="fn-tape-strong">NOT SOLVED</span>
                    </div>
                    {revealed && (
                      <>
                        <div className="nl-tape-line nl-tape-muted">
                          <span>PAR SOLUTION</span>
                        </div>
                        <div className="nl-tape-expr fn-tape-expr">{prettyExpression(revealed, { spaced: true })}</div>
                        <div className="nl-tape-line fn-tape-total">
                          <span />
                          <span>= {puzzle.target}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                <hr className="nl-tape-rule" />
                {record.solved && (
                  <div className="nl-tape-line">
                    <span>SYMBOLS</span>
                    <span>{record.symbols}</span>
                  </div>
                )}
                {par !== undefined && (
                  <div className="nl-tape-line">
                    <span>PAR</span>
                    <span>{par}</span>
                  </div>
                )}
                {overPar !== undefined && (
                  <div className="nl-tape-line fn-tape-strong">
                    <span>RESULT</span>
                    <span className={overPar === 0 ? 'fn-tape-par' : undefined}>
                      {overPar === 0 ? 'AT PAR' : `+${overPar} OVER`}
                    </span>
                  </div>
                )}
                {record.solved && record.timeMs !== undefined && record.timeMs < MAX_REPORTED_TIME_MS && (
                  <div className="nl-tape-line">
                    <span>TIME</span>
                    <span>{formatDuration(record.timeMs)}</span>
                  </div>
                )}
                <div className="nl-tape-line">
                  <span>HINTS</span>
                  <span>
                    {record.hintsUsed}/{TOTAL_HINTS}
                  </span>
                </div>
                {!isArchive && (
                  <div className="nl-tape-line">
                    <span>STREAK</span>
                    <span>{streak}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="fn-after">
              <button type="button" className="nl-btn nl-btn--primary fn-share" onClick={share}>
                {copyState === 'copied' ? 'Copied to clipboard' : copyState === 'failed' ? "Couldn't copy" : 'Share result'}
              </button>
              {par !== undefined && (
                <label className="fn-toggle">
                  <input
                    type="checkbox"
                    checked={includeChallenge}
                    onChange={(event) => setIncludeChallenge(event.target.checked)}
                  />
                  <span>Add a par challenge for friends</span>
                </label>
              )}
              <div className="fn-after-row">
                {nextOpen ? (
                  <button
                    type="button"
                    className={`nl-btn nl-btn--ghost fn-next fn-next--${LANE_TONE[nextOpen.difficulty ?? 'easy']}`}
                    onClick={() => setSelectedDifficulty(nextOpen.difficulty ?? 'easy')}
                  >
                    Next: {capitalize(nextOpen.difficulty ?? 'easy')} →
                  </button>
                ) : isArchive ? (
                  <Link to="/archive" className="nl-btn nl-btn--ghost">
                    Back to the archive
                  </Link>
                ) : (
                  <p className="fn-countdown">
                    <span className="nl-label">Next set in</span>
                    <span className="nl-mono">{countdown}</span>
                  </p>
                )}
                <button type="button" className="nl-btn nl-btn--ghost nl-btn--small" onClick={onShowStats}>
                  Stats
                </button>
              </div>
            </div>
            {!isArchive && setComplete && <CrossPromo dateStr={puzzle.date} />}
          </div>
        )}
      </div>

      {!finished && (
        <p className="fn-kbd-hint">
          Keyboard works: type <kbd>{puzzle.seed}</kbd> <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> <kbd>(</kbd>{' '}
          <kbd>)</kbd> <kbd>.</kbd> <kbd>!</kbd> <kbd>^</kbd>, <kbd>S</kbd> for √, <kbd>Esc</kbd> to clear.
        </p>
      )}

      <Sheet
        open={confirmGiveUp}
        onClose={() => setConfirmGiveUp(false)}
        title="Give up?"
        footer={
          <div className="fn-confirm">
            <button type="button" className="nl-btn nl-btn--ghost" onClick={() => setConfirmGiveUp(false)}>
              Keep trying
            </button>
            <button type="button" className="nl-btn fn-btn-danger" onClick={giveUp}>
              Show the solution
            </button>
          </div>
        }
      >
        <p className="nl-small">
          The par solution prints on the tape and this puzzle counts as not solved.
          {!isArchive && ' Your streak holds if you solve another of today’s puzzles.'}
        </p>
      </Sheet>
    </div>
  );
};
