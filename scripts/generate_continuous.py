"""Script to continuously generate puzzles, cycling through all seeds."""
from expr_generator import ExpressionGenerator, PuzzleSolution
import json
from pathlib import Path
import time
import signal
import sys
import argparse
from typing import Dict, Optional, Set
from collections import defaultdict
import random

# Available search strategies
DEPTH_OPTIONS = [5, 10, 15, 20, None]  # None represents unlimited depth

class SearchStrategy:
    """Represents a genetic algorithm search configuration."""
    def __init__(self, name: str, max_depth: Optional[int] = None,
                 mutation_rate: float = 0.3,
                 crossover_rate: float = 0.7,
                 binary_op_prob: float = 0.7,
                 elite_size: int = 10,
                 population_size: int = 50,
                 tournament_size: int = 5):
        self.name = name
        self.max_depth = max_depth
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.binary_op_prob = binary_op_prob
        self.elite_size = elite_size
        self.population_size = population_size
        self.tournament_size = tournament_size
        self.use_genetic = True

    def __str__(self) -> str:
        return (f"Genetic (depth={self.max_depth}, mut={self.mutation_rate:.2f}, "
                f"cross={self.crossover_rate:.2f}, bin={self.binary_op_prob:.2f})")

    @classmethod
    def create_adaptive(cls, solutions_found: int, solutions_improved: int) -> 'SearchStrategy':
        """Create a strategy based on recent performance."""
        total_improvements = solutions_found + solutions_improved
        
        # Stay shallow if finding solutions
        max_depth = 10
        
        # Adjust mutation rate based on improvements
        if solutions_improved > solutions_found:
            mutation_rate = 0.4  # More mutation if improving existing
        else:
            mutation_rate = 0.2  # Less mutation if finding new ones
        
        # Adjust crossover rate inversely to mutation
        crossover_rate = 0.9 - mutation_rate
        
        # Adjust binary operation probability
        if total_improvements == 0:
            binary_op_prob = 0.5  # More variety if stuck
        else:
            binary_op_prob = 0.7  # Prefer binary if progressing
        
        # Adjust population parameters
        if total_improvements == 0:
            population_size = 100  # Larger population if stuck
            elite_size = 10
            tournament_size = 7
        else:
            population_size = 50  # Smaller population if progressing
            elite_size = 5
            tournament_size = 5
        
        return cls(
            name="Adaptive Genetic",
            max_depth=max_depth,
            mutation_rate=mutation_rate,
            crossover_rate=crossover_rate,
            binary_op_prob=binary_op_prob,
            elite_size=elite_size,
            population_size=population_size,
            tournament_size=tournament_size
        )

