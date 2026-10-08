import { type ReactNode, useEffect, useRef } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Inert everything in the app except the sheet and shared site chrome
 * ([data-burger-ui], e.g. burgerfun.ca's logo), the way showModal() would.
 * Returns the undo.
 */
const inertAround = (keep: Element[]): (() => void) => {
  const changed: HTMLElement[] = [];
  const kept = (element: Element) => keep.includes(element) || element.hasAttribute('data-burger-ui');
  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (kept(child)) continue;
      if (keep.some((element) => child.contains(element)) || child.querySelector('[data-burger-ui]')) walk(child);
      else if (child instanceof HTMLElement && !child.inert) {
        child.inert = true;
        changed.push(child);
      }
    }
  };
  walk(document.getElementById('root') ?? document.body);
  return () => changed.forEach((element) => (element.inert = false));
};

/**
 * Rises from the bottom on phones, sits centered on desktop. A non-modal
 * <dialog> over its own scrim: showModal() would put it in the top layer and
 * make the site's logo unreachable, so Escape, the scrim and the inert page
 * behind are handled here instead.
 */
export const Sheet = ({ open, onClose, title, children, footer }: SheetProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.show();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return undefined;
    const restore = inertAround(scrimRef.current ? [dialog, scrimRef.current] : [dialog]);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      restore();
    };
  }, [open]);

  return (
    <>
      <div ref={scrimRef} className="fn-sheet-scrim" hidden={!open} onClick={onClose} />
      <dialog ref={ref} className="fn-sheet" aria-label={title} aria-modal="true" onClose={onClose}>
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
    </>
  );
};
