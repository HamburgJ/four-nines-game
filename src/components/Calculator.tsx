import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { type KeySpec, prettyToken, tokenizeRaw } from './expression';

// Copy of burgerfun's src/components/numberLab/ExpressionCalculator.tsx —
// keep the two in step.
//
// The Number Lab calculator: a black housing with a display and a keypad.
// Editing is token-aware — `sqrt(` is one key press and one backspace — and a
// caret can be moved by tapping the display or with the arrow keys. The value
// is the raw expression string the evaluators understand (`*`, `/`, `sqrt(`);
// the display shows the pretty glyphs (×, ÷, −, √).
//
// Keyboard input is scoped to the display (focus it, then type) unless
// `captureGlobalKeys` is set, so a calculator embedded in an article never
// hijacks the page's keys.

export type { KeyKind, KeySpec } from './expression';

export type StatusTone = 'neutral' | 'exact' | 'error';

interface ExpressionCalculatorProps {
  value: string;
  onChange: (value: string) => void;
  keys: KeySpec[];
  /** columns in the keypad grid (default 4) */
  columns?: number;
  /** content above the expression line (target readout, digit pips…) */
  header?: ReactNode;
  /** the line under the expression: "= 42", errors… */
  status?: { text: ReactNode; tone?: StatusTone };
  /** content under the status line inside the screen (symbol counter…) */
  screenFooter?: ReactNode;
  placeholder?: string;
  /** characters a physical keyboard may type, beyond operators (e.g. '9') */
  typeableDigits?: string;
  disabled?: boolean;
  captureGlobalKeys?: boolean;
  ariaLabel: string;
  wide?: boolean;
  className?: string;
}

const KEY_TO_TOKEN: Record<string, string> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  x: '*',
  X: '*',
  '×': '*',
  '/': '/',
  '÷': '/',
  '^': '^',
  '!': '!',
  '(': '(',
  ')': ')',
  '.': '.',
  '%': '%',
  s: 'sqrt(',
  r: 'sqrt(',
  '√': 'sqrt(',
};