class PuzzleGenerator:
    """Continuously generates puzzles for all seeds."""
    
    def __init__(self, time_per_seed: int = 300):
        """Initialize generator.
        
        Args:
            time_per_seed: Time to spend on each seed in seconds
        """
        self.time_per_seed = time_per_seed
        self.solutions: Dict[int, Dict[int, PuzzleSolution]] = {}
        self.current_seed = 1
        self.generator: Optional[ExpressionGenerator] = None
        self.start_time = 0
        self.should_stop = False
        self.current_strategy: Optional[SearchStrategy] = None
        self.total_possible = 900  # 9 seeds * 100 targets
        self.last_solutions_found = 0
        self.last_solutions_improved = 0
        
        # Load existing solutions
        self._load_solutions()
        
        # Setup interrupt handler
        signal.signal(signal.SIGINT, self._handle_interrupt)
    
    def _load_solutions(self):
        """Load existing solutions from file."""
        puzzles_file = Path("puzzles/all_puzzles.json")
        if puzzles_file.exists():
            try:
                with open(puzzles_file) as f:
                    data = json.load(f)
                    for seed_str, targets in data.items():
                        seed = int(seed_str)
                        self.solutions[seed] = {}
                        for target_str, sol_data in targets.items():
                            target = int(target_str)
                            self.solutions[seed][target] = PuzzleSolution(
                                seed=seed,
                                target=target,
                                expression=sol_data["expression"],
                                complexity_score=len(sol_data["expression"]),
                                unique_operators=sol_data.get("unique_operators", 0)
                            )
                print(f"Loaded existing solutions from {puzzles_file}")
            except Exception as e:
                print(f"Error loading solutions: {e}")
    
    def _handle_interrupt(self, signum, frame):
        """Handle interrupt signal gracefully."""
        print("\nGracefully stopping... saving progress...")
        self.should_stop = True
    
    def _save_solutions(self, seed: int):
        """Save solutions for a seed to JSON files."""
        if seed not in self.solutions:
            return
        
        # Save to seed-specific file
        solutions_dir = Path("solutions")
        solutions_dir.mkdir(exist_ok=True)
        
        solutions_file = solutions_dir / f"seed_{seed}_solutions.json"
        solutions_dict = {
            target: {
                "expression": sol.expression,
                "complexity": sol.complexity_score,
                "unique_operators": sol.unique_operators
            }
            for target, sol in self.solutions[seed].items()
        }
        
        with open(solutions_file, "w") as f:
            json.dump(solutions_dict, f, indent=2)
        
        # Save to all_puzzles.json
        puzzles_dir = Path("puzzles")
        puzzles_dir.mkdir(exist_ok=True)
        all_puzzles_file = puzzles_dir / "all_puzzles.json"
        
        # Load existing data if any
        all_solutions = {}
        if all_puzzles_file.exists():
            try:
                with open(all_puzzles_file) as f:
                    all_solutions = json.load(f)
            except Exception:
                pass
        
        # Update with current solutions
        all_solutions[str(seed)] = solutions_dict
        
        # Save back
        with open(all_puzzles_file, "w") as f:
            json.dump(all_solutions, f, indent=2)
    
    def _count_seed_digits(self, expr_str: str, seed: int) -> int:
        """Count occurrences of seed digit in expression string."""
        seed_str = str(seed)
        count = 0
        
        # Split by operators and parentheses to isolate numbers
        parts = expr_str.replace('(', ' ').replace(')', ' ').split()
        
        # Available operators to skip
        operators = ['!', 'sqrt', 'neg', '+', '-', '*', '/', '^', '%']
        
        for part in parts:
            # Skip operators
            if part in operators:
                continue
            
            # Count all occurrences in this part
            count += part.count(seed_str)
    
    def _print_stats(self):
        """Print current statistics."""
        print("\nCurrent Statistics:")
        total_solutions = 0
        for seed in range(1, 10):
            if seed in self.solutions:
                solutions_count = len(self.solutions[seed])
                total_solutions += solutions_count
                print(f"Seed {seed}: {solutions_count} unique targets")
        
        completion = (total_solutions / self.total_possible) * 100
        print(f"\nTotal Progress: {total_solutions}/{self.total_possible} ({completion:.1f}%)")
        
        # Print missing targets for each seed
        print("\nMissing targets:")
        for seed in range(1, 10):
            if seed in self.solutions:
                found = set(self.solutions[seed].keys())
                missing = set(range(1, 101)) - found
                if missing:
                    print(f"Seed {seed} missing {len(missing)} targets: {sorted(missing)[:10]}...")
    
    def _choose_strategy(self) -> SearchStrategy:
        """Choose genetic strategy based on recent performance."""
        return SearchStrategy.create_adaptive(
            self.last_solutions_found,
            self.last_solutions_improved
        )
    
    def run(self):
        """Run continuous puzzle generation."""
        print("Starting continuous puzzle generation...")
        print("Press Ctrl+C to gracefully stop\n")
        
        while not self.should_stop:
            print(f"\nWorking on seed {self.current_seed}...")
            
            # Choose new strategy based on previous performance
            self.current_strategy = self._choose_strategy()
            print(f"Using strategy: {self.current_strategy}")
            
            # Store initial solutions count for comparison
            initial_solutions = len(self.solutions.get(self.current_seed, {}))
            initial_solutions_by_length = {}
            if self.current_seed in self.solutions:
                for target, sol in self.solutions[self.current_seed].items():
                    initial_solutions_by_length[target] = len(sol.expression)
            
            # Configure generator with current strategy
            self.generator = ExpressionGenerator(self.current_seed)
            self.generator.USE_GENETIC = True
            self.generator.MAX_DEPTH = self.current_strategy.max_depth
            
            # Configure genetic algorithm parameters
            self.generator._population_size = self.current_strategy.population_size
            self.generator._elite_size = self.current_strategy.elite_size
            self.generator._mutation_rate = self.current_strategy.mutation_rate
            self.generator._crossover_rate = self.current_strategy.crossover_rate
            self.generator._binary_op_prob = self.current_strategy.binary_op_prob
            self.generator._tournament_size = self.current_strategy.tournament_size
            
            # Initialize solutions dict for this seed
            if self.current_seed not in self.solutions:
                self.solutions[self.current_seed] = {}
            
            # Load existing solutions
            self.generator._solutions = self.solutions[self.current_seed]
            
            self.start_time = time.time()
            solutions_found = 0
            solutions_improved = 0
            
            while time.time() - self.start_time < self.time_per_seed and not self.should_stop:
                solution = self.generator.generate_puzzle()
                if solution:
                    target = solution.target
                    if target not in self.solutions[self.current_seed]:
                        solutions_found += 1
                        print(f"Found new solution for target {target}: {solution.expression}")
                    elif len(solution.expression) < len(self.solutions[self.current_seed][target].expression):
                        solutions_improved += 1
                        print(f"Found simpler solution for target {target}: {solution.expression}")
                    self.solutions[self.current_seed].update(self.generator._solutions)
            
            # Store performance for next strategy selection
            self.last_solutions_found = solutions_found
            self.last_solutions_improved = solutions_improved
            
            # Save progress after each seed
            self._save_solutions(self.current_seed)
            
            # Print detailed progress
            final_solutions = len(self.solutions[self.current_seed])
            print(f"\nSeed {self.current_seed} completed:")
            print(f"- Initial solutions: {initial_solutions}")
            print(f"- New solutions found: {solutions_found}")
            print(f"- Solutions improved: {solutions_improved}")
            print(f"- Final solutions: {final_solutions}")
            
            # Print improvements details
            if solutions_improved > 0:
                print("\nImprovements made:")
                for target, sol in self.solutions[self.current_seed].items():
                    if target in initial_solutions_by_length:
                        old_len = initial_solutions_by_length[target]
                        new_len = len(sol.expression)
                        if new_len < old_len:
                            print(f"  Target {target}: {old_len} -> {new_len} chars")
            
            self._print_stats()
            
            # Move to next seed
            self.current_seed = (self.current_seed % 9) + 1
        
        # Final save
        if self.generator:
            self.solutions[self.current_seed].update(self.generator._solutions)
            self._save_solutions(self.current_seed)
        
        print("\nGeneration stopped. Progress saved.")
        self._print_stats()

def main():
    """Main entry point."""
    import argparse
    parser = argparse.ArgumentParser(description="Generate Four-nines puzzles continuously")
    parser.add_argument("--time-per-seed", type=int, default=1,
                       help="Time to spend on each seed in seconds")
    args = parser.parse_args()
    
    generator = PuzzleGenerator(args.time_per_seed)
    generator.run()

if __name__ == "__main__":
    main() 