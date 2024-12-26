"""Script to clean up invalid solutions from all_puzzles.json."""
import json
from pathlib import Path

def find_seed(expr: str) -> int:
    """Find which digit 1-9 appears in the expression."""
    for seed in range(1, 10):
        if str(seed) in expr:
            return seed
    return None

def clean_solutions():
    """Clean up invalid solutions from all_puzzles.json."""
    puzzles_file = Path("puzzles/all_puzzles.json")
    if not puzzles_file.exists():
        print("No puzzles file found.")
        return
    
    # Load current solutions
    with open(puzzles_file) as f:
        all_solutions = json.load(f)
    
    # Track statistics
    total_moved = 0
    moves_by_seed = {}  # seed -> (moved_in, moved_out)
    
    # First pass: identify solutions that need to move
    solutions_to_move = []  # list of (from_seed, to_seed, target, data)
    for seed_str, targets in all_solutions.items():
        seed = int(seed_str)
        if seed not in moves_by_seed:
            moves_by_seed[seed] = [0, 0]  # [moved_in, moved_out]
        
        for target_str, sol_data in targets.items():
            expr = sol_data["expression"]
            correct_seed = find_seed(expr)
            
            # Only move if we found a valid seed and it's different
            if correct_seed is not None and correct_seed != seed:
                solutions_to_move.append((seed, correct_seed, target_str, sol_data))
                moves_by_seed[seed][1] += 1  # moved out
                if correct_seed not in moves_by_seed:
                    moves_by_seed[correct_seed] = [0, 0]
                moves_by_seed[correct_seed][0] += 1  # moved in
                total_moved += 1
                print(f"Will move solution from seed {seed} to {correct_seed} for target {target_str}:")
                print(f"  Expression: {expr}")
    
    if total_moved == 0:
        print("No solutions need to be moved.")
        return
    
    # Second pass: apply the moves
    cleaned_solutions = all_solutions.copy()
    
    # Remove solutions from their original seeds
    for from_seed, _, target_str, _ in solutions_to_move:
        if target_str in cleaned_solutions[str(from_seed)]:
            del cleaned_solutions[str(from_seed)][target_str]
    
    # Add solutions to their correct seeds
    for _, to_seed, target_str, sol_data in solutions_to_move:
        to_seed_str = str(to_seed)
        if to_seed_str not in cleaned_solutions:
            cleaned_solutions[to_seed_str] = {}
        
        # Only move if target doesn't exist in correct seed or new solution is simpler
        should_move = True
        if target_str in cleaned_solutions[to_seed_str]:
            existing_len = len(cleaned_solutions[to_seed_str][target_str]["expression"])
            new_len = len(sol_data["expression"])
            should_move = new_len < existing_len
        
        if should_move:
            cleaned_solutions[to_seed_str][target_str] = sol_data
    
    # Print summary
    print("\nCleaning Summary:")
    print(f"Total solutions moved: {total_moved}")
    
    print("\nMoves by seed:")
    for seed in sorted(moves_by_seed.keys()):
        moved_in, moved_out = moves_by_seed[seed]
        if moved_in > 0 or moved_out > 0:
            print(f"Seed {seed}:")
            if moved_in > 0:
                print(f"  Received {moved_in} solutions")
            if moved_out > 0:
                print(f"  Lost {moved_out} solutions")
    
    # Create backup of original file
    backup_file = puzzles_file.with_suffix('.json.bak')
    puzzles_file.rename(backup_file)
    print(f"\nOriginal file backed up to: {backup_file}")
    
    # Save cleaned solutions
    with open(puzzles_file, 'w') as f:
        json.dump(cleaned_solutions, f, indent=2)
    print(f"Cleaned solutions saved to: {puzzles_file}")

if __name__ == "__main__":
    clean_solutions() 