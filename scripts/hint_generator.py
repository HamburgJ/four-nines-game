"""Hint generator for Four-nines puzzle expressions."""
from typing import List, Dict, Set, Optional, Any, Tuple
from dataclasses import dataclass
import json
from ast_nodes import Node, NumberNode, UnaryOpNode, BinaryOpNode
from decimal import Decimal

@dataclass
class ExpressionHints:
    """Container for different types of hints for an expression."""
    leaf_values: List[str]  # The leaf values used (e.g., ["1", "1", "11", "1"])
    operators: List[str]    # The operators used (e.g., ["+", "*", "!"])
    subtrees: List[str]     # Subexpressions, sorted by complexity (e.g., ["(1 + 1)", "((1 + 1) * 11)"])

class ExpressionParser:
    """Parser to convert expression strings into AST nodes."""
    
    def parse(self, expr: str) -> Node:
        """Parse an expression string into an AST.
        
        Args:
            expr: Expression string like "((4 + 4) * (4 + 4))"
            
        Returns:
            Root Node of the AST
            
        Raises:
            ValueError: If the expression is invalid
        """
        print(f"Parsing expression: {expr}")
        # Handle empty or whitespace-only strings
        expr = expr.strip()
        if not expr:
            raise ValueError("Empty expression")
            
        # Remove outer parentheses if they exist
        while expr[0] == '(' and expr[-1] == ')':
            # Make sure the parentheses match
            depth = 0
            for i, char in enumerate(expr[:-1]):  # Skip last char since we know it's ')'
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
                if depth == 0 and i < len(expr) - 1:
                    # These parentheses don't match
                    break
            else:
                # They matched, remove them
                expr = expr[1:-1].strip()
                print(f"Removed outer parentheses: {expr}")
                if not expr:  # Handle "()"
                    raise ValueError("Empty parentheses")
                continue
            break
            
        # First check for unary operators
        if expr.startswith('sqrt('):
            print("Found sqrt operator")
            # Find matching closing parenthesis
            depth = 1
            for i in range(5, len(expr)):
                if expr[i] == '(':
                    depth += 1
                elif expr[i] == ')':
                    depth -= 1
                    if depth == 0:
                        inner = expr[5:i]
                        if not inner:
                            raise ValueError("Empty sqrt()")
                        return UnaryOpNode('sqrt', self.parse(inner))
            raise ValueError("Unmatched parenthesis in sqrt")
            
        elif expr.endswith('!'):
            print("Found factorial operator")
            inner = expr[:-1].strip()
            if not inner:
                raise ValueError("Empty factorial")
            return UnaryOpNode('!', self.parse(inner))
            
        elif expr.startswith('-'):
            print("Found minus sign")
            # Handle both negative numbers and unary minus
            if len(expr) > 1 and (expr[1].isdigit() or expr[1] == '.'):
                print("Treating as negative number")
                # Negative number
                try:
                    return NumberNode(Decimal(expr))
                except:
                    raise ValueError(f"Invalid negative number: {expr}")
            else:
                print("Treating as unary minus")
                # Unary minus operator
                inner = expr[1:].strip()
                if not inner:
                    raise ValueError("Empty negation")
                return UnaryOpNode('neg', self.parse(inner))
                    
        # Then look for binary operators at the root level
        # Process operators in order of precedence (highest to lowest)
        operators_by_precedence = [
            '+-',     # Addition and subtraction (lowest precedence)
            '*/%',   # Multiplication, division, modulo
            '^',     # Exponentiation (highest precedence)
        ]
        
        for operators in operators_by_precedence:
            depth = 0
            for i in range(len(expr) - 1, -1, -1):  # Scan right to left
                char = expr[i]
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
                elif depth == 0 and char in operators:
                    # Skip if it's part of a number like "1.0"
                    if char == '.' and i > 0 and expr[i-1].isdigit() and i < len(expr)-1 and expr[i+1].isdigit():
                        continue
                    # Skip if it's a unary minus
                    if char == '-' and (i == 0 or expr[i-1] in '(+-*/^%'):
                        continue
                    
                    print(f"Found binary operator {char} at index {i}")
                    left = expr[:i].strip()
                    right = expr[i+1:].strip()
                    print(f"Processing operator {char}:")
                    print(f"  Left: {left}")
                    print(f"  Right: {right}")
                    
                    if not left or not right:
                        raise ValueError(f"Missing operand for operator {char}")
                        
                    # Special handling for negative exponents
                    if char == '^' and right.startswith('-'):
                        print("Found negative exponent")
                        inner = right[1:].strip()
                        if not inner:
                            raise ValueError("Empty negation in exponent")
                        return BinaryOpNode('^', self.parse(left), UnaryOpNode('neg', self.parse(inner)))
                        
                    return BinaryOpNode(char, self.parse(left), self.parse(right))
                    
        # If no operators found, must be a number
        print("No operators found, treating as number")
        try:
            # Handle decimal numbers
            if expr.startswith('0.'):
                return NumberNode(Decimal(expr))
            # Handle other numbers
            return NumberNode(Decimal(expr))
        except:
            raise ValueError(f"Invalid number: {expr}")
            
    def _get_operators(self, node: Node) -> List[str]:
        """Get all operators used in the expression."""
        ops = set()
        
        def collect_ops(n: Node):
            if isinstance(n, UnaryOpNode):
                # Include negation operator
                if n.op == 'neg':
                    ops.add('-')
                else:
                    ops.add(n.op)
                collect_ops(n.operand)
            elif isinstance(n, BinaryOpNode):
                ops.add(n.op)
                collect_ops(n.left)
                collect_ops(n.right)
                
        collect_ops(node)
        return sorted(list(ops))
        
    def _get_subtrees(self, node: Node) -> List[str]:
        """Get all non-trivial subtrees in the expression, sorted by complexity."""
        subtrees = set()
        
        def collect_subtrees(n: Node):
            if isinstance(n, UnaryOpNode):
                # Add the operand first
                collect_subtrees(n.operand)
                # Then add the full unary expression
                expr = str(n)
                if not isinstance(n.operand, NumberNode):
                    subtrees.add(expr)
            elif isinstance(n, BinaryOpNode):
                # Add left and right subtrees first
                collect_subtrees(n.left)
                collect_subtrees(n.right)
                # Then add the full binary expression
                expr = str(n)
                subtrees.add(expr)
                    
        collect_subtrees(node)
        # Sort by length as a proxy for complexity
        sorted_subtrees = sorted(list(subtrees), key=len)
        # Remove the last item which is the full expression
        return sorted_subtrees[:-1] if sorted_subtrees else []

