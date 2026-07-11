import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useGameState } from '../hooks/useGameState';
import {
  getMillisecondsUntilNextPuzzle,
  getTodaysPuzzle,
  validateAndEvaluate,
  DailyPuzzle,
} from '../utils/gameLogic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faShare, faBackspace, faFlag } from '@fortawesome/free-solid-svg-icons';
import { generateShareText, shareResults } from '../utils/shareUtils';
import { HintState } from '../types/GameState';
import { logGameEvent } from '../utils/analytics';

// Define operator groups for the keyboard
const OPERATORS = {
  basic: ['+', '-', '*', '/'],
  advanced: ['^', '%', '!', 'sqrt', '.'],
  parentheses: ['(', ')'],
};

export const Play: React.FC = () => {
  const { gameState, updateGameState, startNewDay, completeGame } = useGameState();
  const [puzzle, setPuzzle] = useState<DailyPuzzle>(getTodaysPuzzle());
  const puzzleDateRef = useRef(puzzle.date);
  const completionRef = useRef(gameState.todayCompleted);
  const [evaluation, setEvaluation] = useState<{ 
    value?: number; 
    error?: string;
    digitCount?: number;
    isValid?: boolean;
  } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

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

  useEffect(() => {
    let rolloverTimer: number | undefined;

    const syncToCurrentDay = () => {
      const todayPuzzle = getTodaysPuzzle();
      startNewDay(todayPuzzle.date);

      if (todayPuzzle.date !== puzzleDateRef.current) {
        puzzleDateRef.current = todayPuzzle.date;
        completionRef.current = false;
        setPuzzle(todayPuzzle);
        setEvaluation(null);
      }
    };

    const scheduleRollover = () => {
      window.clearTimeout(rolloverTimer);
      rolloverTimer = window.setTimeout(() => {
        syncToCurrentDay();
        scheduleRollover();
      }, getMillisecondsUntilNextPuzzle() + 1000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncToCurrentDay();
    };

    syncToCurrentDay();
    scheduleRollover();
    window.addEventListener('focus', syncToCurrentDay);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(rolloverTimer);
      window.removeEventListener('focus', syncToCurrentDay);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startNewDay]);

  useEffect(() => {
    logGameEvent('game_view', puzzle.date, puzzle.puzzleNumber);
  }, [puzzle.date, puzzle.puzzleNumber]);

  useEffect(() => {
    completionRef.current = gameState.todayCompleted;
  }, [gameState.date, gameState.todayCompleted]);

  useEffect(() => {
    if (!gameState.todayCompleted) return;

    const updateCountdown = () => {
      const diff = getMillisecondsUntilNextPuzzle();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilNext(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [gameState.todayCompleted]);

  const validateExpression = (expr: string) => {
    if (!expr.trim()) {
      setEvaluation(null);
      return;
    }

    const result = validateAndEvaluate(expr, puzzle);
    setEvaluation(result);

    if (
      result.isValid
      && result.value === puzzle.target
      && !completionRef.current
      && !gameState.todayCompleted
    ) {
      completionRef.current = true;
      completeGame('solved', expr);
      logGameEvent('game_solved', puzzle.date, getTotalHintsUsed());
    }
  };

  const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert × to * for evaluation
    const expr = e.target.value.replace(/×/g, '*');
    updateGameState({ currentExpression: expr });
    setCursorPosition(e.target.selectionStart || 0);
    validateExpression(expr);
  };

  const handleKeyPress = (key: string) => {
    const expr = gameState.currentExpression;
    const pos = cursorPosition;
    
    // Special handling for -()
    if (key === '-()') {
      const newExpr = expr.slice(0, pos) + '-(())' + expr.slice(pos);
      updateGameState({ currentExpression: newExpr });
      setCursorPosition(pos + 3);
      validateExpression(newExpr);
      return;
    }

    // Special handling for sqrt
    if (key === 'sqrt') {
      const newExpr = expr.slice(0, pos) + 'sqrt(' + expr.slice(pos);
      updateGameState({ currentExpression: newExpr });
      setCursorPosition(pos + 5);
      validateExpression(newExpr);
      return;
    }
    
    const newExpr = expr.slice(0, pos) + key + expr.slice(pos);
    updateGameState({ currentExpression: newExpr });
    setCursorPosition(pos + key.length);
    validateExpression(newExpr);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    setCursorPosition(input.selectionStart || 0);
  };

  const handleBackspace = () => {
    const expr = gameState.currentExpression;
    const pos = cursorPosition;
    if (pos > 0) {
      const newExpr = expr.slice(0, pos - 1) + expr.slice(pos);
      updateGameState({ currentExpression: newExpr });
      setCursorPosition(pos - 1);
      validateExpression(newExpr);
    }
  };

  const handleClear = () => {
    updateGameState({ currentExpression: '' });
    setCursorPosition(0);
    validateExpression('');
  };

  const handleShare = async () => {
    const shareText = generateShareText({
      title: 'Four Nines',
      puzzle: {
        target: puzzle.target,
        seed: puzzle.seed,
        date: puzzle.date
      },
      didSolve: !gameState.gaveUp,
      hintsUsed: getTotalHintsUsed(),
      stats: {
        gamesPlayed: gameState.gamesPlayed,
        winRate: gameState.winRate,
        currentStreak: gameState.currentStreak,
        maxStreak: gameState.maxStreak
      }
    });

    const shareMethod = await shareResults(shareText);
    if (shareMethod !== 'cancelled') {
      logGameEvent('result_shared', shareMethod, getTotalHintsUsed());
    }
  };

  const handleRevealHint = () => {
    if (!puzzle.solution?.hints) return;

    const totalOperators = puzzle.solution.hints.operators.length;
    const currentHints = getTotalHintsUsed();

    const newHints: HintState = {
      operators: currentHints < totalOperators 
        ? puzzle.solution.hints.operators.slice(0, currentHints + 1)
        : puzzle.solution.hints.operators,
      subtrees: currentHints >= totalOperators
        ? puzzle.solution.hints.subtrees.slice(0, currentHints - totalOperators + 1)
        : []
    };

    updateGameState({ hintsUsed: newHints });
    logGameEvent('hint_revealed', puzzle.date, currentHints + 1);
  };

  const handleGiveUp = () => {
    if (completionRef.current || gameState.todayCompleted) return;
    completionRef.current = true;
    completeGame('gave_up');
    logGameEvent('game_gave_up', puzzle.date, getTotalHintsUsed());
  };

  const getTotalHintsUsed = () => {
    return gameState.hintsUsed.operators.length + gameState.hintsUsed.subtrees.length;
  };

  const handleGiveUpClick = () => {
    setShowGiveUpModal(true);
  };

  const handleGiveUpConfirm = () => {
    setShowGiveUpModal(false);
    handleGiveUp();
  };

  const handleGiveUpCancel = () => {
    setShowGiveUpModal(false);
  };

  const renderHintSummary = () => {
    if (!puzzle.solution?.hints) return null;

    const currentHints = getTotalHintsUsed();
    if (currentHints === 0) return null;

    return (
      <div className="hint-summary">
        {gameState.hintsUsed.operators.length > 0 && (
          <div className="hint-item">
            <div className="hint-label">Operators:</div>
            <div className="hint-content">{gameState.hintsUsed.operators.join(' ')}</div>
          </div>
        )}
        {gameState.hintsUsed.subtrees.length > 0 && (
          <div className="hint-item">
            <div className="hint-label">Solution contains:</div>
            <div className="hint-content">{gameState.hintsUsed.subtrees.join(', ')}</div>
          </div>
        )}
      </div>
    );
  };

  const renderHintButtons = () => {
    if (!puzzle.solution?.hints) return null;

    const totalOperators = puzzle.solution.hints.operators.length;
    const totalSubtrees = puzzle.solution.hints.subtrees.length;
    const currentHints = getTotalHintsUsed();
    const isComplete = currentHints >= (totalOperators + totalSubtrees);

    return (
      <div className="hint-buttons">
        <Button
          variant={isComplete ? "danger" : "outline-secondary"}
          onClick={isComplete ? handleGiveUpClick : handleRevealHint}
          disabled={gameState.todayCompleted}
          className={`hint-type-button ${isComplete ? 'give-up-button' : ''}`}
          size={isComplete ? "lg" : undefined}
        >
          <FontAwesomeIcon icon={isComplete ? faFlag : faLightbulb} className="me-2" />
          {isComplete ? "Give Up" : `Hint (${currentHints}/?)`}
        </Button>
      </div>
    );
  };

  const renderHintIndicator = () => {
    if (!puzzle.solution?.hints) return null;

    const totalOperators = puzzle.solution.hints.operators.length;
    const totalSubtrees = puzzle.solution.hints.subtrees.length;
    const totalHints = totalOperators + totalSubtrees;
    const usedHints = getTotalHintsUsed();

    return (
      <div className="hint-indicator" aria-label={`${usedHints} of ${totalHints} hints used`}>
        {Array.from({ length: totalHints }).map((_, i) => (
          <div 
            key={i} 
            className={`hint-circle ${i < usedHints ? 'used' : ''}`} 
          />
        ))}
      </div>
    );
  };

  const renderCompletionState = () => {
    if (!gameState.todayCompleted) return null;

    return (
      <div className="completion-state">
        {gameState.gaveUp ? (
          <>
            <h2 className="completion-title completion-title-gave-up">You'll get it next time!</h2>
            <p className="completion-text">
              The solution was: {puzzle.solution?.expression}
            </p>
          </>
        ) : (
          <>
            <h2 className="completion-title">You got it!</h2>
            <p className="completion-text">
              You solved today's Four Nine's puzzle with {getTotalHintsUsed()} hints used.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleShare}
              className="share-score-button"
            >
              <FontAwesomeIcon icon={faShare} className="me-2" />
              Share Score
            </Button>
          </>
        )}
        <div className="next-puzzle-timer">
          Next puzzle in {timeUntilNext}
        </div>
      </div>
    );
  };

  const renderGiveUpModal = () => {
    return (
      <Modal show={showGiveUpModal} onHide={handleGiveUpCancel} centered>
        <Modal.Header closeButton>
          <Modal.Title>Give Up?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to give up? The solution will be revealed.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleGiveUpCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleGiveUpConfirm}>
            Yes, Give Up
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Function to display expression with × instead of *
  const displayExpression = (expr: string) => {
    return expr.replace(/\*/g, '×');
  };

  return (
    <div className="game-container">
      <div className="game-panel">
        <div className="game-panel-inner">
          <div className="game-content">
            <h1 className="puzzle-instruction">
              Make <span>{puzzle.target}</span> with four <span>{puzzle.seed}s</span>
            </h1>

            <div className="expression-container">
              <input
                type="text"
                value={displayExpression(gameState.currentExpression)}
                onChange={handleExpressionChange}
                onFocus={handleInputFocus}
                onClick={handleInputClick}
                placeholder="Build your expression..."
                className="expression-input"
                disabled={gameState.todayCompleted}
                readOnly={isMobile}
                inputMode={isMobile ? "none" : "text"}
              />
              <div
                className={`evaluation-display ${evaluation?.isValid ? 'is-correct' : ''}`}
                aria-live="polite"
              >
                {evaluation && (
                  <>
                    {evaluation.value !== undefined && (
                      <span className="value-text">= {evaluation.value}</span>
                    )}
                    <span className="status-detail">
                      {evaluation.isValid ? 'Solved' : evaluation.error}
                    </span>
                  </>
                )}
              </div>
            </div>

            {renderCompletionState()}
          </div>

          {!gameState.todayCompleted && (
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
                  {OPERATORS.basic.map(op => (
                    <Button
                      key={op}
                      variant="secondary"
                      onClick={() => handleKeyPress(op)}
                      className="key-button"
                    >
                      {op === '*' ? '×' : op}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={handleBackspace}
                    className="key-button key-button-icon"
                    aria-label="Backspace"
                  >
                    <FontAwesomeIcon icon={faBackspace} />
                  </Button>
                </div>
                <div className="keyboard-row keyboard-row-advanced">
                  {OPERATORS.advanced.map(op => (
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
                  {OPERATORS.parentheses.map(op => (
                    <Button
                      key={op}
                      variant="secondary"
                      onClick={() => handleKeyPress(op)}
                      className="key-button"
                    >
                      {op}
                    </Button>
                  ))}
                  <Button
                    variant="danger"
                    onClick={handleClear}
                    className="key-button key-button-clear"
                  >
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
