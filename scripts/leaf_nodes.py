"""
Module for generating and managing leaf node combinations for the Four-nines puzzle.
Each leaf node combination must use exactly 4 instances of the seed digit.
"""
from typing import List, Set, Tuple
from decimal import Decimal, getcontext
from itertools import combinations_with_replacement

# Set precision for decimal calculations
getcontext().prec = 10

class LeafNodeGenerator:
    def __init__(self, seed: int):
        """Initialize generator for a specific seed digit.
        
        Args:
            seed: Integer from 1-9
        """
        if not isinstance(seed, int) or seed < 1 or seed > 9:
            raise ValueError("Seed must be an integer from 1-9")
        self.seed = seed
        self._combinations: Set[Tuple[Decimal, ...]] = set()
        self._generate_all_combinations()
    
    def _generate_all_combinations(self):
        """Generate all possible leaf node combinations using exactly 4 seed digits."""
        # Generate single digits (e.g., [1,1,1,1])
        self._add_single_digits()
        # Generate concatenated numbers (e.g., [11,1,1], [111,1])
        self._add_concatenated()
        # Generate decimal combinations (e.g., [1.1,1.1], [.1,1.1,1.1])
        self._add_decimals()
    
    def _add_single_digits(self):
        """Add combination of 4 single digits."""
        self._combinations.add((Decimal(self.seed),) * 4)
    
    def _add_concatenated(self):
        """Add combinations with concatenated digits."""
        # Two digits: 11
        two_digit = Decimal(str(self.seed) * 2)
        # Three digits: 111
        three_digit = Decimal(str(self.seed) * 3)
        
        # Add [11,1,1]
        self._combinations.add((two_digit, Decimal(self.seed), Decimal(self.seed)))
        # Add [111,1]
        self._combinations.add((three_digit, Decimal(self.seed)))
    
    def _add_decimals(self):
        """Add combinations with decimal points."""
        s = str(self.seed)
        
        # Generate all possible decimal numbers using 1-4 seed digits
        decimal_forms = set()
        
        # Leading decimal forms (e.g., .1, .11, .111)
        for i in range(1, 4):
            decimal_forms.add(Decimal('.' + s * i))
        
        # Internal decimal forms with 2 digits (e.g., 1.1)
        decimal_forms.add(Decimal(s + '.' + s))
        
        # Internal decimal forms with 3 digits (e.g., 11.1, 1.11)
        decimal_forms.add(Decimal(s * 2 + '.' + s))
        decimal_forms.add(Decimal(s + '.' + s * 2))
        
        # Internal decimal forms with 4 digits (e.g., 111.1, 11.11, 1.111)
        decimal_forms.add(Decimal(s * 3 + '.' + s))
        decimal_forms.add(Decimal(s * 2 + '.' + s * 2))
        decimal_forms.add(Decimal(s + '.' + s * 3))
        
        # For each decimal form, add combinations that total 4 seed digits
        for form in decimal_forms:
            seed_count = str(form).count(s)
            remaining = 4 - seed_count
            if remaining > 0:
                # Add combinations with remaining single digits
                single = Decimal(self.seed)
                remaining_combo = (single,) * remaining
                self._combinations.add((form,) + remaining_combo)
                
                # If we have exactly one remaining digit, also try it as a decimal
                if remaining == 1:
                    decimal_single = Decimal('.' + s)
                    self._combinations.add((form, decimal_single))
            elif remaining == 0:
                self._combinations.add((form,))
    
    def get_all_combinations(self) -> List[Tuple[Decimal, ...]]:
        """Return all valid leaf node combinations."""
        return sorted(list(self._combinations), key=lambda x: (len(x), str(x)))
    
    def get_random_combination(self) -> Tuple[Decimal, ...]:
        """Return a random combination from the set of valid combinations."""
        import random
        return random.choice(list(self._combinations))

    def count_combinations(self) -> int:
        """Return the total number of valid combinations."""
        return len(self._combinations) 