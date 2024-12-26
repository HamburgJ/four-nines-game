# Four-nines Puzzle Generator Design

## Overview
This generator creates mathematical puzzles where players must construct expressions using exactly 4 instances of a seed number (1-9) to reach a target number (1-100). The generator uses AST (Abstract Syntax Tree) manipulation and random exploration to find interesting puzzles.

## Leaf Node Generation

### Properties
- Each leaf node combination must use exactly 4 seed digits total
- Leaf nodes can be:
  - Single digits (e.g., 5)
  - Concatenated digits (max 3 digits, e.g., 11, 111)
  - Decimal numbers (e.g., 1.1, .5)
- Final evaluation must result in an integer

### Generation Strategy
1. Pre-compute all possible leaf node combinations
2. Example combinations for seed=1:
   - `[1, 1, 1, 1]`
   - `[11, 1, 1]`
   - `[111, 1]`
   - `[1.1, 1.1]`
   - `[.1, .1, 11]`
   - `[.111, 1]`
3. Implement random selection from this pre-computed set

## AST Structure

### Node Types
1. Leaf Nodes (numbers)
2. Unary Operators
   - Factorial (!)
   - Square Root (sqrt)
3. Binary Operators
   - Addition (+)
   - Subtraction (-)
   - Multiplication (*)
   - Division (/)
   - Exponentiation (^)
   - Modulo (%)

### Constraints
- Primary constraint is evaluation size, not tree depth
- Guard against overflow in:
  - Factorial operations
  - Exponentiation
  - Large number multiplication
- Parentheses handled during string conversion, not in AST

## Generation Algorithm

### Core Process
1. Randomly select a leaf node combination
2. Generate random AST using selected leaf nodes
3. Evaluate AST with overflow protection
4. If result is integer ≤ 100, consider as potential puzzle

### Scoring System
1. Simplicity Score
   - Based on string length of final expression
   - Shorter expressions preferred for same target

2. Complexity Score
   - Number of unique operators used
   - Depth of expression tree
   - Higher scores indicate more interesting puzzles

### Dynamic Biasing
- Adjust generation parameters based on:
  - Coverage of target numbers (1-100)
  - Complexity of found solutions
  - Success rate of recent generations

## Storage and Output

### Puzzle Storage Format
```python
{
    "seed": int,
    "target": int,
    "expression": str,
    "ast": str,
    "complexity_score": float,
    "unique_operators": int
}
```

### Storage Strategy
- Keep simplest solution for each seed/target combination
- Additionally store complex/interesting solutions above complexity threshold
- Update solutions when simpler or more interesting variants found

## Implementation Notes

### Overflow Prevention
- Implement maximum thresholds for:
  - Intermediate calculation results
  - Factorial input size
  - Exponent sizes
  - Decimal precision

### Performance Optimization
- Cache leaf node combinations
- Implement early termination for overflow paths
- Use efficient AST evaluation strategies 