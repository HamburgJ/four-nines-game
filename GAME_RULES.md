# Four-nines Game Rules

## Overview
Four-nines is a mathematical puzzle game where players must create an expression that evaluates to a target number using exactly four instances of a given seed number.

## Game Parameters
- **Seed Number**: A single digit from 1 to 9
- **Target Number**: An integer from 1 to 100
- **Required Uses**: Exactly 4 occurrences of the seed number

## Allowed Operations
1. Basic Arithmetic:
   - Addition (+)
   - Subtraction (-)
   - Multiplication (*)
   - Division (/)
   - Exponentiation (^)
   - Modulo (%)
   - Factorial (!)
   - Square Root (sqrt)

2. Special Operations:
   - **Digit Concatenation**: Numbers can be formed by concatenating the seed digit
     - Example: If seed is 1, valid numbers include 11, 111, 1111
   - **Decimal Points**: Can be used with the seed number
     - Example: If seed is 5, valid numbers include .5, 5.5, 5.05
     - Restriction: Cannot add 0 digits in decimal places

## Rules and Constraints
1. **Expression Requirements**:
   - Must use the seed number exactly 4 times
   - Must evaluate to exactly the target number (no rounding or approximations)
   - Must follow standard order of operations (PEMDAS)

2. **Operational Rules**:
   - Parentheses can be used for grouping
   - Square root (sqrt) does not count as using the seed number
   - Modulo (%) is a binary operator that can be used with any numbers
   - Factorial (!) can be applied to positive integers

3. **Calculation Properties**:
   - Intermediate results can be non-real numbers
   - Negative numbers and zero are allowed in calculations
   - The final result must be exactly equal to the target
   - Implementation should include safeguards against excessive calculations (e.g., very large powers)

## Example Solutions
If seed = 1 and target = 22:
- Valid solution: `11 + 11` (uses 1 four times through concatenation)

If seed = 5 and target = 28:
- Valid solution: `5.5 * 5 + .5` (uses 5 four times with decimal points) 