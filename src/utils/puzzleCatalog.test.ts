import { describe, expect, it } from 'vitest';
import { evaluate } from 'mathjs';
import catalog from '../../puzzles/puzzle_catalog.json';
import parData from '../../puzzles/par_data.json';

type Entry = {
  expression: string;
  par: number;
  difficulty: string;
  difficulty_score: number;
  traits: string[];
};

const data = catalog as Record<string, Record<string, Entry>>;
const pars = parData as Record<string, Record<string, { par: number; expression: string }>>;

describe('generated puzzle catalog', () => {
  it('contains the complete 663-puzzle curated search result', () => {
    const counts = Object.fromEntries(
      Object.entries(data).map(([seed, targets]) => [seed, Object.keys(targets).length])
    );
    expect(counts).toEqual({
      '1': 28,
      '2': 62,
      '3': 88,
      '4': 98,
      '5': 86,
      '6': 65,
      '7': 63,
      '8': 73,
      '9': 100,
    });
  });

  it('ships only verified four-digit solutions with matching par data', () => {
    for (const [seed, targets] of Object.entries(data)) {
      for (const [target, puzzle] of Object.entries(targets)) {
        const digits = puzzle.expression.match(/[0-9]/g) || [];
        expect(digits, `${seed} -> ${target}`).toHaveLength(4);
        expect(digits.every((digit) => digit === seed), `${seed} -> ${target}`).toBe(true);
        expect(evaluate(puzzle.expression), `${seed} -> ${target}`).toBeCloseTo(Number(target), 7);
        expect(['easy', 'medium', 'hard', 'expert']).toContain(puzzle.difficulty);
        expect(puzzle.difficulty_score).toBeGreaterThan(0);
        expect(pars[seed][target]).toEqual({ par: puzzle.par, expression: puzzle.expression });
      }
    }
  });
});
