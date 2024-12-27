import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <Container className="py-4 text-center">
      <h1 className="game-title mb-4">Four Nines</h1>
      
      <p className="lead mb-5">
        Find a mathematical formula using exactly four of the same digit to reach today's goal number!
      </p>

      <div className="mb-5">
        <h2>Example</h2>
        <p>
          If you have the digit 4 and need to reach 1, you could write:<br/>
          <code className="lead">4.4/4.4</code> = 1<br/>
          <code className="lead">4-sqrt(4)-4/4</code> = 4-2-1 = 1
        </p>
      </div>

      <div className="d-grid gap-2 col-md-6 mx-auto">
        <Link to="/play">
          <Button variant="primary" size="lg" className="w-100">
            Play Today's Puzzle
          </Button>
        </Link>
      </div>
    </Container>
  );
}; 