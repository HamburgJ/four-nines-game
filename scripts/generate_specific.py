"""Script to generate puzzles for a specific seed with more control."""
from expr_generator import ExpressionGenerator
import json
from pathlib import Path
import argparse

def generate_puzzles(seed: int, count: int = 100, 
                    min_target: int = 1, max_target: int = 100,
                    min_complexity: float = 0.0) -> None:
    """Generate puzzles with specific constraints.
    
    Args:
        seed: The seed number (1-9)
        count: Number of puzzles to try to generate
        min_target: Minimum target value
        max_target: Maximum target value
        min_complexity: Minimum complexity score to save a solution
    """
    print(f"\nGenerating puzzles for seed {seed}...")
    print(f"Target range: {min_target}-{max_target}")
    print(f"Minimum complexity: {min_complexity}")
    
    generator = ExpressionGenerator(seed)
    solutions = []
    
    # Generate solutions
    while len(solutions) < count:
        solution = generator.generate_puzzle(target_range=(min_target, max_target))
        if solution and solution.complexity_score >= min_complexity:
            solutions.append(solution)
    
    # Sort solutions by target and complexity
    solutions.sort(key=lambda s: (s.target, -s.complexity_score))
    
    # Print solutions
    print(f"\nFound {len(solutions)} solutions:")
    for solution in solutions:
        print(f"\nTarget: {solution.target}")
        print(f"Expression: {solution.expression}")
        print(f"Complexity: {solution.complexity_score:.2f}")
        print(f"Unique operators: {solution.unique_operators}")
    
    # Save to file
    output_dir = Path("puzzles")
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / f"seed_{seed}_puzzles_filtered.json"
    with open(output_file, "w") as f:
        solutions_dict = {
            s.target: {
                "seed": s.seed,
                "expression": s.expression,
                "complexity_score": s.complexity_score,
                "unique_operators": s.unique_operators
            }
            for s in solutions
        }
        json.dump(solutions_dict, f, indent=2)
    
    print(f"\nSaved solutions to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Generate Four-nines puzzles with specific constraints")
    parser.add_argument("seed", type=int, help="Seed number (1-9)")
    parser.add_argument("--count", type=int, default=100, help="Number of puzzles to generate")
    parser.add_argument("--min-target", type=int, default=1, help="Minimum target value")
    parser.add_argument("--max-target", type=int, default=100, help="Maximum target value")
    parser.add_argument("--min-complexity", type=float, default=0.0, help="Minimum complexity score")
    
    args = parser.parse_args()
    
    if not 1 <= args.seed <= 9:
        print("Error: Seed must be between 1 and 9")
        return
    
    generate_puzzles(
        seed=args.seed,
        count=args.count,
        min_target=args.min_target,
        max_target=args.max_target,
        min_complexity=args.min_complexity
    )

if __name__ == "__main__":
    main() 