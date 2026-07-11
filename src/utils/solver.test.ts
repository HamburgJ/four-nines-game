import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import {
  countSymbols,
  operatorTokens,
  expressionShape,
  solvePuzzle,
  solveSeedTargets,
} from './solver';
import allPuzzles from '../../puzzles/all_puzzles_with_hints.json';
import parData from '../../puzzles/par_data.json';

type PuzzleMap = { [seed: string]: { [target: string]: { expression: string } } };
type ParMap = { [seed: string]: { [target: string]: { par: number; expression: string } } };

const dataset = allPuzzles as PuzzleMap;
const pars = parData as ParMap;

const evaluatesTo = (expression: string, target: number): boolean => {
  const value = evaluate(expression);
  return typeof value === 'number' && Math.abs(value - target) < 1e-6;
};

const usesFourSeeds = (expression: string, seed: number): boolean => {
  const digits = expression.match(/[0-9]/g) || [];
  return digits.length === 4 && digits.every((d) => d === String(seed));
};

describe('countSymbols', () => {
  it('counts operators only, parentheses are free', () => {
    expect(countSymbols('11+11')).toBe(1);
    expect(countSymbols('(11 + 11)')).toBe(1);
    expect(countSymbols('((9 + 9) * 9) - 9')).toBe(3);
  });

  it('counts decimal points as symbols', () => {
    expect(countSymbols('5.5*5+.5')).toBe(4); // two dots, *, +
    expect(countSymbols('.4/.4/.4/.4')).toBe(7); // four dots, three /
  });

  it('counts sqrt and factorial as one symbol each', () => {
    expect(countSymbols('sqrt(4)+4/4*4')).toBe(4);
    expect(countSymbols('((1+(1+1))!)-1')).toBe(4);
  });

  it('counts digits beyond the required four', () => {
    expect(countSymbols('9+9+9+9+9')).toBe(5); // 4 ops + 1 extra digit
  });

  it('handles the display multiplication sign', () => {
    expect(countSymbols('11 × 11')).toBe(1);
  });
});

describe('operatorTokens / expressionShape', () => {
  it('lists operators in order, excluding decimal points', () => {
    expect(operatorTokens('(5.5 * 5) + .5')).toEqual(['*', '+']);
    expect(operatorTokens('sqrt((9 + 9)!)')).toEqual(['sqrt', '+', '!']);
  });

  it('hides all numbers in the shape', () => {
    expect(expressionShape('((9 + 9) * 9) - 9')).toBe('((_ + _) * _) - _');
    expect(expressionShape('(11.1 - .1)')).toBe('(_ - _)');
    expect(expressionShape('sqrt(9) + 9')).toBe('sqrt(_) + _');
    expect(expressionShape('((5!) - 5)')).toBe('((_!) - _)');
  });
});

describe('solver', () => {
  it('finds the known minimal solution for seed 1, target 22', () => {
    const result = solvePuzzle(1, 22);
    expect(result).not.toBeNull();
    expect(result!.par).toBe(1);
    expect(evaluatesTo(result!.expression, 22)).toBe(true);
    expect(usesFourSeeds(result!.expression, 1)).toBe(true);
  });

  it('reports pars that match the symbol count of its own expression', () => {
    const results = solveSeedTargets(9, [100, 81, 20]);
    for (const [target, solution] of results) {
      expect(countSymbols(solution.expression)).toBe(solution.par);
      expect(evaluatesTo(solution.expression, target)).toBe(true);
      expect(usesFourSeeds(solution.expression, 9)).toBe(true);
    }
  });

  it('never reports a par above a known achievable solution', () => {
    // The dataset expressions are achievable, so the solver (which considers
    // at least as much of the space) must never do worse for a sample seed.
    const targets = Object.keys(dataset['3']).map(Number);
    const results = solveSeedTargets(3, targets);
    for (const target of targets) {
      const solution = results.get(target);
      const datasetPar = countSymbols(dataset['3'][String(target)].expression);
      if (solution) {
        expect(solution.par).toBeLessThanOrEqual(datasetPar);
      }
    }
  });
});

describe('par_data.json (shipped par table)', () => {
  it('covers every puzzle in the daily dataset', () => {
    for (const seed of Object.keys(dataset)) {
      for (const target of Object.keys(dataset[seed])) {
        expect(pars[seed]?.[target], `missing par for seed ${seed} target ${target}`).toBeDefined();
      }
    }
  });

  it('every par is an actually achievable, verified solution', () => {
    for (const seed of Object.keys(pars)) {
      for (const target of Object.keys(pars[seed])) {
        const { par, expression } = pars[seed][target];
        expect(usesFourSeeds(expression, Number(seed)), `${seed}->${target}: ${expression}`).toBe(true);
        expect(evaluatesTo(expression, Number(target)), `${seed}->${target}: ${expression}`).toBe(true);
        expect(countSymbols(expression), `${seed}->${target}: ${expression}`).toBe(par);
      }
    }
  });

  it('never exceeds the dataset solution symbol count', () => {
    for (const seed of Object.keys(dataset)) {
      for (const target of Object.keys(dataset[seed])) {
        const datasetPar = countSymbols(dataset[seed][target].expression);
        expect(pars[seed][target].par, `seed ${seed} target ${target}`).toBeLessThanOrEqual(datasetPar);
      }
    }
  });
});
