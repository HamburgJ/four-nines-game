// Copy of burgerfun's src/components/numberLab/SevenSegment.tsx — keep in step.
// Seven-segment LCD digits for the Number Lab calculator. Its own module so
// small callers (the home card) don't pull in the whole calculator.

// Seven-segment glyphs: segments a–g (top, top-right, bottom-right, bottom,
// bottom-left, top-left, middle).
const SEGMENTS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  E: 'adefg',
  r: 'eg',
  o: 'cdeg',
  ' ': '',
};

const T = 9; // segment thickness
const G = 1.5; // gap between segments
const X0 = 8;
const X1 = 46;
const Y0 = 6;
const YM = 50;
const YB = 94;
const horizontal = (x1: number, x2: number, y: number) =>
  `${x1},${y} ${x1 + T / 2},${y - T / 2} ${x2 - T / 2},${y - T / 2} ${x2},${y} ${x2 - T / 2},${y + T / 2} ${x1 + T / 2},${y + T / 2}`;
const vertical = (x: number, y1: number, y2: number) =>
  `${x},${y1} ${x + T / 2},${y1 + T / 2} ${x + T / 2},${y2 - T / 2} ${x},${y2} ${x - T / 2},${y2 - T / 2} ${x - T / 2},${y1 + T / 2}`;
const SEGMENT_POINTS: Record<string, string> = {
  a: horizontal(X0 + G, X1 - G, Y0),
  b: vertical(X1, Y0 + G, YM - G),
  c: vertical(X1, YM + G, YB - G),
  d: horizontal(X0 + G, X1 - G, YB),
  e: vertical(X0, YM + G, YB - G),
  f: vertical(X0, Y0 + G, YM - G),
  g: horizontal(X0 + G, X1 - G, YM),
};

const SegmentDigit = ({ char, dot, ghost }: { char: string; dot: boolean; ghost: boolean }) => {
  const lit = SEGMENTS[char] ?? '';
  return (
    <svg viewBox="0 0 62 100" aria-hidden="true">
      <g transform="translate(9 0) skewX(-6)">
        {Object.entries(SEGMENT_POINTS).map(([name, points]) =>
          lit.includes(name) ? (
            <polygon key={name} points={points} className="nl-seg-on" />
          ) : ghost ? (
            <polygon key={name} points={points} className="nl-seg-ghost" />
          ) : null,
        )}
        {(dot || ghost) && <circle cx="58" cy="94" r="4.6" className={dot ? 'nl-seg-on' : 'nl-seg-ghost'} />}
      </g>
    </svg>
  );
};

/**
 * An LCD number in seven-segment digits, right-aligned in `slots` cells with
 * faint unlit "8"s behind (the look of a real calculator display). Supports
 * 0–9, minus, a decimal point, and E. Size it with font-size.
 */
export const SevenSegment = ({
  value,
  slots = 0,
  ghost = true,
  className,
}: {
  value: string;
  slots?: number;
  ghost?: boolean;
  className?: string;
}) => {
  const cells: Array<{ char: string; dot: boolean }> = [];
  for (const char of value.replace(/e\+?/i, 'E')) {
    if (char === '.' && cells.length > 0 && !cells[cells.length - 1].dot) {
      cells[cells.length - 1].dot = true;
    } else if (char === '.') {
      cells.push({ char: '0', dot: true });
    } else {
      cells.push({ char, dot: false });
    }
  }
  while (cells.length < slots) cells.unshift({ char: ' ', dot: false });
  return (
    <span className={`nl-seg${className ? ` ${className}` : ''}`} role="img" aria-label={value}>
      {cells.map((cell, index) => (
        <SegmentDigit key={index} char={cell.char} dot={cell.dot} ghost={ghost} />
      ))}
    </span>
  );
};
