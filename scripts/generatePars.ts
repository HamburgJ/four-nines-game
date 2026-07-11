/**
 * Generate puzzles/par_data.json: the minimal-symbol ("par") solution for
 * every (seed, target) pair in the daily puzzle dataset.
 *
 * Run with: npm run generate:pars
 *
 * Every candidate found by the exhaustive solver is re-verified with mathjs
 * (the same evaluator the game uses) before being accepted, and the dataset's
 * own solution is used as a fallback/upper bound — so the published par is
 * always an actually achievable solution.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { evaluate } from 'mathjs';
import { solveSeedTargets, countSymbols } from '../src/utils/solver';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

interface DatasetPuzzle {
  expression: string;
}

type Dataset = Record<string, Record<string, DatasetPuzzle>>;

interface ParEntry {
  par: number;
  expression: string;
}

const dataset: Dataset = JSON.parse(
  readFileSync(join(root, 'puzzles', 'all_puzzles_with_hints.json'), 'utf8')
);

const verify = (expression: string, seed: number, target: number): boolean => {
  const digits = expression.match(/[0-9]/g) || [];
  if (digits.length !== 4 || digits.some((d) => d !== String(seed))) return false;
  try {
    const value = evaluate(expression);
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value - target) < 1e-6;
  } catch {
    return false;
  }
};

const output: Record<string, Record<string, ParEntry>> = {};
let improved = 0;
let matched = 0;
let fallback = 0;

for (const seedKey of Object.keys(dataset)) {
  const seed = Number(seedKey);
  const targets = Object.keys(dataset[seedKey]).map(Number);
  const started = Date.now();
  const solved = solveSeedTargets(seed, targets);
  output[seedKey] = {};

  for (const target of targets) {
    const datasetExpression = dataset[seedKey][String(target)].expression;
    if (!verify(datasetExpression, seed, target)) {
      throw new Error(`Dataset solution fails verification: seed ${seed} target ${target}: ${datasetExpression}`);
    }
    const datasetPar = countSymbols(datasetExpression);

    const candidate = solved.get(target);
    const candidateOk = candidate && verify(candidate.expression, seed, target);

    if (candidateOk && candidate.par < datasetPar) {
      output[seedKey][String(target)] = { par: candidate.par, expression: candidate.expression };
      improved++;
    } else if (candidateOk && candidate.par === datasetPar) {
      output[seedKey][String(target)] = { par: datasetPar, expression: datasetExpression };
      matched++;
    } else {
      output[seedKey][String(target)] = { par: datasetPar, expression: datasetExpression };
      fallback++;
    }
  }
  console.log(`seed ${seed}: ${targets.length} targets in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

writeFileSync(join(root, 'puzzles', 'par_data.json'), JSON.stringify(output, null, 1) + '\n');
console.log(`Done. Solver improved on dataset: ${improved}, matched: ${matched}, dataset fallback: ${fallback}`);
