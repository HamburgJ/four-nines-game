import { Sheet } from './Sheet';

interface HelpSheetProps {
  open: boolean;
  onClose: () => void;
}

const Key = ({ children, digit = false }: { children: React.ReactNode; digit?: boolean }) => (
  <span className={`nl-keycap${digit ? ' nl-keycap--digit' : ''}`}>{children}</span>
);

export const HelpSheet = ({ open, onClose }: HelpSheetProps) => (
  <Sheet
    open={open}
    onClose={onClose}
    title="How to play"
    footer={
      <button type="button" className="nl-btn nl-btn--primary fn-sheet-cta" onClick={onClose}>
        Got it
      </button>
    }
  >
    <section className="fn-help-block">
      <p className="fn-help-lead">
        This calculator has one number key. Use it exactly four times to make the target.
      </p>
      <p className="nl-small">
        The digit changes every day, anywhere from 1 to 9. There are three puzzles a day:{' '}
        <span className="nl-chip nl-chip--green">Easy</span>{' '}
        <span className="nl-chip nl-chip--yellow">Medium</span>{' '}
        <span className="nl-chip nl-chip--red">Hard</span>
      </p>
    </section>

    <section className="fn-help-block">
      <h3 className="fn-help-h">The keys</h3>
      <ul className="fn-help-keys">
        <li>
          <Key>+</Key> <Key>−</Key> <Key>×</Key> <Key>÷</Key> <span>the usual four</span>
        </li>
        <li>
          <Key>(</Key> <Key>)</Key> <span>group things; order of operations applies</span>
        </li>
        <li>
          <Key>√</Key> <Key>x!</Key> <Key>xʸ</Key> <Key>%</Key> <span>square root, factorial, power, remainder</span>
        </li>
        <li>
          <Key digit>9</Key>
          <Key digit>9</Key> <span>press twice for 99 — that uses two of your four</span>
        </li>
        <li>
          <Key>.</Key>
          <Key digit>9</Key> <span>decimals work too: .9, 9.9</span>
        </li>
      </ul>
      <p className="nl-small">On a keyboard, just type. S is √, Backspace deletes, Esc clears.</p>
    </section>

    <section className="fn-help-block">
      <h3 className="fn-help-h">Scoring</h3>
      <p className="nl-small">
        Any solution counts. To get a better score, use fewer <strong>symbols</strong>: each operator and each decimal
        point costs 1. Parentheses are free. <strong>Par</strong> is the fewest symbols our solver found for that
        puzzle. The screen keeps count as you type.
      </p>
      <div className="nl-tape fn-help-tape">
        <div className="nl-tape-line">
          <span className="nl-tape-expr">99 + 9 ÷ 9</span>
          <span>= 100</span>
        </div>
        <hr className="nl-tape-rule" />
        <div className="nl-tape-line">
          <span>+ and ÷</span>
          <span>2 symbols</span>
        </div>
        <div className="nl-tape-line nl-tape-muted">
          <span>the four 9s</span>
          <span>free</span>
        </div>
      </div>
      <p className="nl-small">
        Stuck? The yellow HINT key reveals up to three clues about the par solution. After the third, it becomes GIVE UP.
      </p>
    </section>

    <section className="fn-help-block">
      <h3 className="fn-help-h">Streaks</h3>
      <p className="nl-small">
        Solve at least one puzzle on its own day to keep your streak going. Puzzles change at midnight UTC. Past days
        live in the archive; they count toward your stats but not your streak.
      </p>
    </section>
  </Sheet>
);