class HintGenerator:
    """Generates hints for puzzle expressions."""
    
    def __init__(self):
        self.parser = ExpressionParser()
        
    def add_hints_to_puzzles(self, puzzles: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Add hints to each puzzle in the dictionary.
        
        Args:
            puzzles: Dictionary mapping puzzle IDs to puzzle data
            
        Returns:
            Updated puzzles dictionary with hints added
        """
        successes = 0
        errors = 0
        filtered_puzzles = {}
        
        for digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']:
            print(f"\nProcessing digit {digit}")
            if digit not in puzzles:
                continue
                
            filtered_puzzles[digit] = {}
            
            for target_str, puzzle in puzzles[digit].items():
                target = int(target_str)
                # Skip puzzles where target is 1
                if target == 1:
                    print(f"Skipping puzzle {digit}->{target} (target is 1)")
                    continue
                    
                expr = puzzle.get('expression')
                if not expr:
                    print(f"Warning: No expression for puzzle {digit}->{target}")
                    errors += 1
                    continue
                    
                print(f"\nProcessing puzzle {digit}->{target}")
                print(f"Expression: {expr}")
                
                try:
                    hints = self.generate_hints(expr)
                    print("Generated hints:")
                    print(f"  leaf_values: {hints.leaf_values}")
                    print(f"  operators: {hints.operators}")
                    print(f"  subtrees: {hints.subtrees}")
                    
                    puzzle['hints'] = {
                        'leaf_values': hints.leaf_values,
                        'operators': hints.operators,
                        'subtrees': hints.subtrees
                    }
                    filtered_puzzles[digit][target_str] = puzzle
                    successes += 1
                    
                except Exception as e:
                    print(f"Error generating hints for puzzle {digit}->{target}: {e}")
                    errors += 1
                    
        print(f"\nProcessed {successes + errors} puzzles total:")
        print(f"Successes: {successes}")
        print(f"Errors: {errors}")
        print(f"Skipped all puzzles with target=1")
        
        if errors > 0:
            print(f"Warning: {errors} puzzles had errors")
            
        return filtered_puzzles
        
    def generate_hints(self, expr: str) -> ExpressionHints:
        """Generate hints for a puzzle expression.
        
        Args:
            expr: Expression string like "((4 + 4) * (4 + 4))"
            
        Returns:
            ExpressionHints object containing leaf values, operators and subtrees
            
        Raises:
            ValueError: If the expression is invalid
        """
        # Parse expression into AST
        ast = self.parser.parse(expr)
        
        # Extract hints from AST
        return ExpressionHints(
            leaf_values=self._get_leaf_values(ast),
            operators=self._get_operators(ast),
            subtrees=self._get_subtrees(ast)
        )
        
    def _get_leaf_values(self, node: Node) -> List[str]:
        """Get all unique leaf values used in the expression."""
        values = set()
        
        def collect_values(n: Node):
            if isinstance(n, NumberNode):
                # Convert to float to handle decimals
                val = float(n.value)
                # Convert back to string, preserving decimals
                if val.is_integer():
                    values.add(str(int(val)))
                else:
                    values.add(str(val))
            elif isinstance(n, UnaryOpNode):
                collect_values(n.operand)
            elif isinstance(n, BinaryOpNode):
                collect_values(n.left)
                collect_values(n.right)
                
        collect_values(node)
        return sorted(list(values))
        
    def _get_operators(self, node: Node) -> List[str]:
        """Get all operators used in the expression."""
        ops = set()
        
        def collect_ops(n: Node):
            if isinstance(n, UnaryOpNode):
                # Include negation operator
                if n.op == 'neg':
                    ops.add('-')
                else:
                    ops.add(n.op)
                collect_ops(n.operand)
            elif isinstance(n, BinaryOpNode):
                ops.add(n.op)
                collect_ops(n.left)
                collect_ops(n.right)
                
        collect_ops(node)
        return sorted(list(ops))
        
    def _get_subtrees(self, node: Node) -> List[str]:
        """Get all non-trivial subtrees in the expression, sorted by complexity."""
        subtrees = set()
        
        def collect_subtrees(n: Node):
            if isinstance(n, UnaryOpNode):
                # Add the operand first
                collect_subtrees(n.operand)
                # Then add the full unary expression
                expr = str(n)
                if not isinstance(n.operand, NumberNode):
                    subtrees.add(expr)
            elif isinstance(n, BinaryOpNode):
                # Add left and right subtrees first
                collect_subtrees(n.left)
                collect_subtrees(n.right)
                # Then add the full binary expression
                expr = str(n)
                subtrees.add(expr)
                    
        collect_subtrees(node)
        # Sort by length as a proxy for complexity
        sorted_subtrees = sorted(list(subtrees), key=len)
        # Remove the last item which is the full expression
        return sorted_subtrees[:-1] if sorted_subtrees else []

def add_hints_to_puzzles(input_file: str, output_file: str, test_puzzle: str = None):
    """Add hints to all puzzles in the input file and save to output file.
    
    Args:
        input_file: Path to input JSON file containing puzzles
        output_file: Path to output JSON file to write results
        test_puzzle: Optional puzzle ID to test (format: "digit->target", e.g. "4->57")
    """
    print(f"Reading puzzles from {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        puzzles = json.load(f)
        
    hint_gen = HintGenerator()
    error_count = 0
    success_count = 0
    
    if test_puzzle:
        # Test mode - only process specified puzzle
        digit, target = test_puzzle.split('->')
        if digit not in puzzles or target not in puzzles[digit]:
            print(f"Error: Puzzle {test_puzzle} not found")
            return
            
        puzzle = puzzles[digit][target]
        print(f"\nTesting puzzle {test_puzzle}")
        print(f"Expression: {puzzle['expression']}")
        
        try:
            hints = hint_gen.generate_hints(puzzle['expression'])
            puzzle['hints'] = {
                'leaf_values': hints.leaf_values,
                'operators': hints.operators,
                'subtrees': hints.subtrees
            }
            success_count += 1
            print(f"\nGenerated hints:")
            print(json.dumps(puzzle['hints'], indent=2))
            
        except Exception as e:
            error_count += 1
            print(f"Error processing puzzle {test_puzzle}: {e}")
            print(f"Expression: {puzzle['expression']}")
            import traceback
            traceback.print_exc()
            
    else:
        # Normal mode - process all puzzles
        filtered_puzzles = hint_gen.add_hints_to_puzzles(puzzles)
            
    print(f"\nWriting results to {output_file}")
    try:
        # First verify we can serialize the data
        output_data = puzzles if test_puzzle else filtered_puzzles
        json_str = json.dumps(output_data, indent=2, ensure_ascii=False)
        print(f"Successfully serialized {len(json_str)} bytes")
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(json_str)
        print(f"Successfully wrote to {output_file}")
            
        # Verify the file was written correctly
        with open(output_file, 'r', encoding='utf-8') as f:
            verification = json.load(f)
        print(f"Successfully verified file contents")
        
        if test_puzzle:
            # In test mode, show the final hints for the test puzzle
            digit, target = test_puzzle.split('->')
            print(f"\nFinal hints for puzzle {test_puzzle}:")
            print(json.dumps(verification[digit][target]['hints'], indent=2))
            
    except Exception as e:
        print(f"Error writing file: {e}")
        return
        
    if error_count > 0:
        print(f"\nTotal errors: {error_count}")
    else:
        print("\nAll puzzles processed successfully!")

if __name__ == '__main__':
    import sys
    test_puzzle = sys.argv[1] if len(sys.argv) > 1 else None
    add_hints_to_puzzles('puzzles/all_puzzles.json', 'puzzles/all_puzzles_with_hints.json', test_puzzle) 