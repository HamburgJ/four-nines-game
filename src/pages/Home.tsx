import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <Container className="py-4 text-center">
      <h1 className="display-2 mb-4">Four Nines</h1>
      
      <p className="lead mb-5">
        Welcome to Four Nines, a daily mathematical puzzle game!
      </p>

      <div className="mb-5">
        <h2>Example</h2>
        <p>
          If the seed is 4 and the target is 24, some solutions might be:<br/>
          <code className="lead">44/4+4</code> (score: 6)<br/>
          <code className="lead">(4+4)*4-4</code> (score: 8)
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