export const ExpressionCalculator = ({
  value,
  onChange,
  keys,
  columns = 4,
  header,
  status,
  screenFooter,
  placeholder = 'Type or tap',
  typeableDigits = '',
  disabled = false,
  captureGlobalKeys = false,
  ariaLabel,
  wide = false,
  className,
}: ExpressionCalculatorProps) => {
  const tokens = tokenizeRaw(value);
  // The caret belongs to the value it was placed in. A value set from outside
  // (reset, restore, new puzzle) no longer matches, so the caret falls back
  // to the end — derived during render, no effect needed.
  const [caretState, setCaretState] = useState({ value, caret: tokens.length });
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const safeCaret = caretState.value === value ? Math.min(caretState.caret, tokens.length) : tokens.length;

  // Edits read the latest value/caret from this ref, not the render closure:
  // a burst of keystrokes (or a paste) can land before React re-renders, and
  // each edit must build on the previous one. Handlers write it; an effect
  // re-syncs it after every render (including values set from outside).
  const latest = useRef({ value, caret: safeCaret });
  useEffect(() => {
    latest.current = { value, caret: safeCaret };
  });
  const current = () => {
    const currentTokens = tokenizeRaw(latest.current.value);
    return { tokens: currentTokens, caret: Math.min(latest.current.caret, currentTokens.length) };
  };

  const setCaret = (next: number) => {
    latest.current = { value: latest.current.value, caret: next };
    setCaretState({ value: latest.current.value, caret: next });
  };

  const emit = useCallback(
    (next: string[], nextCaret: number) => {
      const raw = next.join('');
      latest.current = { value: raw, caret: nextCaret };
      setCaretState({ value: raw, caret: nextCaret });
      onChange(raw);
    },
    [onChange],
  );

  const allowedTokens = new Set(keys.map((key) => key.token).filter(Boolean) as string[]);

  const insert = (token: string) => {
    if (disabled) return;
    const { tokens: now, caret } = current();
    emit([...now.slice(0, caret), token, ...now.slice(caret)], caret + 1);
  };

  const backspace = () => {
    const { tokens: now, caret } = current();
    if (disabled || caret === 0) return;
    emit([...now.slice(0, caret - 1), ...now.slice(caret)], caret - 1);
  };

  const forwardDelete = () => {
    const { tokens: now, caret } = current();
    if (disabled || caret >= now.length) return;
    emit([...now.slice(0, caret), ...now.slice(caret + 1)], caret);
  };

  const clear = () => {
    if (disabled) return;
    emit([], 0);
  };

  const flash = (id: string) => {
    setPressed(id);
    window.setTimeout(() => setPressed((current) => (current === id ? null : current)), 110);
  };

  const handleKey = (event: KeyboardEvent | React.KeyboardEvent) => {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return false;
    const { key } = event;
    if (key === 'Backspace') {
      backspace();
      flash('back');
      return true;
    }
    if (key === 'Delete') {
      forwardDelete();
      return true;
    }
    if (key === 'Escape') {
      clear();
      flash('clear');
      return true;
    }
    if (key === 'ArrowLeft') {
      setCaret(Math.max(0, current().caret - 1));
      return true;
    }
    if (key === 'ArrowRight') {
      const now = current();
      setCaret(Math.min(now.tokens.length, now.caret + 1));
      return true;
    }
    if (key === 'Home') {
      setCaret(0);
      return true;
    }
    if (key === 'End') {
      setCaret(current().tokens.length);
      return true;
    }
    const token = typeableDigits.includes(key) && key.length === 1 ? key : KEY_TO_TOKEN[key];
    if (token && allowedTokens.has(token)) {
      insert(token);
      flash(token);
      return true;
    }
    return false;
  };

  // Page-level typing for full-screen games.
  const handleKeyRef = useRef(handleKey);
  useEffect(() => {
    handleKeyRef.current = handleKey;
  });
  useEffect(() => {
    if (!captureGlobalKeys) return undefined;
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // A modal is open: its keys (Escape especially) belong to it.
      if (target?.closest?.('dialog') || document.querySelector('dialog[open]')) return;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (target && target.tagName === 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) return;
      if (handleKeyRef.current(event)) event.preventDefault();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [captureGlobalKeys]);

  const handlePaste = (event: React.ClipboardEvent) => {
    if (disabled) return;
    const text = event.clipboardData.getData('text');
    if (!text) return;
    event.preventDefault();
    const normalized = text.replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt(');
    const pasted = tokenizeRaw(normalized).filter((token) => allowedTokens.has(token) || typeableDigits.includes(token));
    const { tokens: now, caret } = current();
    emit([...now.slice(0, caret), ...pasted, ...now.slice(caret)], caret + pasted.length);
  };

  const pressKey = (spec: KeySpec, id: string) => {
    if (spec.disabled) return;
    if (spec.onPress) spec.onPress();
    else if (spec.action === 'back') backspace();
    else if (spec.action === 'clear') clear();
    else if (spec.token) insert(spec.token);
    flash(id);
  };

  const showCaret = !disabled && (focused || captureGlobalKeys);
  const tone = status?.tone ?? 'neutral';

  return (
    <div className={`nl-calc${wide ? ' nl-calc--wide' : ''}${className ? ` ${className}` : ''}`}>
      <div className="nl-screen">
        {header}
        <div
          ref={screenRef}
          className={`nl-screen-expr${tokens.length === 0 ? ' nl-screen-expr--placeholder' : ''}`}
          role="textbox"
          aria-label={ariaLabel}
          aria-readonly={disabled}
          aria-description={captureGlobalKeys ? undefined : 'Focus and type, or use the keypad'}
          tabIndex={disabled ? -1 : 0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (captureGlobalKeys) return; // the window listener handles it
            if (handleKey(event)) event.preventDefault();
          }}
          onPaste={handlePaste}
          onClick={(event) => {
            // Clicking empty display space puts the caret at the end.
            if (event.target === screenRef.current) setCaret(tokens.length);
          }}
          style={{ cursor: disabled ? 'default' : 'text', outline: 'none' }}
        >
          {tokens.length === 0 ? (
            <>
              {showCaret && <span className="nl-caret" aria-hidden="true" />}
              {placeholder}
            </>
          ) : (
            <>
              {tokens.map((token, index) => (
                <span
                  key={`${index}-${token}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (disabled) return;
                    // Tap the left half of a glyph to go before it, right half after.
                    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                    setCaret(event.clientX < rect.left + rect.width / 2 ? index : index + 1);
                    screenRef.current?.focus();
                  }}
                >
                  {showCaret && safeCaret === index && <span className="nl-caret" aria-hidden="true" />}
                  {prettyToken(token)}
                </span>
              ))}
              {showCaret && safeCaret === tokens.length && <span className="nl-caret" aria-hidden="true" />}
            </>
          )}
        </div>
        <div
          className={`nl-screen-value${tone === 'exact' ? ' nl-screen-value--exact' : ''}${tone === 'error' ? ' nl-screen-value--error' : ''}`}
          aria-live="polite"
        >
          {status?.text}
        </div>
        {screenFooter}
      </div>
      {keys.length > 0 && (
        <div className="nl-keypad" style={{ ['--nl-cols' as string]: columns }}>
        {keys.map((spec, index) => {
          const id = spec.action ?? spec.token ?? `key-${index}`;
          const kind = spec.kind ?? 'op';
          return (
            <button
              key={`${id}-${index}`}
              type="button"
              className={`nl-key nl-key--${kind}${pressed === id ? ' nl-key--pressed' : ''}`}
              style={spec.span && spec.span > 1 ? { gridColumn: `span ${spec.span}` } : undefined}
              aria-label={spec.ariaLabel}
              disabled={disabled || spec.disabled}
              // Keep focus where it was (the display, or nowhere) so a mouse
              // press never leaves a focus ring on the key. Keyboard users
              // can still Tab to keys.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pressKey(spec, id)}
            >
              {spec.label}
            </button>
          );
        })}
        </div>
      )}
    </div>
  );
};

/** Four pips that light up as the seed digit is used. */
export const DigitPips = ({ digit, used, total = 4 }: { digit: number | string; used: number; total?: number }) => (
  <span className="nl-pips" role="img" aria-label={`${Math.min(used, 99)} of ${total} ${digit}s used`}>
    {Array.from({ length: total }).map((_, index) => (
      <span
        key={index}
        className={`nl-pip${used > total ? ' nl-pip--over' : index < used ? ' nl-pip--on' : ''}`}
        aria-hidden="true"
      >
        {digit}
      </span>
    ))}
  </span>
);
