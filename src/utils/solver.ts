/**
 * Exhaustive solver for Four Nines puzzles.
 *
 * Searches expressions that use exactly four copies of the seed digit with the
 * game's operator set (+ - * / ^ % ! sqrt, digit concatenation, decimal
 * points) and finds the minimal "symbol" cost solution for each target.
 *
 * Symbol counting matches what the player sees in the share text:
 *   - every operator token (+ - * / ^ % ! sqrt) costs 1
 *   - every decimal point costs 1
 *   - digits beyond the four required seed digits cost 1 each
 *   - parentheses are free
 *
 * The search is comprehensive but bounded (value magnitude caps, unary
 * nesting limits), so the reported par is always achievable (every result is
 * a concrete verified expression) but is technically an upper bound on the
 * true minimum. That is the safe direction: we must never report a par lower
 * than an actually achievable solution.
 */

export interface ParSolution {
  par: number;
  expression: string;
}

export interface Token {
  type: 'num' | 'op' | 'paren';
  text: string;
}

/** Operators revealed by hints (decimal points are excluded). */
export const OPERATOR_TOKENS = ['+', '-', '*', '/', '^', '%', '!', 'sqrt'];

// ---------------------------------------------------------------------------
// Tokenizing / symbol counting
// ---------------------------------------------------------------------------

export const tokenize = (expression: string): Token[] => {
  const clean = expression.replace(/\s+/g, '').replace(/×/g, '*');
  const tokens: Token[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean.startsWith('sqrt', i)) {
      tokens.push({ type: 'op', text: 'sqrt' });
      i += 4;
      continue;
    }
    const ch = clean[i];
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < clean.length && /[0-9.]/.test(clean[j])) j++;
      tokens.push({ type: 'num', text: clean.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/^%!'.includes(ch)) {
      tokens.push({ type: 'op', text: ch });
    } else if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', text: ch });
    }
    i++;
  }
  return tokens;
};

/**
 * Count the "symbols" in an expression: operators + decimal points + any
 * digits beyond the four required seed digits. Parentheses are free.
 */
export const countSymbols = (expression: string): number => {
  let symbols = 0;
  let digits = 0;
  for (const token of tokenize(expression)) {
    if (token.type === 'num') {
      digits += (token.text.match(/[0-9]/g) || []).length;
      symbols += (token.text.match(/\./g) || []).length;
    } else if (token.type === 'op') {
      symbols += 1;
    }
  }
  return symbols + Math.max(0, digits - 4);
};

/** Ordered list of operator tokens in an expression (no decimal points). */
export const operatorTokens = (expression: string): string[] =>
  tokenize(expression)
    .filter((t) => t.type === 'op')
    .map((t) => t.text);

/**
 * The parenthesization shape of an expression with all numbers hidden,
 * e.g. "((9 + 9) * 9) - 9" -> "((_ + _) * _) - _".
 */
