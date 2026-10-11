import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { CloseIcon } from '../icons';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useScrollLock } from '../../hooks/useScrollLock';
import { afterNextPaint } from '../../lib/afterNextPaint';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional header row: a title and a close button. Omit for a bare sheet. */
  title?: string;
  /**
   * Custom content for the header row, in place of the `title` heading (the
   * close button stays). `title` still names the dialog for screen readers.
   */
  header?: ReactNode;
  /** Extra class on the sheet element. */
  className?: string;
  children: ReactNode;
}

/** Matches the transition duration in `04-components/bottom-sheet.scss`. */
const TRANSITION_MS = 300;

/**
 * A panel that slides up from the bottom of the screen behind a backdrop — the
 * mobile pattern for filters, sort, and similar. Portalled to `<body>`.
 *
 * Enter animation is theme-owned: `mounted` keeps it in the tree through the
 * exit, and the open class is flipped only after a forced reflow so the closed
 * transform always has a starting frame (mirrors the header nav drawer).
 * Styling: `04-components/bottom-sheet.scss`.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  header,
  className,
  children,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setEntered(false);
    const unmount = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(unmount);
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    void sheetRef.current?.offsetWidth;
    return afterNextPaint(() => setEntered(true));
  }, [mounted, open]);

  // Move focus into the sheet on open, trap Tab, restore it to the trigger on close.
  useDialogFocus(sheetRef, mounted && entered);

  // `onClose` is only read inside the listener, not a reactive value — wrap it
  // so a new closure from the parent doesn't tear down and re-add the listener.
  const onCloseEvent = useEffectEvent(onClose);
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseEvent();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`bottom-sheet-root${entered ? ' is-open' : ''}`}
      // useDialogFocus traps Tab and Escape closes the sheet, which is what the
      // rule asks <dialog> for: see .react-doctor/false-positives.md.
      // react-doctor-disable-next-line react-doctor/prefer-html-dialog
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bottom-sheet__backdrop" role="presentation" onClick={onClose} />

      <div
        ref={sheetRef}
        tabIndex={-1}
        className={`bottom-sheet${className ? ` ${className}` : ''}`}
      >
        <span className="bottom-sheet__handle" aria-hidden="true" />

        {(title != null || header != null) && (
          <div className="bottom-sheet__head">
            {header ?? <h3 className="bottom-sheet__title">{title}</h3>}
            <button
              type="button"
              className="bottom-sheet__close"
              aria-label={t('blocks.header.close', 'Close')}
              onClick={onClose}
            >
              <CloseIcon aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="bottom-sheet__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
