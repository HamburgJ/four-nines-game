/**
 * Deterministically generate the curated Four Nines puzzle catalog.
 *
 * Unlike the original random/genetic Python search, this script exhaustively
 * searches the bounded expression space for every seed/target pair, verifies
 * every result with the same mathjs evaluator used by the game, and derives
 * difficulty/variety metadata for daily scheduling.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { evaluate } from 'mathjs';
import {
  countSymbols,
  operatorTokens,
  solveSeedTargets,
  tokenize,
} from '../src/utils/solver';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_TARGET = 100;
const TARGETS = Array.from({ length: MAX_TARGET }, (_, index) => index + 1);

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface LegacyPuzzle {
  expression: string;
}

interface CatalogEntry {
  expression: string;
  complexity: number;
  unique_operators: number;
  par: number;
  difficulty: Difficulty;
  difficulty_score: number;
  traits: string[];
  hints: {
    leaf_values: string[];
    operators: string[];
    subtrees: string[];
  };
}

type LegacyCatalog = Record<string, Record<string, LegacyPuzzle>>;
type LegacySchedule = Record<string, number[]>;
type Catalog = Record<string, Record<string, CatalogEntry>>;
type ParCatalog = Record<string, Record<string, { par: number; expression: string }>>;

const legacy: LegacyCatalog = JSON.parse(
  readFileSync(join(root, 'puzzles', 'all_puzzles_with_hints.json'), 'utf8')
);
const legacySchedule: LegacySchedule = Object.fromEntries(
  Object.entries(legacy).map(([seed, targets]) => [seed, Object.keys(targets).map(Number)])
);

const verify = (expression: string, seed: number, target: number): boolean => {
  const digits = expression.match(/[0-9]/g) || [];
  if (digits.length !== 4 || digits.some((digit) => digit !== String(seed))) return false;
  try {
    const value = evaluate(expression);
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value - target) < 1e-7;
  } catch {
    return false;
  }
};

const expressionDepth = (expression: string): number => {
  let depth = 0;
  let maximum = 0;
  for (const char of expression) {
    if (char === '(') maximum = Math.max(maximum, ++depth);
    if (char === ')') depth--;
  }
  return maximum;
};

const analyze = (expression: string): Omit<CatalogEntry, 'expression'> => {
  const operators = operatorTokens(expression);
  const uniqueOperators = [...new Set(operators)];
  const numbers = tokenize(expression)
    .filter((token) => token.type === 'num')
    .map((token) => token.text);
  const traits: string[] = [];

  if (numbers.some((number) => number.includes('.'))) traits.push('decimal');
  if (numbers.some((number) => (number.match(/[0-9]/g) || []).length > 1)) traits.push('concatenation');
  if (operators.includes('/')) traits.push('division');
  if (operators.includes('sqrt')) traits.push('square-root');
  if (operators.includes('!')) traits.push('factorial');
  if (operators.includes('^')) traits.push('exponent');
  if (operators.includes('%')) traits.push('modulo');
  if (/\^\s*-/.test(expression) || /\^\s*\(-/.test(expression)) traits.push('negative-exponent');

  const par = countSymbols(expression);
  const advancedWeight = operators.reduce((score, operator) => {
    if (operator === '^') return score + 1.2;
    if (operator === 'sqrt' || operator === '!' || operator === '%') return score + 0.8;
    if (operator === '/' || operator === '-') return score + 0.2;
    return score;
  }, 0);
  const representationWeight =
    (traits.includes('decimal') ? 0.7 : 0) +
    (traits.includes('concatenation') ? 0.4 : 0) +
    Math.max(0, expressionDepth(expression) - 2) * 0.2;
  const difficultyScore = Math.round((par + advancedWeight + representationWeight) * 10) / 10;
  const difficulty: Difficulty =
    difficultyScore <= 3.5 ? 'easy' :
    difficultyScore <= 5.8 ? 'medium' :
    difficultyScore <= 8 ? 'hard' : 'expert';

  return {
    complexity: expression.replace(/\s/g, '').length,
    unique_operators: uniqueOperators.length,
    par,
    difficulty,
    difficulty_score: difficultyScore,
    traits,
    hints: {
      leaf_values: numbers,
      operators: uniqueOperators,
      subtrees: [],
    },
  };
};

const catalog: Catalog = {};
const parCatalog: ParCatalog = {};
const totals: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
let total = 0;

for (let seed = 1; seed <= 9; seed++) {
  const started = Date.now();
  const solved = solveSeedTargets(seed, TARGETS);
  catalog[String(seed)] = {};
  parCatalog[String(seed)] = {};

  for (const target of TARGETS) {
    const generated = solved.get(target);
    const legacyExpression = legacy[String(seed)]?.[String(target)]?.expression;
    const candidates = [generated?.expression, legacyExpression]
      .filter((expression): expression is string => Boolean(expression))
      .filter((expression) => verify(expression, seed, target));
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => countSymbols(a) - countSymbols(b) || a.length - b.length || a.localeCompare(b));
    const expression = candidates[0];
    const metadata = analyze(expression);
    catalog[String(seed)][String(target)] = { expression, ...metadata };
    parCatalog[String(seed)][String(target)] = { par: metadata.par, expression };
    totals[metadata.difficulty]++;
    total++;
  }

  console.log(
    `seed ${seed}: ${Object.keys(catalog[String(seed)]).length}/${MAX_TARGET} targets in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
}

writeFileSync(join(root, 'puzzles', 'puzzle_catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(join(root, 'puzzles', 'par_data.json'), JSON.stringify(parCatalog, null, 2) + '\n');
writeFileSync(join(root, 'puzzles', 'legacy_schedule.json'), JSON.stringify(legacySchedule, null, 2) + '\n');

console.log(`Generated ${total} verified puzzles.`);
console.log(`Difficulty mix: ${Object.entries(totals).map(([key, value]) => `${key}=${value}`).join(', ')}`);
