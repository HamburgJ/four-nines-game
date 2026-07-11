import React, { useState, useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faShare, faFlag, faBackspace, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  getPuzzleForDateString,
  getTodayDateString,
  validateAndEvaluate,
  isPlayableDateString,
  DailyPuzzle,
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
  const existing = getRecord(puzzle.date);
  if (existing) return existing;
  const record = createRecord(puzzle.date, puzzle.seed, puzzle.target);
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

  const puzzle = useMemo(() => getPuzzleForDateString(dateStr), [dateStr]);
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

  const finished = record.solved || record.gaveUp;

  // Reload the record when the puzzle changes (archive navigation, day rollover)
  useEffect(() => {
    const loaded = initRecord(puzzle, !isArchive);
    setRecord(loaded);
    setCursorPosition(loaded.currentExpression.length);
    setEvaluation(
      loaded.currentExpression.trim() && !loaded.solved && !loaded.gaveUp
        ? validateAndEvaluate(loaded.currentExpression, puzzle)
        : null
    );
    if (isArchive) {
      logArchivePlay(puzzle.date);
    }
  }, [puzzle.date]);

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
      const streak = streakAfterLiveSolve(loadRecords(), puzzle.date);
      if (STREAK_MILESTONES.includes(streak)) {
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
        {isArchive ? (
          <Link to="/archive" className="archive-return-link">
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Back to the archive
          </Link>
        ) : (
          <div className="next-puzzle-timer">Next puzzle in {timeUntilNext}</div>
        )}
        {!isArchive && <CrossPromo dateStr={puzzle.date} />}
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

        <div className="target-display">
          Make {puzzle.target} with four {puzzle.seed}s
        </div>

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
          <div className="evaluation-display">
            {evaluation && evaluation.value !== undefined && (
              <span className="value-text">= {evaluation.value}</span>
            )}
          </div>
        </div>

        {renderCompletionState()}
      </div>

      {!finished && (
        <div className="bottom-controls">
          {renderHintSummary()}
          {renderHintIndicator()}
          <div className="hint-controls">{renderHintButtons()}</div>
          <div className="keyboard">
            <div className="keyboard-row">
              <Button
                variant="secondary"
                onClick={() => handleKeyPress(puzzle.seed.toString())}
                className="key-button"
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
              <Button variant="secondary" onClick={handleBackspace} className="key-button">
                <FontAwesomeIcon icon={faBackspace} />
              </Button>
            </div>
            <div className="keyboard-row">
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
            <div className="keyboard-row">
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
              <Button variant="danger" onClick={handleClear} className="key-button">
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
      {renderGiveUpModal()}
    </div>
  );
};
