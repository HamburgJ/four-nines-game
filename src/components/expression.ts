import type { ReactNode } from 'react';

// Copy of burgerfun's src/components/numberLab/expression.ts — keep in step.
// Pure helpers and types for the Number Lab calculator
// (Calculator.tsx). Kept out of the component file so React fast
// refresh keeps working.

/** op: gray + − × ÷ · fn: light keys ( ) . √ ! ^ % · util: dark AC ⌫ */
export type KeyKind = 'op' | 'fn' | 'digit' | 'util' | 'hint' | 'danger';

export interface KeySpec {
  /** raw token inserted on press (e.g. '9', '+', 'sqrt(') */
  token?: string;
  /** built-in editing action instead of inserting a token */
  action?: 'back' | 'clear';
  /** arbitrary handler (e.g. hint), replaces token/action */
  onPress?: () => void;
  label: ReactNode;
  ariaLabel?: string;
  kind?: KeyKind;
  /** grid columns this key spans (default 1) */
  span?: number;
  disabled?: boolean;
}

const TOKEN_PATTERN = /sqrt\(|./g;

export const tokenizeRaw = (raw: string): string[] =>
  (raw.replace(/\s+/g, '').match(TOKEN_PATTERN) ?? []).filter(Boolean);

export const prettyToken = (token: string): string => {
  switch (token) {
    case '*':
      return '×';
    case '/':
      return '÷';
    case '-':
      return '−';
    case 'sqrt(':
      return '√(';
    default:
      return token;
  }
};

const BINARY = new Set(['+', '-', '*', '/', '^', '%']);

/**
 * Pretty-print a raw expression for display (× ÷ − √). `spaced` puts thin
 * air around binary operators for printed output (tape, solutions); a minus
 * that starts an expression or follows an operator/paren stays unary.
 */
export const prettyExpression = (raw: string, { spaced = false }: { spaced?: boolean } = {}): string => {
  const tokens = tokenizeRaw(raw);
  if (!spaced) return tokens.map(prettyToken).join('');
  return tokens
    .map((token, index) => {
      const previous = tokens[index - 1];
      const unary = token === '-' && (previous === undefined || BINARY.has(previous) || previous === '(' || previous === 'sqrt(');
      return BINARY.has(token) && !unary ? ` ${prettyToken(token)} ` : prettyToken(token);
    })
    .join('');
};

/**
 * Standard keypad for a four-of-one-digit puzzle (Four Nines, Four Fours).
 * The one number key runs the full width of the bottom row: the whole point
 * of the puzzle is that it is the only digit you have.
 */
export const digitKeypad = (digit: number, { advanced = true }: { advanced?: boolean } = {}): KeySpec[] => [
  { action: 'clear', label: 'AC', kind: 'util', ariaLabel: 'Clear' },
  { token: '(', label: '(', ariaLabel: 'Open parenthesis', kind: 'fn' },
  { token: ')', label: ')', ariaLabel: 'Close parenthesis', kind: 'fn' },
  { action: 'back', label: '⌫', kind: 'util', ariaLabel: 'Backspace' },
  { token: '+', label: '+', ariaLabel: 'Plus' },
  { token: '-', label: '−', ariaLabel: 'Minus' },
  { token: '*', label: '×', ariaLabel: 'Times' },
  { token: '/', label: '÷', ariaLabel: 'Divided by' },
  ...(advanced
    ? ([
        { token: 'sqrt(', label: '√', ariaLabel: 'Square root', kind: 'fn' },
        { token: '!', label: 'x!', ariaLabel: 'Factorial', kind: 'fn' },
        { token: '^', label: 'xʸ', ariaLabel: 'Power', kind: 'fn' },
        { token: '.', label: '.', ariaLabel: 'Decimal point', kind: 'fn' },
        { token: String(digit), label: digit, kind: 'digit', span: 4, ariaLabel: `Digit ${digit}` },
      ] as KeySpec[])
    : ([
        { token: '.', label: '.', ariaLabel: 'Decimal point', kind: 'fn' },
        { token: String(digit), label: digit, kind: 'digit', span: 3, ariaLabel: `Digit ${digit}` },
      ] as KeySpec[])),
];
