import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface InfoModalProps {
  show: boolean;
  onHide: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>How to Play</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Goal</h5>
        <p>
          Create a mathematical expression that equals the target number using exactly 4 instances
          of the seed digit. The goal is to find a valid solution with the shortest possible length.
        </p>

        <h5>Core Rules</h5>
        <ul>
          <li>Use the seed digit exactly 4 times (no more, no less)</li>
          <li>The final result must equal the target number exactly</li>
          <li>Every character in your expression counts towards your score (including operators and parentheses)</li>
          <li>Lower score is better</li>
        </ul>

        <h5>Number Formation Rules</h5>
        <ul>
          <li>You can concatenate digits (e.g., if seed is 1, you can write 11 which counts as using two 1's)</li>
          <li>You can use decimals (e.g., 1.1 counts as using two 1's)</li>
          <li>Leading zeros are not allowed in concatenated numbers</li>
        </ul>

        <h5>Allowed Operations</h5>
        <div className="row">
          <div className="col-md-6">
            <h6>Basic Operators</h6>
            <ul>
              <li><code>+</code> Addition</li>
              <li><code>-</code> Subtraction</li>
              <li><code>*</code> Multiplication</li>
              <li><code>/</code> Division</li>
            </ul>
          </div>
          <div className="col-md-6">
            <h6>Advanced Operators</h6>
            <ul>
              <li><code>^</code> Exponentiation (x^y means x to the power of y)</li>
              <li><code>!</code> Factorial (only valid on positive integers)</li>
              <li><code>sqrt</code> Square root</li>
              <li><code>%</code> Modulo (remainder after division)</li>
            </ul>
          </div>
        </div>

        <h5>Additional Rules</h5>
        <ul>
          <li>Standard order of operations (PEMDAS) applies</li>
          <li>Parentheses <code>()</code> can be used for grouping</li>
          <li>Intermediate results can be any real number</li>
          <li>The final result must be an integer</li>
          <li>Negative numbers are allowed in calculations</li>
        </ul>

        <h5>Examples</h5>
        <p>If seed is 1 and target is 24:</p>
        <ul>
          <li><code>11*1+1*1</code> (score: 7) - Uses concatenation</li>
          <li><code>(1+1)!*1*1</code> (score: 9) - Uses factorial</li>
          <li><code>1.1*11*1</code> (score: 7) - Uses decimal and concatenation</li>
        </ul>

        <h5>Scoring</h5>
        <p>
          Your score is the total number of characters in your expression. This includes:
        </p>
        <ul>
          <li>All digits (including concatenated numbers)</li>
          <li>All operators (+, -, *, /, ^, %, !, sqrt)</li>
          <li>All parentheses</li>
          <li>All decimal points</li>
        </ul>
        <p>Lower scores are better. Try to find the shortest valid expression!</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Got it!
        </Button>
      </Modal.Footer>
    </Modal>
  );
}; 