"""Test script to verify expression generation."""
from expr_generator import ExpressionGenerator

def test_seed(seed: int, num_attempts: int = 10):
    """Test puzzle generation for a specific seed."""
    print(f"\nTesting seed {seed}...")
    generator = ExpressionGenerator(seed)
    
    for i in range(num_attempts):
        solution = generator.generate_puzzle()
        if solution:
            print(f"\nSolution {i+1}:")
            print(f"Expression: {solution.expression}")
            print(f"Target: {solution.target}")
            print(f"Seed count: {generator._count_seed_digits(solution.expression)}")
            print(f"Complexity: {solution.complexity_score:.2f}")
            print(f"Unique operators: {solution.unique_operators}")

if __name__ == "__main__":
    # Test with seed 9 since that was problematic
    test_seed(9) 