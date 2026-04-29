import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <main className="home-shell">
      <section className="home-card" aria-labelledby="home-title">
        <div className="home-card-inner">
          <div className="title-plate">
            <h1 id="home-title" className="home-title">Four Nines</h1>
            <p className="home-subtitle">
              Make the target with exactly four matching digits.
            </p>
          </div>

          <div className="home-example">
            <p>If the digit is 4 and the target is 1, both of these work:</p>
            <code>4.4 / 4.4 = 1</code>
            <code>4 - sqrt(4) - 4 / 4 = 1</code>
          </div>

          <div className="home-actions">
            <Button as={Link as any} to="/play" size="lg" className="primary-action">
              Play Today's Puzzle
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}; 
