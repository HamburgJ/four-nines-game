"""Tests for the leaf node generator module."""
import unittest
from decimal import Decimal
from leaf_nodes import LeafNodeGenerator

class TestLeafNodeGenerator(unittest.TestCase):
    def setUp(self):
        """Set up test cases."""
        self.generator = LeafNodeGenerator(1)  # Using 1 as seed for tests
    
    def test_invalid_seed(self):
        """Test that invalid seeds raise ValueError."""
        with self.assertRaises(ValueError):
            LeafNodeGenerator(0)  # Too small
        with self.assertRaises(ValueError):
            LeafNodeGenerator(10)  # Too large
        with self.assertRaises(ValueError):
            LeafNodeGenerator(-1)  # Negative
    
    def test_single_digits(self):
        """Test generation of single digit combinations."""
        combinations = self.generator.get_all_combinations()
        self.assertIn((Decimal('1'), Decimal('1'), Decimal('1'), Decimal('1')), combinations)
    
    def test_concatenated(self):
        """Test generation of concatenated number combinations."""
        combinations = self.generator.get_all_combinations()
        self.assertIn((Decimal('11'), Decimal('1'), Decimal('1')), combinations)
        self.assertIn((Decimal('111'), Decimal('1')), combinations)
    
    def test_decimals(self):
        """Test generation of decimal number combinations."""
        combinations = self.generator.get_all_combinations()
        # Test some decimal combinations
        self.assertIn((Decimal('1.1'), Decimal('1'), Decimal('1')), combinations)
        self.assertIn((Decimal('.1'), Decimal('1'), Decimal('1'), Decimal('1')), combinations)
    
    def test_seed_count(self):
        """Test that all combinations use exactly 4 seed digits."""
        combinations = self.generator.get_all_combinations()
        for combo in combinations:
            total_seeds = sum(str(num).count('1') for num in combo)
            self.assertEqual(total_seeds, 4, f"Combination {combo} does not use exactly 4 seeds")
    
    def test_random_combination(self):
        """Test random combination selection."""
        random_combo = self.generator.get_random_combination()
        self.assertIn(random_combo, self.generator.get_all_combinations())
        # Test seed count in random combination
        total_seeds = sum(str(num).count('1') for num in random_combo)
        self.assertEqual(total_seeds, 4)

if __name__ == '__main__':
    unittest.main() 