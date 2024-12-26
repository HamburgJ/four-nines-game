"""Tests for the expression generator."""
import unittest
from decimal import Decimal
from expr_generator import ExpressionGenerator, PuzzleSolution

class TestExpressionGenerator(unittest.TestCase):
    def setUp(self):
        """Set up test cases."""
        self.generator = ExpressionGenerator(1)  # Using 1 as seed
    
    def test_random_operators(self):
        """Test random operator selection."""
        # Test unary operators
        for _ in range(10):
            op = self.generator._random_unary_op()
            self.assertIn(op, self.generator.UNARY_OPS)
        
        # Test binary operators
        for _ in range(10):
            op = self.generator._random_binary_op()
            self.assertIn(op, self.generator.BINARY_OPS)
    
    def test_expression_building(self):
        """Test random expression building."""
        # Test with single leaf node
        expr = self.generator._build_random_expr((Decimal('1'),))
        self.assertEqual(expr.evaluate(), Decimal('1'))
        
        # Test with multiple leaf nodes
        leaf_nodes = (Decimal('1'), Decimal('1'))
        expr = self.generator._build_random_expr(leaf_nodes)
        result = expr.evaluate()
        self.assertIsInstance(result, Decimal)
    
    def test_complexity_calculation(self):
        """Test complexity scoring."""
        # Get a random expression
        leaf_nodes = self.generator.leaf_generator.get_random_combination()
        expr = self.generator._build_random_expr(leaf_nodes)
        
        # Calculate complexity
        complexity, unique_ops = self.generator._calculate_complexity(expr)
        
        # Check score bounds
        self.assertGreaterEqual(complexity, 0)
        self.assertLessEqual(complexity, 1)
        
        # Check unique operators count
        self.assertGreaterEqual(unique_ops, 0)
        self.assertLessEqual(unique_ops, len(self.generator.UNARY_OPS) + len(self.generator.BINARY_OPS))
    
    def test_puzzle_generation(self):
        """Test puzzle generation."""
        # Try to generate a puzzle with narrow target range
        solution = self.generator.generate_puzzle(target_range=(1, 10))
        
        if solution:  # We might not always get a solution
            self.assertIsInstance(solution, PuzzleSolution)
            self.assertEqual(solution.seed, 1)
            self.assertGreaterEqual(solution.target, 1)
            self.assertLessEqual(solution.target, 10)
            self.assertGreater(len(solution.expression), 0)
            self.assertGreater(solution.complexity_score, 0)
            self.assertGreater(solution.unique_operators, 0)
    
    def test_multiple_puzzle_generation(self):
        """Test generating multiple puzzles."""
        solutions = self.generator.generate_puzzles(count=5, target_range=(1, 10))
        
        # Check that we got some solutions (might not get all 5)
        self.assertGreater(len(solutions), 0)
        
        # Check each solution
        for solution in solutions:
            self.assertIsInstance(solution, PuzzleSolution)
            self.assertEqual(solution.seed, 1)
            self.assertGreaterEqual(solution.target, 1)
            self.assertLessEqual(solution.target, 10)
    
    def test_solution_storage(self):
        """Test solution storage and retrieval."""
        # Generate some puzzles
        self.generator.generate_puzzles(count=5)
        
        # Get solutions
        solutions = self.generator.get_solutions()
        
        # Check that solutions are stored
        self.assertGreater(len(solutions), 0)
        
        # Check solution format
        for target, solution in solutions.items():
            self.assertEqual(solution.target, target)
            self.assertEqual(solution.seed, 1)

if __name__ == '__main__':
    unittest.main() 