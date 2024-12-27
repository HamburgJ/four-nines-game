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
          Create a mathematical expression that equals the goal number using exactly 4 instances
          of the given digit.
        </p>

        <h5>Core Rules</h5>
        <ul>
          <li>Use the given digit exactly 4 times (no more, no less)</li>
          <li>The final result must equal the goal number exactly</li>
        </ul>

        <h5>Number Formation Rules</h5>
        <ul>
          <li>You can combine digits (e.g., if given 1, you can use 11, which counts as using two 1's)</li>
          <li>You can use decimal points (e.g., 1.1 counts as using two 1's)</li>
          <li>Leading zeros are not needed for decimal numbers (e.g., if given 1, you can use .1)</li>
        </ul>

        <h5>Allowed Operations</h5>
        <ul>
          <li><code>+</code> Addition</li>
          <li><code>-</code> Subtraction</li>
          <li><code>*</code> Multiplication</li>
          <li><code>/</code> Division</li>
          <li><code>^</code> Exponentiation</li>
              <li><code>!</code> Factorial</li>
              <li><code>sqrt</code> Square root</li>
              <li><code>%</code> Modulo (remainder after division)</li>
        </ul>

        <h5>Additional Rules</h5>
        <ul>
          <li>Standard order of operations (PEMDAS) applies</li>
          <li>Parentheses <code>()</code> can be used for grouping</li>
          <li>Intermediate results can be any real number</li>
        </ul>

        <h5>Examples</h5>
        <p>If you have the digit 4 and need to reach 1:</p>
        <ul>
          <li><code>4.4/4.4</code> = 1</li>
          <li><code>4-sqrt(4)-4/4</code> = 1</li>
          <li><code>.4/.4/.4/.4</code> = 1</li>
        </ul>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Got it!
        </Button>
      </Modal.Footer>
    </Modal>
  );
}; 