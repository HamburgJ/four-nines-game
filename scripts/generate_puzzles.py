"""Script to generate Four-nines puzzles."""
from expr_generator import ExpressionGenerator
import json
from pathlib import Path
import time

def load_existing_solutions() -> dict:
    """Load existing solutions from all_puzzles.json."""
    solutions_file = Path("puzzles/all_puzzles.json")
    if solutions_file.exists():
        with open(solutions_file, "r") as f:
            return json.load(f)
    return {}

def merge_solutions(existing_solutions: dict, new_solutions: dict, seed: int) -> dict:
    """Merge new solutions with existing ones, keeping better solutions."""
    # Initialize seed dict if it doesn't exist
    if str(seed) not in existing_solutions:
        existing_solutions[str(seed)] = {}
    
    # For each new solution
    for target, solution in new_solutions.items():
        target_str = str(target)
        existing_target = existing_solutions[str(seed)].get(target_str, {})
        
        # If target doesn't exist or new solution is simpler
        if (not existing_target or 
            solution["complexity"] < existing_target.get("complexity", float('inf'))):
            existing_solutions[str(seed)][target_str] = solution
    
    return existing_solutions

def generate_puzzles_for_config(seed: int, max_depth: int, time_limit: int = 10) -> None:
    """Generate puzzles for a specific configuration with time limit."""
    print(f"\nGenerating puzzles for seed {seed} with max_depth {max_depth}...")
    generator = ExpressionGenerator(seed)
    
    # Set configuration for brute force search
    generator.USE_GENETIC = False
    generator.MAX_DEPTH = max_depth
    
    solutions = []
    start_time = time.time()
    attempts = 0
    
    while time.time() - start_time < time_limit:
        solution = generator.generate_puzzle()
        attempts += 1
        if solution:
            solutions.append(solution)
    
    elapsed = time.time() - start_time
    print(f"Time elapsed: {elapsed:.2f}s")
    print(f"Attempts: {attempts}")
    print(f"Found {len(solutions)} solutions:")
    
    for solution in sorted(solutions, key=lambda s: (s.target, -s.complexity_score)):
        print(f"\nTarget: {solution.target}")
        print(f"Expression: {solution.expression}")
        print(f"Complexity: {solution.complexity_score:.2f}")
        print(f"Unique operators: {solution.unique_operators}")
    
    # Load existing solutions
    existing_solutions = load_existing_solutions()
    
    # Convert new solutions to dictionary format
    solutions_dict = {
        s.target: {
            "seed": s.seed,
            "expression": s.expression,
            "complexity": s.complexity_score,
            "unique_operators": s.unique_operators
        }
        for s in solutions
    }
    
    # Merge solutions
    merged_solutions = merge_solutions(existing_solutions, solutions_dict, seed)
    
    # Save merged solutions
    output_file = Path("puzzles/all_puzzles.json")
    with open(output_file, "w") as f:
        json.dump(merged_solutions, f, indent=2)
    
    print(f"\nMerged and saved solutions to {output_file}")

def main():
    """Generate puzzles using grid search over seeds and max depths."""
    MIN_DEPTH = 2
    MAX_DEPTH = 11
    TIME_PER_CONFIG = 10  # seconds
    
    print(f"Starting grid search with {TIME_PER_CONFIG}s per configuration")
    print(f"Max depths: {MIN_DEPTH} to {MAX_DEPTH}")
    
    total_configs = 9 * (MAX_DEPTH - MIN_DEPTH + 1)
    current_config = 0
    
    for seed in range(1, 10):
        for max_depth in range(MIN_DEPTH, MAX_DEPTH + 1):
            current_config += 1
            print(f"\nProgress: {current_config}/{total_configs} configurations")
            generate_puzzles_for_config(seed, max_depth, TIME_PER_CONFIG)

if __name__ == "__main__":
    main() 