import { describe, expect, it } from 'vitest';
import { evaluateExpression } from './expressionEvaluator';

describe('expression evaluator', () => {
  it.each([
    ['9 + 9 + 9 + 9', 36],
    ['sqrt(9) + 9 - 9 / 9', 11],
    ['3!', 6],
    ['2^3^2', 512],
    ['2^-2', 0.25],
    ['-2^2', -4],
    ['2(3 + 1)', 8],
    ['.9 / .3', 3],
    ['10 % 4', 2],
  ])('evaluates %s', (expression, result) => {
    expect(evaluateExpression(expression)).toBeCloseTo(result as number);
  });

  it.each(['sqrt(-1)', '1 / 0', '171!', 'alert(1)', '2 +'])('rejects unsafe or invalid input: %s', expression => {
    expect(() => evaluateExpression(expression)).toThrow();
  });
});
