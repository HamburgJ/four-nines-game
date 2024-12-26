"""Tests for AST node classes."""
import unittest
from decimal import Decimal
from ast_nodes import (
    NumberNode, UnaryOpNode, BinaryOpNode, EvaluationError,
    create_node, MAX_FACTORIAL, MAX_EXPONENT
)

class TestASTNodes(unittest.TestCase):
    def test_number_node(self):
        """Test basic number node functionality."""
        node = NumberNode(Decimal('5'))
        self.assertEqual(node.evaluate(), Decimal('5'))
        self.assertEqual(str(node), '5')
    
    def test_unary_operators(self):
        """Test unary operations (factorial and sqrt)."""
        # Test factorial
        fact_node = UnaryOpNode('!', NumberNode(Decimal('5')))
        self.assertEqual(fact_node.evaluate(), Decimal('120'))
        self.assertEqual(str(fact_node), '(5!)')
        
        # Test sqrt
        sqrt_node = UnaryOpNode('sqrt', NumberNode(Decimal('16')))
        self.assertEqual(sqrt_node.evaluate(), Decimal('4'))
        self.assertEqual(str(sqrt_node), 'sqrt(16)')
    
    def test_binary_operators(self):
        """Test all binary operations."""
        tests = [
            ('+', '5', '3', '8'),
            ('-', '5', '3', '2'),
            ('*', '5', '3', '15'),
            ('/', '15', '3', '5'),
            ('^', '2', '3', '8'),
            ('%', '17', '5', '2'),
        ]
        
        for op, left, right, expected in tests:
            node = BinaryOpNode(
                op,
                NumberNode(Decimal(left)),
                NumberNode(Decimal(right))
            )
            self.assertEqual(
                node.evaluate(),
                Decimal(expected),
                f"Failed for {left} {op} {right}"
            )
    
    def test_complex_expression(self):
        """Test a more complex expression tree."""
        # Testing (5! + sqrt(16)) * 2
        expr = BinaryOpNode(
            '*',
            BinaryOpNode(
                '+',
                UnaryOpNode('!', NumberNode(Decimal('5'))),
                UnaryOpNode('sqrt', NumberNode(Decimal('16')))
            ),
            NumberNode(Decimal('2'))
        )
        # 5! = 120, sqrt(16) = 4, 120 + 4 = 124, 124 * 2 = 248
        self.assertEqual(expr.evaluate(), Decimal('248'))
    
    def test_error_conditions(self):
        """Test various error conditions."""
        # Division by zero
        with self.assertRaises(EvaluationError):
            BinaryOpNode(
                '/',
                NumberNode(Decimal('1')),
                NumberNode(Decimal('0'))
            ).evaluate()
        
        # Negative sqrt
        with self.assertRaises(EvaluationError):
            UnaryOpNode(
                'sqrt',
                NumberNode(Decimal('-1'))
            ).evaluate()
        
        # Factorial of negative number
        with self.assertRaises(EvaluationError):
            UnaryOpNode(
                '!',
                NumberNode(Decimal('-1'))
            ).evaluate()
        
        # Factorial too large
        with self.assertRaises(EvaluationError):
            UnaryOpNode(
                '!',
                NumberNode(Decimal(str(MAX_FACTORIAL + 1)))
            ).evaluate()
        
        # Exponent too large
        with self.assertRaises(EvaluationError):
            BinaryOpNode(
                '^',
                NumberNode(Decimal('2')),
                NumberNode(Decimal(str(MAX_EXPONENT + 1)))
            ).evaluate()
        
        # Non-integer modulo
        with self.assertRaises(EvaluationError):
            BinaryOpNode(
                '%',
                NumberNode(Decimal('5.5')),
                NumberNode(Decimal('2'))
            ).evaluate()
    
    def test_node_factory(self):
        """Test the create_node factory function."""
        # Test number creation
        num_creator = create_node(Decimal('5'))
        self.assertIsInstance(num_creator, NumberNode)
        
        # Test unary op creation
        fact_creator = create_node('!')
        self.assertTrue(callable(fact_creator))
        fact_node = fact_creator(NumberNode(Decimal('5')))
        self.assertIsInstance(fact_node, UnaryOpNode)
        
        # Test binary op creation
        add_creator = create_node('+')
        self.assertTrue(callable(add_creator))
        add_node = add_creator(
            NumberNode(Decimal('5')),
            NumberNode(Decimal('3'))
        )
        self.assertIsInstance(add_node, BinaryOpNode)

if __name__ == '__main__':
    unittest.main() 