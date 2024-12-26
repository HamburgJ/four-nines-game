"""AST node classes for the Four-nines puzzle expressions."""
from abc import ABC, abstractmethod
from decimal import Decimal, getcontext, InvalidOperation, Overflow
from math import factorial, sqrt
from typing import Union, List, Optional

# Set precision for decimal calculations
getcontext().prec = 10

# Constants for overflow protection
MAX_FACTORIAL = 20  # Beyond this, numbers get too large
MAX_EXPONENT = 20   # Limit exponentiation
MAX_NUMBER = Decimal('1e20')  # General size limit for intermediate results

class EvaluationError(Exception):
    """Raised when expression evaluation fails or exceeds limits."""
    pass

class Node(ABC):
    """Abstract base class for all AST nodes."""
    
    def __init__(self):
        self.parent = None
    
    @abstractmethod
    def evaluate(self) -> Decimal:
        """Evaluate this node's expression."""
        pass
    
    @abstractmethod
    def __str__(self) -> str:
        """Convert node to string representation."""
        pass
    
    def _check_overflow(self, value: Decimal) -> Decimal:
        """Check if a value exceeds our computation limits."""
        if abs(value) > MAX_NUMBER:
            raise EvaluationError(f"Value {value} exceeds maximum allowed size")
        return value
    
    def _is_integer(self, value: Decimal) -> bool:
        """Check if a Decimal value is an integer."""
        return value == value.to_integral_value()
    
    @abstractmethod
    def clone(self) -> 'Node':
        """Create a deep copy of this node."""
        pass
    
    def set_parent(self, parent: Optional['Node']) -> None:
        """Set the parent of this node."""
        self.parent = parent

class NumberNode(Node):
    """Leaf node representing a number."""
    def __init__(self, value: Decimal):
        super().__init__()
        self.value = value
    
    def evaluate(self) -> Decimal:
        return self.value
    
    def __str__(self) -> str:
        return str(self.value)
    
    def clone(self) -> 'NumberNode':
        """Create a deep copy of this number node."""
        return NumberNode(self.value)

class UnaryOpNode(Node):
    """Node representing a unary operation."""
    def __init__(self, op: str, operand: Node):
        super().__init__()
        self.op = op
        self.operand = operand
        self.operand.set_parent(self)
    
    def evaluate(self) -> Decimal:
        value = self.operand.evaluate()
        
        if self.op == 'sqrt':
            # Skip sqrt for 0 and 1 as they are fixed points
            if value in (Decimal('0'), Decimal('1')):
                return value
            if value < 0:
                raise EvaluationError("Cannot take square root of negative number")
            try:
                result = Decimal(sqrt(float(value)))  # Convert to float for sqrt
                return self._check_overflow(result)
            except (ValueError, InvalidOperation) as e:
                raise EvaluationError(f"Square root evaluation failed: {e}")
                
        elif self.op == '!':
            # Skip factorial for 1 as it's a fixed point
            if value == Decimal('1'):
                return value
            if not self._is_integer(value):
                raise EvaluationError("Factorial only defined for integers")
            if value < 0:
                raise EvaluationError("Factorial only defined for non-negative integers")
            if value > MAX_FACTORIAL:
                raise EvaluationError(f"Factorial input {value} too large")
            try:
                result = Decimal(factorial(int(value)))
                return self._check_overflow(result)
            except (ValueError, OverflowError) as e:
                raise EvaluationError(f"Factorial evaluation failed: {e}")
        
        elif self.op == 'neg':
            # Prevent double negatives as they're fixed points
            if isinstance(self.operand, UnaryOpNode) and self.operand.op == 'neg':
                raise EvaluationError("Double negatives not allowed")
            return -value
        
        raise ValueError(f"Unknown unary operator: {self.op}")
    
    def __str__(self) -> str:
        if self.op == '!':
            return f"({self.operand}!)"
        elif self.op == 'neg':
            # Special case for negative numbers to avoid double parentheses
            if isinstance(self.operand, NumberNode):
                return f"-{self.operand}"
            return f"-({self.operand})"
        return f"{self.op}({self.operand})"
    
    def clone(self) -> 'UnaryOpNode':
        """Create a deep copy of this unary operation node."""
        new_node = UnaryOpNode(self.op, self.operand.clone())
        return new_node

class BinaryOpNode(Node):
    """Node representing a binary operation."""
    def __init__(self, op: str, left: Node, right: Node):
        super().__init__()
        self.op = op
        self.left = left
        self.right = right
        self.left.set_parent(self)
        self.right.set_parent(self)
    
    def evaluate(self) -> Decimal:
        left_val = self.left.evaluate()
        right_val = self.right.evaluate()
        
        try:
            if self.op == '+':
                result = left_val + right_val
            elif self.op == '-':
                result = left_val - right_val
            elif self.op == '*':
                result = left_val * right_val
            elif self.op == '/':
                if right_val == 0:
                    raise EvaluationError("Division by zero")
                result = left_val / right_val
            elif self.op == '^':
                if right_val > MAX_EXPONENT:
                    raise EvaluationError(f"Exponent {right_val} too large")
                if abs(left_val) > 100:  # Additional base size check
                    raise EvaluationError(f"Base {left_val} too large for exponentiation")
                try:
                    # Handle negative bases with integer exponents
                    if left_val < 0 and not self._is_integer(right_val):
                        raise EvaluationError("Cannot raise negative number to non-integer power")
                    # Handle exponentiation with integer powers directly
                    if self._is_integer(right_val):
                        result = left_val ** int(right_val)
                    else:
                        result = Decimal.exp(right_val * Decimal.ln(abs(left_val)))
                        if left_val < 0 and int(right_val) % 2 == 1:
                            result = -result
                except (Overflow, InvalidOperation):
                    raise EvaluationError("Exponentiation result too large")
            elif self.op == '%':
                if right_val == 0:
                    raise EvaluationError("Modulo by zero")
                if not self._is_integer(right_val) or not self._is_integer(left_val):
                    raise EvaluationError("Modulo requires integer operands")
                result = left_val % right_val
            else:
                raise ValueError(f"Unknown binary operator: {self.op}")
            
            return self._check_overflow(result)
            
        except (InvalidOperation, OverflowError) as e:
            raise EvaluationError(f"Operation {self.op} failed: {e}")
    
    def __str__(self) -> str:
        return f"({self.left} {self.op} {self.right})"
    
    def clone(self) -> 'BinaryOpNode':
        """Create a deep copy of this binary operation node."""
        new_node = BinaryOpNode(self.op, self.left.clone(), self.right.clone())
        return new_node

def create_node(value: Union[Decimal, str, List]) -> Node:
    """Factory function to create appropriate node types."""
    if isinstance(value, Decimal):
        return NumberNode(value)
    elif isinstance(value, str):
        if value in ['!', 'sqrt']:
            return lambda x: UnaryOpNode(value, x)
        elif value in ['+', '-', '*', '/', '^', '%']:
            return lambda x, y: BinaryOpNode(value, x, y)
        raise ValueError(f"Unknown operator: {value}")
    
    raise ValueError(f"Invalid node value: {value}") 