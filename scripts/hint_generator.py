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
            expr: Expression string like "((1 + 1) * (1 + 1))"
            
        Returns:
            Root Node of the AST
            
        Raises:
            ValueError: If the expression is invalid
        """
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
                if not expr:  # Handle "()"
                    raise ValueError("Empty parentheses")
                continue
            break
            
        # First check for unary operators
        if expr.startswith('sqrt('):
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
            inner = expr[:-1].strip()
            if not inner:
                raise ValueError("Empty factorial")
            return UnaryOpNode('!', self.parse(inner))
            
        elif expr.startswith('-'):
            # Handle both negative numbers and unary minus
            if expr[1].isdigit() or expr[1] == '.':
                # Negative number
                try:
                    return NumberNode(Decimal(expr))
                except:
                    raise ValueError(f"Invalid negative number: {expr}")
            else:
                # Unary minus operator
                inner = expr[1:].strip()
                if not inner:
                    raise ValueError("Empty negation")
                return UnaryOpNode('neg', self.parse(inner))
            
        # Look for exponents first (right associative)
        exp_pos = self._find_exponent_operator(expr)
        if exp_pos is not None:
            left = expr[:exp_pos].strip()
            right = expr[exp_pos + 1:].strip()
            if not left or not right:
                raise ValueError("Missing operand for operator ^")
            return BinaryOpNode('^', self.parse(left), self.parse(right))
            
        # Then look for other binary operators at the root level
        op_pos = self._find_root_operator(expr)
        if op_pos is not None:
            op, pos = op_pos
            left = expr[:pos].strip()
            right = expr[pos + 1:].strip()
            if not left or not right:
                raise ValueError(f"Missing operand for operator {op}")
            return BinaryOpNode(op, self.parse(left), self.parse(right))
                
        # If no operators found, must be a number
        try:
            return NumberNode(Decimal(expr))
        except:
            raise ValueError(f"Invalid number: {expr}")
            
    def _find_exponent_operator(self, expr: str) -> Optional[int]:
        """Find the rightmost exponent operator at the root level.
        
        Returns:
            Position of the operator or None if not found
        """
        # Scan right to left to handle right associativity
        depth = 0
        for i in range(len(expr) - 1, -1, -1):
            char = expr[i]
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
            elif depth == 0 and char == '^':
                return i
        return None
            
    def _find_root_operator(self, expr: str) -> Optional[Tuple[str, int]]:
        """Find the root level operator in an expression.
        
        Returns:
            Tuple of (operator, position) or None if no operator found
        """
        # Binary operators to look for, in order of precedence (lowest to highest)
        binary_ops = [('+', '-'), ('*', '/', '%')]  # Exponents handled separately
        
        # Look for operators at root level (depth 0)
        depth = 0
        for op_group in binary_ops:
            # Scan right to left to handle left-associative operators
            for i in range(len(expr) - 1, -1, -1):
                char = expr[i]
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
                elif depth == 0 and char in op_group:
                    # Make sure it's not a unary minus
                    if char == '-' and (i == 0 or expr[i-1] in '(+-*/^%'):
                        continue
                    return (char, i)
        return None

class HintGenerator:
    """Generates different types of hints for puzzle expressions."""
    
    def __init__(self):
        self.parser = ExpressionParser()
        
    def get_hints(self, expr: str) -> ExpressionHints:
        """Generate all types of hints for an expression.
        
        Args:
            expr: Expression string like "((1 + 1) * (1 + 1))"
            
        Returns:
            ExpressionHints object containing different types of hints
        """
        ast = self.parser.parse(expr)
        return ExpressionHints(
            leaf_values=self._get_leaf_values(ast),
            operators=self._get_operators(ast),
            subtrees=self._get_subtrees(ast, expr)
        )
        
    def _get_leaf_values(self, node: Node) -> List[str]:
        """Get all leaf values in the expression."""
        leaves = []
        
        def collect_leaves(n: Node):
            if isinstance(n, NumberNode):
                leaves.append(str(n))
            elif isinstance(n, UnaryOpNode):
                collect_leaves(n.operand)
            elif isinstance(n, BinaryOpNode):
                collect_leaves(n.left)
                collect_leaves(n.right)
                
        collect_leaves(node)
        return sorted(leaves)
        
    def _get_operators(self, node: Node) -> List[str]:
        """Get all operators used in the expression."""
        ops = set()
        
        def collect_ops(n: Node):
            if isinstance(n, UnaryOpNode):
                ops.add(n.op)
                collect_ops(n.operand)
            elif isinstance(n, BinaryOpNode):
                ops.add(n.op)
                collect_ops(n.left)
                collect_ops(n.right)
                
        collect_ops(node)
        return sorted(list(ops))
        
    def _get_subtrees(self, node: Node, full_expr: str) -> List[str]:
        """Get all non-trivial subtrees in the expression, sorted by complexity.
        
        Args:
            node: The root node of the AST
            full_expr: The full expression string to exclude from subtrees
        """
        subtrees = set()  # Use a set to avoid duplicates
        
        def collect_subtrees(n: Node):
            if isinstance(n, (UnaryOpNode, BinaryOpNode)):
                expr = str(n)
                # Only include non-trivial subtrees that aren't the full expression
                if len(expr) > 3 and expr != full_expr:
                    subtrees.add(expr)
                if isinstance(n, UnaryOpNode):
                    collect_subtrees(n.operand)
                else:
                    collect_subtrees(n.left)
                    collect_subtrees(n.right)
                    
        collect_subtrees(node)
        # Sort by length as a simple proxy for complexity
        return sorted(list(subtrees), key=len)

def add_hints_to_puzzles(input_file: str, output_file: str):
    """Add hints to all puzzles in the input file and save to output file."""
    with open(input_file, 'r') as f:
        puzzles = json.load(f)
        
    hint_gen = HintGenerator()
    error_count = 0
    
    # Add hints to each puzzle
    for digit in puzzles:
        for target in puzzles[digit]:
            puzzle = puzzles[digit][target]
            try:
                hints = hint_gen.get_hints(puzzle['expression'])
                puzzle['hints'] = {
                    'leaf_values': hints.leaf_values,
                    'operators': hints.operators,
                    'subtrees': hints.subtrees
                }
            except Exception as e:
                error_count += 1
                print(f"Error processing puzzle {digit}->{target}: {e}")
                print(f"Expression: {puzzle['expression']}")
            
    # Save the enhanced puzzles
    with open(output_file, 'w') as f:
        json.dump(puzzles, f, indent=2)
        
    if error_count > 0:
        print(f"\nTotal errors: {error_count}")
    else:
        print("\nAll puzzles processed successfully!")

if __name__ == '__main__':
    add_hints_to_puzzles('puzzles/all_puzzles.json', 'puzzles/all_puzzles_with_hints.json') 