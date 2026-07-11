import { Modal, Form, Button } from 'react-bootstrap';
import { useGameState } from '../hooks/useGameState';

interface SettingsModalProps {
  show: boolean;
  onHide: () => void;
}

export const SettingsModal = ({ show, onHide }: SettingsModalProps) => {
  const { resetGameState } = useGameState();

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all game progress?')) {
      resetGameState();
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="modal-game">
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <p className="settings-note">
            Reset your saved progress and today's puzzle state.
          </p>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="danger"
          onClick={handleReset}
        >
          Reset Progress
        </Button>
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}; 
