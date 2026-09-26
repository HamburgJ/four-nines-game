import { type ReactNode, useEffect, useRef } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Native <dialog>: focus trapping, Escape and the backdrop come for free.
 * Rises from the bottom on phones, sits centered on desktop.
 */
export const Sheet = ({ open, onClose, title, children, footer }: SheetProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="fn-sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="fn-sheet-inner">
        <header className="fn-sheet-head">
          <h2 className="fn-sheet-title">{title}</h2>
          <button type="button" className="fn-sheet-close" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="fn-sheet-body">{children}</div>
        {footer && <footer className="fn-sheet-foot">{footer}</footer>}
      </div>
    </dialog>
  );
};
