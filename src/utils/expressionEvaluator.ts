type TokenType = 'number' | '+' | '-' | '*' | '/' | '%' | '^' | '!' | '(' | ')' | 'sqrt' | 'eof';

interface Token {
  type: TokenType;
  value?: number;
}

const tokenize = (expression: string): Token[] => {
  const tokens: Token[] = [];
  let position = 0;

  while (position < expression.length) {
    const remainder = expression.slice(position);
    const whitespace = remainder.match(/^\s+/);
    if (whitespace) {
      position += whitespace[0].length;
      continue;
    }

    const number = remainder.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new Error('Invalid number');
      tokens.push({ type: 'number', value });
      position += number[0].length;
      continue;
    }

    if (remainder.startsWith('sqrt')) {
      tokens.push({ type: 'sqrt' });
      position += 4;
      continue;
    }

    const character = remainder[0] as TokenType;
    if (['+', '-', '*', '/', '%', '^', '!', '(', ')'].includes(character)) {
      tokens.push({ type: character });
      position += 1;
      continue;
    }

    throw new Error('Invalid token');
  }

  return [...tokens, { type: 'eof' }];
};

const factorial = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error('Factorial requires an integer from 0 to 170');
  }
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
};

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const value = this.parseExpression();
    if (this.peek().type !== 'eof') throw new Error('Unexpected token');
    if (!Number.isFinite(value)) throw new Error('Result is not finite');
    return value;
  }

  private peek() {
    return this.tokens[this.position];
  }

  private consume(type: TokenType) {
    if (this.peek().type !== type) throw new Error(`Expected ${type}`);
    return this.tokens[this.position++];
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (this.peek().type === '+' || this.peek().type === '-') {
      const operator = this.tokens[this.position++].type;
      const operand = this.parseTerm();
      value = operator === '+' ? value + operand : value - operand;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    while (true) {
      const operator = this.peek().type;
      const isImplicitMultiplication = operator === 'number' || operator === '(' || operator === 'sqrt';
      if (!['*', '/', '%'].includes(operator) && !isImplicitMultiplication) break;
      if (!isImplicitMultiplication) this.position += 1;
      const operand = this.parseUnary();
      if (operator === '/') value /= operand;
      else if (operator === '%') value %= operand;
      else value *= operand;
    }
    return value;
  }

  private parseUnary(): number {
    if (this.peek().type === '+') {
      this.position += 1;
      return this.parseUnary();
    }
    if (this.peek().type === '-') {
      this.position += 1;
      return -this.parseUnary();
    }
    if (this.peek().type === 'sqrt') {
      this.position += 1;
      const value = this.parseUnary();
      if (value < 0) throw new Error('Cannot take the square root of a negative number');
      return Math.sqrt(value);
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePostfix();
    if (this.peek().type !== '^') return base;
    this.position += 1;
    return base ** this.parseUnary();
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();
    while (this.peek().type === '!') {
      this.position += 1;
      value = factorial(value);
    }
    return value;
  }

  private parsePrimary(): number {
    if (this.peek().type === 'number') return this.consume('number').value!;
    if (this.peek().type === '(') {
      this.position += 1;
      const value = this.parseExpression();
      this.consume(')');
      return value;
    }
    throw new Error('Expected a number or expression');
  }
}

export const evaluateExpression = (expression: string): number => new Parser(tokenize(expression)).parse();
