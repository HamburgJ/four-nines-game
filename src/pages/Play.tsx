import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { getTodaysPuzzle, validateAndEvaluate, calculateScore, DailyPuzzle } from '../utils/gameLogic';
import { Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faShare, faArrowLeft, faBackspace } from '@fortawesome/free-solid-svg-icons';
import { generateShareText } from '../utils/shareUtils';
import './Play.css';

// Define operator groups for the keyboard
const OPERATORS = {
  basic: ['+', '-', '*', '/'],
  advanced: ['^', '%', '!', 'sqrt', '.'],
  parentheses: ['(', ')'],
};

export const Play: React.FC = () => {
  const { gameState, updateGameState } = useGameState();
  const [puzzle, setPuzzle] = useState<DailyPuzzle>(getTodaysPuzzle());
  const [evaluation, setEvaluation] = useState<{ 
    value?: number; 
    error?: string;
    digitCount?: number;
    isValid?: boolean;
  } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [resultSpace, setResultSpace] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  useEffect(() => {
    // Check if it's a new day
    const todayPuzzle = getTodaysPuzzle();
    if (todayPuzzle.date !== puzzle.date) {
      setPuzzle(todayPuzzle);
      updateGameState({
        currentExpression: '',
        todayCompleted: false
      });
      // Reset hints
      updateGameState({
        hintsUsed: {
          leafValues: false,
          operators: false,
          subtrees: 0
        }
      });
    }
  }, [puzzle.date]);

  useEffect(() => {
    if (!gameState.todayCompleted) return;

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
  }, [gameState.todayCompleted]);

  const validateExpression = (expr: string) => {
    if (!expr.trim()) {
      setEvaluation(null);
      setResultSpace('');
      return;
    }

    const result = validateAndEvaluate(expr, puzzle);
    setEvaluation(result);

    if (result.isValid && result.value === puzzle.target) {
      updateGameState({ todayCompleted: true });
    }
  };

  const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const expr = e.target.value;
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

  const getDigitButtonVariant = () => {
    if (!evaluation) return 'primary';
    if (!evaluation.isValid) return 'danger';
    if (evaluation.value === puzzle.target) return 'success';
    return 'warning';
  };

  const handleShare = async () => {
    if (gameState.todayCompleted) {
      const text = generateShareText({
        title: 'Four Nines',
        dayNumber: puzzle.puzzleNumber,
        score: calculateScore(gameState.currentExpression)
      });
      await navigator.clipboard.writeText(text);
      setResultSpace('Copied to clipboard!');
    }
  };

  const handleRevealHint = (type: 'leafValues' | 'operators' | 'subtrees') => {
    if (type === 'subtrees') {
      updateGameState({
        hintsUsed: {
          ...gameState.hintsUsed,
          subtrees: gameState.hintsUsed.subtrees + 1
        }
      });
    } else {
      updateGameState({
        hintsUsed: {
          ...gameState.hintsUsed,
          [type]: true
        }
      });
    }
    setShowHint(true);
  };

  const handleGiveUp = () => {
    updateGameState({ 
      todayCompleted: true,
      gaveUp: true
    });
  };

  const allHintsUsed = () => {
    return gameState.hintsUsed.leafValues && 
           gameState.hintsUsed.operators && 
           gameState.hintsUsed.subtrees >= (puzzle.solution?.hints?.subtrees?.length || 0);
  };

  const getTotalHintsUsed = () => {
    return (gameState.hintsUsed.leafValues ? 1 : 0) + 
           (gameState.hintsUsed.operators ? 1 : 0) + 
           gameState.hintsUsed.subtrees;
  };

  const renderHintSummary = () => {
    const hints = puzzle.solution?.hints;
    if (!hints) return null;

    // Only render if there are any revealed hints
    if (!gameState.hintsUsed.leafValues && 
        !gameState.hintsUsed.operators && 
        gameState.hintsUsed.subtrees === 0) {
      return null;
    }

    return (
      <div className="hint-summary">
        {gameState.hintsUsed.leafValues && (
          <div className="hint-item">
            <div className="hint-label">Numbers:</div>
            <div className="hint-content">{hints.leaf_values.join(' ')}</div>
          </div>
        )}
        {gameState.hintsUsed.operators && (
          <div className="hint-item">
            <div className="hint-label">Operators:</div>
            <div className="hint-content">{hints.operators.join(' ')}</div>
          </div>
        )}
        {gameState.hintsUsed.subtrees > 0 && hints.subtrees.slice(0, gameState.hintsUsed.subtrees).map((tree, i) => (
          <div key={i} className="hint-item">
            <div className="hint-label">Subtree {i + 1}:</div>
            <div className="hint-content">{tree}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderHintButtons = () => {
    return (
      <div className="hint-buttons">
        <Button
          variant="outline-secondary"
          onClick={() => handleRevealHint('leafValues')}
          disabled={gameState.hintsUsed.leafValues}
          className="hint-type-button"
        >
          <FontAwesomeIcon icon={faLightbulb} className="me-2" />
          Numbers
        </Button>
        <Button
          variant="outline-secondary"
          onClick={() => handleRevealHint('operators')}
          disabled={gameState.hintsUsed.operators}
          className="hint-type-button"
        >
          <FontAwesomeIcon icon={faLightbulb} className="me-2" />
          Operators
        </Button>
        <Button
          variant="outline-secondary"
          onClick={() => handleRevealHint('subtrees')}
          disabled={gameState.hintsUsed.subtrees >= (puzzle.solution?.hints.subtrees?.length || 0)}
          className="hint-type-button"
        >
          <FontAwesomeIcon icon={faLightbulb} className="me-2" />
          Subtree
        </Button>
      </div>
    );
  };

  const renderHintIndicator = () => {
    const totalHints = 2 + (puzzle.solution?.hints?.subtrees?.length || 0); // Numbers + Operators + Subtrees
    const usedHints = getTotalHintsUsed();

    return (
      <div className="hint-indicator">
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

  return (
    <div className="game-container">
      <div className="game-header">
        <Button variant="link" className="back-button" onClick={() => window.history.back()}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </Button>
        <div className="puzzle-number">#{puzzle.puzzleNumber}</div>
        <div className="header-buttons">
          <Button
            variant="link"
            onClick={handleShare}
            disabled={!gameState.todayCompleted}
            className="share-button"
          >
            <FontAwesomeIcon icon={faShare} />
          </Button>
        </div>
      </div>

      <div className="game-content">
        <div className="target-display">
          Make {puzzle.target} with four {puzzle.seed}s
        </div>

        <div className="expression-container">
          <input
            type="text"
            value={gameState.currentExpression}
            onChange={handleExpressionChange}
            onFocus={handleInputFocus}
            onClick={handleInputClick}
            placeholder="Enter your expression..."
            className="expression-input"
            disabled={gameState.todayCompleted}
          />
          {evaluation && evaluation.value !== undefined && (
            <div className="evaluation-display">
              <span className="value-text">= {evaluation.value}</span>
            </div>
          )}
        </div>

        {renderCompletionState()}
      </div>

      <div className="bottom-controls">
        {renderHintSummary()}
        {renderHintIndicator()}
        <div className="hint-controls">
          {renderHintButtons()}
          {!gameState.todayCompleted && allHintsUsed() && (
            <Button
              variant="outline-danger"
              onClick={handleGiveUp}
              className="give-up-button"
            >
              Give Up
            </Button>
          )}
        </div>
        <div className="keyboard">
          <div className="keyboard-row">
            <Button
              variant={getDigitButtonVariant()}
              onClick={() => handleKeyPress(puzzle.seed.toString())}
              className="key-button"
              disabled={gameState.todayCompleted}
            >
              {puzzle.seed}
            </Button>
            {OPERATORS.basic.map(op => (
              <Button
                key={op}
                variant="secondary"
                onClick={() => handleKeyPress(op)}
                className="key-button"
                disabled={gameState.todayCompleted}
              >
                {op}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={handleBackspace}
              className="key-button"
              disabled={gameState.todayCompleted}
            >
              <FontAwesomeIcon icon={faBackspace} />
            </Button>
          </div>
          <div className="keyboard-row">
            {OPERATORS.advanced.map(op => (
              <Button
                key={op}
                variant="secondary"
                onClick={() => handleKeyPress(op)}
                className="key-button"
                disabled={gameState.todayCompleted}
              >
                {op}
              </Button>
            ))}
          </div>
          <div className="keyboard-row">
            {OPERATORS.parentheses.map(op => (
              <Button
                key={op}
                variant="secondary"
                onClick={() => handleKeyPress(op)}
                className="key-button"
                disabled={gameState.todayCompleted}
              >
                {op}
              </Button>
            ))}
            <Button
              variant="danger"
              onClick={() => updateGameState({ currentExpression: '' })}
              className="key-button"
              disabled={gameState.todayCompleted}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 