export const expressionShape = (expression: string): string => {
  let out = '';
  for (const token of tokenize(expression)) {
    if (token.type === 'num') {
      out += '_';
    } else if (token.type === 'op' && token.text !== '!' && token.text !== 'sqrt') {
      out += ` ${token.text} `;
    } else {
      out += token.text;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

interface Entry {
  v: number;
  cost: number;
  expr: string;
}

type Level = Map<number, Entry>;

const MAX_ABS = 1e6; // cap on intermediate value magnitude
const QUANT = 1e7; // value quantization for map keys (1e6 * 1e7 = 1e13 < 2^53)
const SNAP_EPS = 1e-9; // near-integer snapping
const MAX_COST = 8; // prune partial expressions above this symbol cost
const UNARY_PASSES = 3; // max nested unary (sqrt/!) applications per level

const FACTORIALS: Record<number, number> = {};
{
  let f = 2;
  for (let n = 3; n <= 12; n++) {
    f *= n;
    FACTORIALS[n] = f;
  }
}
const INV_FACTORIALS: Record<number, number> = {};
for (const [n, f] of Object.entries(FACTORIALS)) {
  INV_FACTORIALS[f] = Number(n);
}

const snap = (v: number): number => {
  const r = Math.round(v);
  return Math.abs(v - r) < SNAP_EPS ? r : v;
};

const keyOf = (v: number): number | null => {
  if (!Number.isFinite(v)) return null;
  const s = snap(v);
  if (Math.abs(s) > MAX_ABS) return null;
  return Math.round(s * QUANT);
};

const insert = (level: Level, v: number, cost: number, expr: string): Entry | null => {
  if (cost > MAX_COST) return null;
  const k = keyOf(v);
  if (k === null) return null;
  const existing = level.get(k);
  if (existing && existing.cost <= cost) return null;
  const entry: Entry = { v: snap(v), cost, expr };
  level.set(k, entry);
  return entry;
};

/** All literals formed from `count` copies of the seed digit (concatenation + one decimal point). */
const leaves = (seed: number, count: number): Entry[] => {
  const digits = String(seed).repeat(count);
  const out: Entry[] = [{ v: Number(digits), cost: 0, expr: digits }];
  for (let before = 0; before < count; before++) {
    const text = before === 0 ? `.${digits}` : `${digits.slice(0, before)}.${digits.slice(before)}`;
    out.push({ v: Number(text), cost: 1, expr: text });
  }
  return out;
};

/** mathjs-compatible mod (sign of divisor); we only combine non-negative operands. */
const mod = (a: number, b: number): number => a - Math.floor(a / b) * b;

type Emit = (v: number, cost: number, expr: string) => void;

/** Apply every binary operator to (a, b) in that order. */
const combinePair = (a: Entry, b: Entry, emit: Emit): void => {
  const cost = a.cost + b.cost + 1;
  if (cost > MAX_COST) return;
  emit(a.v + b.v, cost, `(${a.expr} + ${b.expr})`);
  emit(a.v - b.v, cost, `(${a.expr} - ${b.expr})`);
  emit(a.v * b.v, cost, `(${a.expr} * ${b.expr})`);
  if (b.v !== 0) {
    emit(a.v / b.v, cost, `(${a.expr} / ${b.expr})`);
  }
  if (a.v >= 0 && b.v > 0) {
    emit(mod(a.v, b.v), cost, `(${a.expr} % ${b.expr})`);
  }
  // Exponentiation: skip forms that go complex or explode.
  if (!(a.v === 0 && b.v <= 0) && !(a.v < 0 && !Number.isInteger(b.v)) && Math.abs(b.v) <= 32) {
    emit(Math.pow(a.v, b.v), cost, `(${a.expr} ^ ${b.expr})`);
  }
};

const combine = (from: Level, other: Level, emit: Emit): void => {
  for (const a of from.values()) {
    for (const b of other.values()) {
      combinePair(a, b, emit);
      if (from !== other) combinePair(b, a, emit);
    }
  }
};

/** Expand a level with sqrt / factorial, up to UNARY_PASSES nested applications. */
const unaryClosure = (level: Level): void => {
  let frontier = [...level.values()];
  for (let pass = 0; pass < UNARY_PASSES && frontier.length > 0; pass++) {
    const added: Entry[] = [];
    for (const e of frontier) {
      if (e.v > 0) {
        const inserted = insert(level, Math.sqrt(e.v), e.cost + 1, `sqrt(${e.expr})`);
        if (inserted) added.push(inserted);
      }
      if (Number.isInteger(e.v) && FACTORIALS[e.v] !== undefined) {
        const inserted = insert(level, FACTORIALS[e.v], e.cost + 1, `(${e.expr}!)`);
        if (inserted) added.push(inserted);
      }
    }
    frontier = added;
  }
};

const buildLevel = (seed: number, count: number, lower: Level[]): Level => {
  const level: Level = new Map();
  for (const leaf of leaves(seed, count)) {
    insert(level, leaf.v, leaf.cost, leaf.expr);
  }
  const emit: Emit = (v, cost, expr) => {
    insert(level, v, cost, expr);
  };
  for (let i = 1; i * 2 <= count; i++) {
    combine(lower[i], lower[count - i], emit);
  }
  unaryClosure(level);
  return level;
};

/**
 * Top-level unary chains: sequences of sqrt/! applied to a finished 4-digit
 * value. For a given target, list the raw values that reach it (with the
 * extra cost and expression wrapper for each chain).
 */
interface Chain {
  pre: number;
  extraCost: number;
  wrap: (expr: string) => string;
}

const chainsForTarget = (target: number): Chain[] => {
  const chains: Chain[] = [{ pre: target, extraCost: 0, wrap: (e) => e }];
  const t2 = target * target;
  chains.push({ pre: t2, extraCost: 1, wrap: (e) => `sqrt(${e})` });
  const t4 = t2 * t2;
  if (t4 <= MAX_ABS) {
    chains.push({ pre: t4, extraCost: 2, wrap: (e) => `sqrt(sqrt(${e}))` });
  }
  const invT = INV_FACTORIALS[target];
  if (invT !== undefined) {
    chains.push({ pre: invT, extraCost: 1, wrap: (e) => `(${e}!)` });
    chains.push({ pre: invT * invT, extraCost: 2, wrap: (e) => `(sqrt(${e})!)` });
    const invInv = INV_FACTORIALS[invT];
    if (invInv !== undefined) {
      chains.push({ pre: invInv, extraCost: 2, wrap: (e) => `((${e}!)!)` });
    }
  }
  const invT2 = INV_FACTORIALS[t2];
  if (invT2 !== undefined) {
    chains.push({ pre: invT2, extraCost: 2, wrap: (e) => `sqrt((${e}!))` });
  }
  return chains;
};

const levelCache = new Map<number, Level[]>();

const getLevels = (seed: number): Level[] => {
  const cached = levelCache.get(seed);
  if (cached) return cached;
  const levels: Level[] = [new Map()]; // index 0 unused
  for (let count = 1; count <= 3; count++) {
    levels.push(buildLevel(seed, count, levels));
  }
  levelCache.set(seed, levels);
  return levels;
};

/**
 * Find minimal-symbol solutions for many targets of one seed in a single
 * sweep over all 4-digit expressions. Returns a map target -> solution
 * (missing entries mean nothing was found within the search bounds).
 */
export const solveSeedTargets = (
  seed: number,
  targets: number[]
): Map<number, ParSolution> => {
  const levels = getLevels(seed);

  // Values worth remembering during the 4-digit sweep.
  const wanted = new Map<number, Entry>();
  const wantedKeys = new Set<number>();
  const chainsByTarget = new Map<number, Chain[]>();
  for (const target of targets) {
    const chains = chainsForTarget(target);
    chainsByTarget.set(target, chains);
    for (const chain of chains) {
      const k = keyOf(chain.pre);
      if (k !== null) wantedKeys.add(k);
    }
  }

  const emit: Emit = (v, cost, expr) => {
    if (cost > MAX_COST) return;
    const k = keyOf(v);
    if (k === null || !wantedKeys.has(k)) return;
    const existing = wanted.get(k);
    if (!existing || existing.cost > cost) {
      wanted.set(k, { v: snap(v), cost, expr });
    }
  };

  for (const leaf of leaves(seed, 4)) {
    emit(leaf.v, leaf.cost, leaf.expr);
  }
  combine(levels[1], levels[3], emit);
  combine(levels[2], levels[2], emit);

  const results = new Map<number, ParSolution>();
  for (const target of targets) {
    let best: ParSolution | null = null;
    for (const chain of chainsByTarget.get(target)!) {
      const k = keyOf(chain.pre);
      if (k === null) continue;
      const entry = wanted.get(k);
      if (!entry) continue;
      const par = entry.cost + chain.extraCost;
      if (!best || par < best.par) {
        best = { par, expression: chain.wrap(entry.expr) };
      }
    }
    if (best) results.set(target, best);
  }
  return results;
};

/** Convenience wrapper for a single (seed, target) pair. */
export const solvePuzzle = (seed: number, target: number): ParSolution | null =>
  solveSeedTargets(seed, [target]).get(target) || null;
