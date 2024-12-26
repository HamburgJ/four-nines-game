"""Debug script to print all leaf node combinations for a given seed."""
from leaf_nodes import LeafNodeGenerator

def print_combinations(seed: int):
    """Print all combinations for a given seed."""
    generator = LeafNodeGenerator(seed)
    print(f"\nAll combinations for seed {seed}:")
    for combo in generator.get_all_combinations():
        print(f"  {combo}")
    print(f"\nTotal combinations: {generator.count_combinations()}")

if __name__ == '__main__':
    print_combinations(1) 