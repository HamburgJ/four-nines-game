import React, { useState, useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faShare, faFlag, faBackspace, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  getPuzzlesForDateString,
  getTodayDateString,
  validateAndEvaluate,
  isPlayableDateString,
  DailyPuzzle,
  DailyDifficulty,
} from '../utils/gameLogic';
import { countSymbols } from '../utils/solver';
import { getParInfo, buildHints, TOTAL_HINTS } from '../utils/parData';
import {
  DayRecord,
  STREAK_MILESTONES,
  createRecord,
  getRecord,
  loadRecords,
  saveRecord,
  migrateLegacyState,
  streakAfterLiveSolve,
} from '../utils/records';
import { generateShareText, buildResultLine, copyShareText } from '../utils/shareUtils';
import {
  logGameEvent,
  logShareClicked,
  logHintUsed,
  logArchivePlay,
  logStreakMilestone,
} from '../utils/analytics';
import { CrossPromo } from '../components/CrossPromo';

// Define operator groups for the keyboard
const OPERATORS = {
  basic: ['+', '-', '*', '/'],
  advanced: ['^', '%', '!', 'sqrt', '.'],
  parentheses: ['(', ')'],
};

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

export const Play: React.FC = () => {
  const { date: dateParam } = useParams<{ date: string }>();
  const todayStr = getTodayDateString();
  // Validate BEFORE computing the puzzle: getPuzzleForDateString crashes on
  // unparseable dates, and lenient rollover dates (2024-02-30) would create
  // phantom puzzles. When invalid, fall back to today so the hooks below stay
  // safe; the <Navigate> guard before render then redirects to /play.
  const validDate = !dateParam || isPlayableDateString(dateParam, todayStr);
  const dateStr = validDate && dateParam ? dateParam : todayStr;
  const isArchive = dateStr !== todayStr;

  const puzzleSet = useMemo(() => getPuzzlesForDateString(dateStr), [dateStr]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DailyDifficulty>('easy');
  const puzzle = puzzleSet.find((candidate) => candidate.difficulty === selectedDifficulty) || puzzleSet[0];
  const parInfo = useMemo(() => getParInfo(puzzle.seed, puzzle.target), [puzzle.seed, puzzle.target]);
  const hints = useMemo(() => (parInfo ? buildHints(parInfo) : []), [parInfo]);

  const [record, setRecord] = useState<DayRecord>(() => initRecord(puzzle, !isArchive));
  const [evaluation, setEvaluation] = useState<{
    value?: number;
    error?: string;
    digitCount?: number;
    isValid?: boolean;
  } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [includeChallenge, setIncludeChallenge] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Reload the record when the puzzle changes (archive navigation, day rollover).
  // Adjusting state during render — rather than in an effect — is React's
  // recommended way to reset state in response to a changed key, and avoids the
  // extra commit/repaint an effect would cause. The guard means initRecord (and
  // its localStorage writes) only runs when the date actually changes, exactly
  // as often as the previous effect did.
  const [trackedPuzzleId, setTrackedPuzzleId] = useState(puzzle.id);
  if (trackedPuzzleId !== puzzle.id) {
    const loaded = initRecord(puzzle, !isArchive);
    setTrackedPuzzleId(puzzle.id);
    setRecord(loaded);
    setCursorPosition(loaded.currentExpression.length);
    setEvaluation(
      loaded.currentExpression.trim() && !loaded.solved && !loaded.gaveUp
        ? validateAndEvaluate(loaded.currentExpression, puzzle)
        : null
    );
  }

  const finished = record.solved || record.gaveUp;

  // Log archive plays. Analytics is an external side effect, so it belongs in
  // an effect; it fires once per distinct archived puzzle the player opens.
  useEffect(() => {
    if (isArchive) {
      logArchivePlay(puzzle.date);
    }
  }, [puzzle.date, puzzle.difficulty, isArchive]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|android|ios|iphone|ipad|ipod|windows phone/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Countdown to the next daily puzzle
  useEffect(() => {
    if (!finished || isArchive) return;

    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilNext(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [finished, isArchive]);

  const updateRecord = (patch: Partial<DayRecord>) => {
    setRecord((current) => {
      const next = { ...current, ...patch };
      saveRecord(next);
      return next;
    });
  };

  const finalizeSolve = (expression: string, startedAt: number | undefined) => {
    const symbols = countSymbols(expression);
    // Never report a par above what the player just achieved: their solution
    // is proof of achievability.
    const par = parInfo ? Math.min(parInfo.par, symbols) : undefined;
    updateRecord({
      solved: true,
      gaveUp: false,
      live: !isArchive,
      expression,
      symbols,
      par,
      timeMs: startedAt !== undefined ? Date.now() - startedAt : undefined,
    });
    logGameEvent('solve', isArchive ? 'archive' : 'daily', symbols);
    if (!isArchive) {
      // streakAfterLiveSolve does not need today's record persisted yet, so
      // this is safe even though updateRecord saves asynchronously.
      const records = loadRecords();
      const alreadySolvedToday = Object.values(records).some(
        (saved) => saved.date === puzzle.date && saved.solved && saved.live
      );
      const streak = streakAfterLiveSolve(records, puzzle.date);
      if (!alreadySolvedToday && STREAK_MILESTONES.includes(streak)) {
        logStreakMilestone(streak);
      }
    }
  };

  const validateExpression = (expr: string, startedAt: number | undefined) => {
    if (!expr.trim()) {
      setEvaluation(null);
      return;
    }

    const result = validateAndEvaluate(expr, puzzle);
    setEvaluation(result);

    if (result.isValid && result.value === puzzle.target && !record.solved) {
      finalizeSolve(expr, startedAt);
    }
  };

  const setExpression = (expr: string) => {
    const startedAt = record.startedAt ?? Date.now();
    updateRecord({ currentExpression: expr, startedAt });
    validateExpression(expr, startedAt);
  };

  const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert × to * for evaluation
    const expr = e.target.value.replace(/×/g, '*');
    setCursorPosition(e.target.selectionStart || 0);
    setExpression(expr);
  };

  const handleKeyPress = (key: string) => {
    const expr = record.currentExpression;
    const pos = cursorPosition;

    // Special handling for sqrt
    if (key === 'sqrt') {
      const newExpr = expr.slice(0, pos) + 'sqrt(' + expr.slice(pos);
      setCursorPosition(pos + 5);
      setExpression(newExpr);
      return;
    }

    const newExpr = expr.slice(0, pos) + key + expr.slice(pos);
    setCursorPosition(pos + key.length);
    setExpression(newExpr);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    setCursorPosition(input.selectionStart || 0);
  };

  const handleBackspace = () => {
    const expr = record.currentExpression;
    const pos = cursorPosition;
    if (pos > 0) {
      const newExpr = expr.slice(0, pos - 1) + expr.slice(pos);
      setCursorPosition(pos - 1);
      setExpression(newExpr);
    }
  };

  const handleClear = () => {
    setCursorPosition(0);
    setExpression('');
  };

  const shareResult = () => ({
    puzzleNumber: puzzle.puzzleNumber,
    difficulty: puzzle.difficulty,
    solved: record.solved,
    isArchive,
    hintsUsed: record.hintsUsed,
    timeMs: record.timeMs !== undefined && record.timeMs < 3 * 60 * 60 * 1000 ? record.timeMs : undefined,
    symbols: record.symbols,
    par: record.par ?? parInfo?.par,
    includeChallenge,
  });

  const handleShare = async () => {
    logShareClicked(isArchive ? 'archive' : 'daily');
    const text = generateShareText(shareResult());
    const copied = await copyShareText(text);
    if (copied) {
      toast.success('Result copied to clipboard');
      logGameEvent('share', isArchive ? 'archive' : 'daily');
    } else {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleRevealHint = () => {
    if (record.hintsUsed >= TOTAL_HINTS) return;
    updateRecord({ hintsUsed: record.hintsUsed + 1 });
    logGameEvent('hint', `hint-${record.hintsUsed + 1}`);
    logHintUsed(record.hintsUsed + 1);
  };

  const handleGiveUp = () => {
    setShowGiveUpModal(false);
    updateRecord({
      gaveUp: true,
      solved: false,
      live: !isArchive,
      par: parInfo?.par,
    });
    logGameEvent('give-up', isArchive ? 'archive' : 'daily');
  };

  // Function to display expression with × instead of *
  const displayExpression = (expr: string) => {
    return expr.replace(/\*/g, '×');
  };

  const puzzleStatus = (candidate: DailyPuzzle): 'open' | 'solved' | 'gave-up' => {
    const candidateRecord = candidate.id === puzzle.id ? record : getRecord(candidate.id);
    if (candidateRecord?.solved) return 'solved';
    if (candidateRecord?.gaveUp) return 'gave-up';
    return 'open';
  };

  const renderHintSummary = () => {
    if (record.hintsUsed === 0 || hints.length === 0) return null;

    return (
      <div className="hint-summary">
        {hints.slice(0, record.hintsUsed).map((hint) => (
          <div className="hint-item" key={hint.label}>
            <div className="hint-label">{hint.label}:</div>
            <div className="hint-content">{hint.text}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderHintButtons = () => {
    const allHintsUsed = hints.length === 0 || record.hintsUsed >= TOTAL_HINTS;

    return (
      <div className="hint-buttons">
        <Button
          variant={allHintsUsed ? 'danger' : 'outline-secondary'}
          onClick={allHintsUsed ? () => setShowGiveUpModal(true) : handleRevealHint}
          disabled={finished}
          className={`hint-type-button ${allHintsUsed ? 'give-up-button' : ''}`}
          size={allHintsUsed ? 'lg' : undefined}
        >
          <FontAwesomeIcon icon={allHintsUsed ? faFlag : faLightbulb} className="me-2" />
          {allHintsUsed ? 'Give Up' : `Hint (${record.hintsUsed}/${TOTAL_HINTS})`}
        </Button>
      </div>
    );
  };

  const renderHintIndicator = () => {
    if (record.hintsUsed === 0 || hints.length === 0) return null;

    return (
      <div className="hint-indicator">
        {Array.from({ length: TOTAL_HINTS }).map((_, i) => (
          <div key={i} className={`hint-circle ${i < record.hintsUsed ? 'used' : ''}`} />
        ))}
      </div>
    );
  };

  const renderShareControls = () => (
    <div className="share-controls">
      <Button variant="primary" size="lg" onClick={handleShare} className="share-score-button">
        <FontAwesomeIcon icon={faShare} className="me-2" />
        Share Result
      </Button>
      {(record.par ?? parInfo?.par) !== undefined && (
        <Form.Check
          type="checkbox"
          id="include-challenge"
          className="challenge-toggle"
          label="Add a challenge line for friends"
          checked={includeChallenge}
          onChange={(e) => setIncludeChallenge(e.target.checked)}
        />
      )}
    </div>
  );

  const renderCompletionState = () => {
    if (!finished) return null;

    const revealedSolution = parInfo?.expression || puzzle.solution?.expression;
    const nextPuzzle = puzzleSet.find((candidate) => puzzleStatus(candidate) === 'open');
    const completedSet = puzzleSet.every((candidate) => puzzleStatus(candidate) !== 'open');

    return (
      <div className="completion-state">
        {record.gaveUp ? (
          <>
            <h2 className="completion-title completion-title-gave-up">You'll get it next time!</h2>
            {revealedSolution && (
              <p className="completion-text">
                The par solution was: <code>{displayExpression(revealedSolution)}</code>
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="completion-title">You got it!</h2>
            {record.expression && (
              <p className="completion-text">
                <code>{displayExpression(record.expression)}</code> = {puzzle.target}
              </p>
            )}
          </>
        )}
        <p className="result-line">{buildResultLine(shareResult())}</p>
        {renderShareControls()}
        {nextPuzzle && nextPuzzle.id !== puzzle.id ? (
          <Button
            variant="outline-primary"
            className="next-difficulty-button"
            onClick={() => setSelectedDifficulty(nextPuzzle.difficulty || 'easy')}
          >
            Next: {nextPuzzle.difficulty}
          </Button>
        ) : isArchive ? (
          <Link to="/archive" className="archive-return-link">
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Back to the archive
          </Link>
        ) : (
          <div className="next-puzzle-timer">Next puzzle in {timeUntilNext}</div>
        )}
        {!isArchive && completedSet && <CrossPromo dateStr={puzzle.date} />}
      </div>
    );
  };

  const renderGiveUpModal = () => {
    return (
      <Modal show={showGiveUpModal} onHide={() => setShowGiveUpModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Give Up?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to give up? The solution will be revealed.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGiveUpModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleGiveUp}>
            Yes, Give Up
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  if (!validDate) {
    return <Navigate to="/play" replace />;
  }

  return (
    <div className="game-container">
      <div className="game-panel">
        <div className="game-panel-inner">
          <div className="game-content">
        {isArchive && (
          <div className="archive-banner">
            <Link to="/archive" className="archive-return-link">
              <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
              Archive
            </Link>
            <span className="archive-banner-date">
              #{puzzle.puzzleNumber} — {puzzle.date}
            </span>
          </div>
        )}

            {puzzleSet.length > 1 && (
              <div className="difficulty-switcher" aria-label="Today's difficulty">
                {puzzleSet.map((candidate) => {
                  const status = puzzleStatus(candidate);
                  const active = candidate.id === puzzle.id;
                  return (
                    <button
                      type="button"
                      key={candidate.id}
                      className={`difficulty-option difficulty-${candidate.difficulty} is-${status} ${active ? 'is-active' : ''}`}
                      onClick={() => setSelectedDifficulty(candidate.difficulty || 'easy')}
                      aria-pressed={active}
                    >
                      <span>{candidate.difficulty}</span>
                      <span className="difficulty-status" aria-hidden="true">
                        {status === 'solved' ? '✓' : status === 'gave-up' ? '—' : '○'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <h1 className="puzzle-instruction">
              Make <span>{puzzle.target}</span> with four <span>{puzzle.seed}s</span>
            </h1>

        <div className="expression-container">
          <input
            type="text"
            value={displayExpression(record.currentExpression)}
            onChange={handleExpressionChange}
            onFocus={handleInputFocus}
            onClick={handleInputClick}
            placeholder="Enter your expression..."
            className="expression-input"
            disabled={finished}
            readOnly={isMobile}
            inputMode={isMobile ? 'none' : 'text'}
          />
          <div className={`evaluation-display ${evaluation?.isValid ? 'is-correct' : ''}`} aria-live="polite">
            {evaluation && evaluation.value !== undefined && (
              <span className="value-text">= {evaluation.value}</span>
            )}
            {evaluation && <span className="status-detail">{evaluation.isValid ? 'Solved' : evaluation.error}</span>}
          </div>
        </div>

            {renderCompletionState()}
          </div>

          {!finished && (
            <div className="bottom-controls">
              {renderHintSummary()}
              <div className="hint-controls">
                {renderHintButtons()}
                {renderHintIndicator()}
              </div>
              <div className="keyboard" aria-label="Expression keypad">
                <div className="keyboard-row keyboard-row-main">
              <Button
                variant="secondary"
                onClick={() => handleKeyPress(puzzle.seed.toString())}
                className="key-button key-button-digit"
              >
                {puzzle.seed}
              </Button>
              {OPERATORS.basic.map((op) => (
                <Button
                  key={op}
                  variant="secondary"
                  onClick={() => handleKeyPress(op)}
                  className="key-button"
                >
                  {op === '*' ? '×' : op}
                </Button>
              ))}
              <Button variant="secondary" onClick={handleBackspace} className="key-button key-button-icon" aria-label="Backspace">
                <FontAwesomeIcon icon={faBackspace} />
              </Button>
            </div>
            <div className="keyboard-row keyboard-row-advanced">
              {OPERATORS.advanced.map((op) => (
                <Button
                  key={op}
                  variant="secondary"
                  onClick={() => handleKeyPress(op)}
                  className="key-button"
                >
                  {op}
                </Button>
              ))}
            </div>
            <div className="keyboard-row keyboard-row-compact">
              {OPERATORS.parentheses.map((op) => (
                <Button
                  key={op}
                  variant="secondary"
                  onClick={() => handleKeyPress(op)}
                  className="key-button"
                >
                  {op}
                </Button>
              ))}
              <Button variant="danger" onClick={handleClear} className="key-button key-button-clear">
                Clear
              </Button>
            </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {renderGiveUpModal()}
    </div>
  );
};
