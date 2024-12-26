"""Expression generator for Four-nines puzzle."""
from typing import List, Set, Tuple, Optional, Dict
from decimal import Decimal
import random
from dataclasses import dataclass
from ast_nodes import Node, NumberNode, UnaryOpNode, BinaryOpNode, EvaluationError
from leaf_nodes import LeafNodeGenerator

@dataclass
class PuzzleSolution:
    """Represents a found solution for the puzzle."""
    seed: int
    target: int
    expression: str
    complexity_score: float
    unique_operators: int

# Configuration flags
USE_GENETIC = False  # Set to True to use genetic algorithm approach
MAX_DEPTH = None    # Set to an integer to limit expression depth, None for unlimited

class ExpressionGenerator:
    """Generates random expressions using leaf node combinations."""
    
    # Available operators
    UNARY_OPS = ['!', 'sqrt', 'neg']
    BINARY_OPS = ['+', '-', '*', '/', '^', '%']
    
    def __init__(self, seed: int):
        """Initialize generator with a seed number."""
        self.leaf_generator = LeafNodeGenerator(seed)
        self.seed = seed
        self._solutions: Dict[int, PuzzleSolution] = {}  # target -> solution
        self._tried_combinations: Set[str] = set()  # Track tried expressions
        self._consecutive_duplicates = 0  # Track how many times we've generated duplicates
        
        # Search configuration
        self.USE_GENETIC = True
        self.MAX_DEPTH = None
        
        # Genetic algorithm parameters (configurable)
        self._population_size = 50
        self._elite_size = 5
        self._mutation_rate = 0.3
        self._crossover_rate = 0.7
        self._binary_op_prob = 0.7
        self._tournament_size = 5
        self._population: List[Node] = []
        
        # Operator probabilities (will be adapted)
        self._unary_op_weights = {op: 1.0 for op in self.UNARY_OPS}
        self._binary_op_weights = {op: 1.0 for op in self.BINARY_OPS}
        # Start with higher weights for basic operators
        for op in ['+', '-', '*', '/']:
            self._binary_op_weights[op] = 2.0
    
    def generate_puzzle(self, target_range: Tuple[int, int] = (1, 100),
                       max_attempts: int = 1000) -> Optional[PuzzleSolution]:
        """Try to generate a puzzle with result in target range."""
        if USE_GENETIC:
            return self._generate_puzzle_genetic(target_range, max_attempts)
        else:
            return self._generate_puzzle_random(target_range, max_attempts)

    def _generate_puzzle_random(self, target_range: Tuple[int, int],
                              max_attempts: int) -> Optional[PuzzleSolution]:
        """Generate puzzle using random search approach."""
        min_target, max_target = target_range
        
        for _ in range(max_attempts):
            # Get random leaf node combination
            leaf_nodes = self.leaf_generator.get_random_combination()
            
            try:
                # Generate random expression
                expr = self._build_random_expr(leaf_nodes)
                expr_str = str(expr)
                
                # Skip if already tried
                if expr_str in self._tried_combinations:
                    self._consecutive_duplicates += 1
                    continue
                
                self._tried_combinations.add(expr_str)
                
                # Validate expression
                result = expr.evaluate()
                if self._count_seed_digits(expr_str) != 4:
                    continue
                
                # Check if result is valid (including negative values)
                result_int = int(result) if self._is_integer(result) else None
                if result_int is not None:
                    abs_result = abs(result_int)
                    if min_target <= abs_result <= max_target:
                        target = abs_result
                        complexity, unique_ops = self._calculate_complexity(expr)
                        
                        # If it's a negative result, wrap it in negation
                        if result_int < 0:
                            expr_str = f"-({expr_str})"
                            complexity = len(expr_str)  # Recalculate complexity with negation
                        
                        # Create solution
                        solution = PuzzleSolution(
                            seed=self.seed,
                            target=target,
                            expression=expr_str,
                            complexity_score=complexity,
                            unique_operators=unique_ops + (1 if result_int < 0 else 0)  # Add neg operator if used
                        )
                        
                        # Store if simpler than existing
                        if target not in self._solutions or (
                            solution.complexity_score < self._solutions[target].complexity_score
                        ):
                            self._solutions[target] = solution
                            self._consecutive_duplicates = 0
                            return solution
                
            except EvaluationError:
                continue
        
        return None

    def _generate_puzzle_genetic(self, target_range: Tuple[int, int],
                               max_attempts: int) -> Optional[PuzzleSolution]:
        """Generate puzzle using genetic algorithm approach."""
        min_target, max_target = target_range
        
        # Initialize population if empty
        if not self._population:
            self._population = [
                self._build_random_expr(self.leaf_generator.get_random_combination())
                for _ in range(self._population_size)
            ]
        
        for generation in range(max_attempts // self._population_size):
            self._evolve_population(target_range)
            
            # Check each expression in population
            for expr in self._population:
                try:
                    expr_str = str(expr)
                    
                    # Skip if already tried
                    if expr_str in self._tried_combinations:
                        self._consecutive_duplicates += 1
                        continue
                    
                    self._tried_combinations.add(expr_str)
                    
                    # Validate expression
                    result = expr.evaluate()
                    if self._count_seed_digits(expr_str) != 4:
                        continue
                    
                    # Check if result is valid (including negative values)
                    result_int = int(result) if self._is_integer(result) else None
                    if result_int is not None:
                        abs_result = abs(result_int)
                        if min_target <= abs_result <= max_target:
                            target = abs_result
                            complexity, unique_ops = self._calculate_complexity(expr)
                            
                            # If it's a negative result, wrap it in negation
                            if result_int < 0:
                                expr_str = f"-({expr_str})"
                                complexity = len(expr_str)  # Recalculate complexity with negation
                            
                            # Create solution
                            solution = PuzzleSolution(
                                seed=self.seed,
                                target=target,
                                expression=expr_str,
                                complexity_score=complexity,
                                unique_operators=unique_ops + (1 if result_int < 0 else 0)  # Add neg operator if used
                            )
                            
                            # Store if simpler than existing
                            if target not in self._solutions or (
                                solution.complexity_score < self._solutions[target].complexity_score
                            ):
                                # Update operator weights based on successful solution
                                self._update_operator_weights(solution)
                                
                                self._solutions[target] = solution
                                self._consecutive_duplicates = 0
                                
                                # Add successful expression back to population
                                self._population[0] = expr.clone()  # Replace worst performing
                                return solution
                    
                except EvaluationError:
                    continue
            
            # Occasionally inject fresh random expressions
            if generation % 10 == 0:
                self._population[-5:] = [
                    self._build_random_expr(self.leaf_generator.get_random_combination())
                    for _ in range(5)
                ]
        
        return None
    
    def _random_unary_op(self) -> str:
        """Return a random unary operator based on weights."""
        ops, weights = zip(*self._unary_op_weights.items())
        return random.choices(ops, weights=weights, k=1)[0]
    
    def _random_binary_op(self) -> str:
        """Return a random binary operator based on weights."""
        ops, weights = zip(*self._binary_op_weights.items())
        return random.choices(ops, weights=weights, k=1)[0]
    
    def _count_seed_digits(self, expr_str: str) -> int:
        """Count occurrences of seed digit in expression string.
        
        This method counts all occurrences of the seed digit, including:
        - Single digits (e.g., '1' in '1 + 1')
        - Concatenated numbers (e.g., both '1's in '11')
        - Decimal numbers (e.g., both '1's in '0.1' and '1.1')
        """
        seed_str = str(self.seed)
        count = 0
        
        # Split by operators and parentheses to isolate numbers
        parts = expr_str.replace('(', ' ').replace(')', ' ').split()
        
        for part in parts:
            # Skip operators
            if part in self.UNARY_OPS + self.BINARY_OPS:
                continue
            
            # Count all occurrences in this part
            count += part.count(seed_str)
        
        return count
    
    def _build_random_expr(self, leaf_nodes: Tuple[Decimal, ...], max_value: Decimal = Decimal('1e10'), depth: int = 0) -> Node:
        """Build a random expression tree using the given leaf nodes."""
        # Base cases: single node, max depth reached, or random termination
        if len(leaf_nodes) == 1 or (self.MAX_DEPTH and depth >= self.MAX_DEPTH) or random.random() < 0.1:
            return NumberNode(leaf_nodes[0])
        
        # Use configurable binary operation probability
        use_binary = len(leaf_nodes) >= 2 and random.random() < self._binary_op_prob
        
        try:
            if use_binary:
                op = self._random_binary_op()
                split_point = random.randint(1, len(leaf_nodes) - 1)
                left_nodes = leaf_nodes[:split_point]
                right_nodes = leaf_nodes[split_point:]
                
                left = self._build_random_expr(left_nodes, max_value, depth + 1)
                right = self._build_random_expr(right_nodes, max_value, depth + 1)
                
                # Create and test the node
                node = BinaryOpNode(op, left, right)
                result = node.evaluate()
                
                # If result is too large, try a different operator or structure
                if abs(result) > max_value:
                    # Try simpler operators for large values
                    if op in ['^', '*']:
                        new_op = random.choice(['+', '-', '/'])
                        node = BinaryOpNode(new_op, left, right)
                        result = node.evaluate()
                        if abs(result) <= max_value:
                            return node
                    raise ValueError("Result too large")
                
                return node
            else:
                op = self._random_unary_op()
                operand = self._build_random_expr(leaf_nodes, max_value, depth + 1)
                
                # Create and test the node
                node = UnaryOpNode(op, operand)
                result = node.evaluate()
                
                # If result is too large, try a different structure
                if abs(result) > max_value:
                    raise ValueError("Result too large")
                
                return node
                
        except (ValueError, EvaluationError):
            # If we hit a value limit or evaluation error, try a simpler expression
            if len(leaf_nodes) >= 2:
                # Split nodes and try a simple addition or subtraction
                mid = len(leaf_nodes) // 2
                left = self._build_random_expr(leaf_nodes[:mid], max_value, depth + 1)
                right = self._build_random_expr(leaf_nodes[mid:], max_value, depth + 1)
                return BinaryOpNode(random.choice(['+', '-']), left, right)
            return NumberNode(leaf_nodes[0])
    
    def _calculate_complexity(self, expr: Node) -> Tuple[float, int]:
        """Calculate complexity score and count unique operators.
        
        Returns:
            Tuple of (complexity_score, unique_operator_count)
            Lower complexity score means simpler expression
        """
        expr_str = str(expr)
        unique_ops = set()
        
        # Count unique operators
        for op in self.UNARY_OPS + self.BINARY_OPS:
            if op in expr_str:
                unique_ops.add(op)
        
        # Complexity is just the length of the expression string
        # Shorter expressions are simpler
        complexity = len(expr_str)
        
        return complexity, len(unique_ops)
    
    def _is_integer(self, value: Decimal) -> bool:
        """Check if a Decimal value is an integer."""
        return value == value.to_integral_value()
    
    def _calculate_fitness(self, expr: Node, target_range: Tuple[int, int]) -> float:
        """Calculate fitness score for an expression.
        
        Rewards expressions that:
        1. Use exactly 4 seed digits
        2. Produce integer results
        3. Get close to or within target range (including negatives)
        """
        try:
            result = expr.evaluate()
            expr_str = str(expr)
            min_target, max_target = target_range
            
            # Base fitness
            fitness = 0.0
            
            # Check seed digit count
            seed_count = self._count_seed_digits(expr_str)
            if seed_count == 4:
                fitness += 100.0
            else:
                # Penalize wrong number of digits, but still give partial credit
                fitness -= abs(4 - seed_count) * 20
            
            # Check if result is integer
            if self._is_integer(result):
                fitness += 50.0
                
                # If integer, check if in range or negative equivalent
                result_int = int(result)
                abs_result = abs(result_int)
                
                # Consider both positive and negative ranges
                in_positive_range = min_target <= result_int <= max_target
                in_negative_range = min_target <= -result_int <= max_target
                
                if in_positive_range or in_negative_range:
                    fitness += 200.0
                else:
                    # Reward getting closer to either range
                    positive_distance = min(abs(result_int - min_target), abs(result_int - max_target))
                    negative_distance = min(abs(-result_int - min_target), abs(-result_int - max_target))
                    distance = min(positive_distance, negative_distance)
                    fitness += 100.0 / (1.0 + float(distance))
            else:
                # Reward being close to an integer
                distance_to_integer = abs(float(result - result.to_integral_value()))
                if distance_to_integer < 1:
                    fitness += 25.0 / (1.0 + distance_to_integer)
            
            # Penalize very large intermediate values
            if abs(result) > 1e6:
                fitness -= 50.0
            
            return max(0.0, fitness)  # Ensure non-negative fitness
            
        except EvaluationError:
            return 0.0  # Invalid expressions get zero fitness
    
    def _mutate_expr(self, expr: Node) -> Node:
        """Mutate an expression by randomly changing operators or structure."""
        if random.random() < self._mutation_rate:  # Use configurable mutation rate
            if isinstance(expr, BinaryOpNode):
                # Maybe change operator
                if random.random() < 0.5:
                    expr.op = self._random_binary_op()
                else:
                    # Mutate children
                    expr.left = self._mutate_expr(expr.left)
                    expr.right = self._mutate_expr(expr.right)
            elif isinstance(expr, UnaryOpNode):
                if random.random() < 0.5:
                    expr.op = self._random_unary_op()
                else:
                    expr.operand = self._mutate_expr(expr.operand)
        return expr
    
    def _crossover(self, expr1: Node, expr2: Node) -> Tuple[Node, Node]:
        """Perform crossover between two expressions."""
        # Deep copy the expressions
        new_expr1 = expr1.clone()
        new_expr2 = expr2.clone()
        
        # Find all subexpressions
        def get_subexpressions(expr: Node) -> List[Node]:
            result = [expr]
            if isinstance(expr, BinaryOpNode):
                result.extend(get_subexpressions(expr.left))
                result.extend(get_subexpressions(expr.right))
            elif isinstance(expr, UnaryOpNode):
                result.extend(get_subexpressions(expr.operand))
            return result
        
        # Randomly swap subexpressions
        if random.random() < self._crossover_rate:  # Use configurable crossover rate
            subexpr1 = get_subexpressions(new_expr1)
            subexpr2 = get_subexpressions(new_expr2)
            
            if len(subexpr1) > 1 and len(subexpr2) > 1:
                # Don't select root nodes for swapping
                idx1 = random.randint(1, len(subexpr1) - 1)
                idx2 = random.randint(1, len(subexpr2) - 1)
                
                node1 = subexpr1[idx1]
                node2 = subexpr2[idx2]
                parent1 = node1.parent
                parent2 = node2.parent
                
                if parent1 and parent2:
                    # Create clones of the nodes to swap
                    clone1 = node1.clone()
                    clone2 = node2.clone()
                    
                    # Update parent references
                    if isinstance(parent1, BinaryOpNode):
                        if parent1.left == node1:
                            parent1.left = clone2
                            clone2.set_parent(parent1)
                        else:
                            parent1.right = clone2
                            clone2.set_parent(parent1)
                    else:  # UnaryOpNode
                        parent1.operand = clone2
                        clone2.set_parent(parent1)
                        
                    if isinstance(parent2, BinaryOpNode):
                        if parent2.left == node2:
                            parent2.left = clone1
                            clone1.set_parent(parent2)
                        else:
                            parent2.right = clone1
                            clone1.set_parent(parent2)
                    else:  # UnaryOpNode
                        parent2.operand = clone1
                        clone1.set_parent(parent2)
        
        return new_expr1, new_expr2
    
    def _evolve_population(self, target_range: Tuple[int, int]) -> None:
        """Evolve the current population using genetic algorithms."""
        # Calculate fitness for all expressions
        fitness_scores = [(expr, self._calculate_fitness(expr, target_range)) 
                         for expr in self._population]
        
        # Sort by fitness
        fitness_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Keep elite individuals
        new_population = [expr for expr, _ in fitness_scores[:self._elite_size]]
        
        # Generate rest of population through selection, crossover, and mutation
        while len(new_population) < self._population_size:
            # Tournament selection
            tournament1 = random.sample(fitness_scores, self._tournament_size)
            tournament2 = random.sample(fitness_scores, self._tournament_size)
            parent1 = max(tournament1, key=lambda x: x[1])[0]
            parent2 = max(tournament2, key=lambda x: x[1])[0]
            
            # Crossover
            child1, child2 = self._crossover(parent1, parent2)
            
            # Mutation
            child1 = self._mutate_expr(child1)
            child2 = self._mutate_expr(child2)
            
            new_population.extend([child1, child2])
        
        # Trim to population size
        self._population = new_population[:self._population_size]
    
    def generate_puzzles(self, count: int = 100, 
                        target_range: Tuple[int, int] = (1, 100)) -> List[PuzzleSolution]:
        """Generate multiple puzzles.
        
        Args:
            count: Number of puzzles to try to generate
            target_range: Tuple of (min_target, max_target)
        
        Returns:
            List of found solutions
        """
        solutions = []
        for _ in range(count):
            solution = self.generate_puzzle(target_range)
            if solution:
                solutions.append(solution)
        return solutions
    
    def get_solutions(self) -> Dict[int, PuzzleSolution]:
        """Get all found solutions."""
        return self._solutions.copy() 
    
    def _update_operator_weights(self, solution: PuzzleSolution):
        """Update operator weights based on successful solution."""
        expr = solution.expression
        
        # Count operator occurrences in successful expression
        unary_counts = {op: expr.count(op) for op in self.UNARY_OPS}
        binary_counts = {op: expr.count(f" {op} ") for op in self.BINARY_OPS}  # Space-padded to avoid substring matches
        
        # Update weights with exponential moving average
        learning_rate = 0.1
        for op in self.UNARY_OPS:
            if unary_counts[op] > 0:
                self._unary_op_weights[op] *= (1 + learning_rate)
            else:
                self._unary_op_weights[op] *= (1 - learning_rate * 0.5)
            self._unary_op_weights[op] = max(0.1, min(5.0, self._unary_op_weights[op]))
        
        for op in self.BINARY_OPS:
            if binary_counts[op] > 0:
                self._binary_op_weights[op] *= (1 + learning_rate)
            else:
                self._binary_op_weights[op] *= (1 - learning_rate * 0.5)
            self._binary_op_weights[op] = max(0.1, min(5.0, self._binary_op_weights[op])) 