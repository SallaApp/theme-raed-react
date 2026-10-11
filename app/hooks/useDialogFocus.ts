import { useEffect } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modal-dialog focus management for a portalled overlay:
 *  - on `active`, remember the element that had focus, then move focus into
 *    `containerRef` (its first focusable descendant, or the container itself),
 *  - keep Tab / Shift+Tab wrapped inside the container while `active`,
 *  - when `active` goes false (or the component unmounts), return focus to the
 *    element that had it — i.e. the trigger that opened the dialog.
 *
 * Pass the *entered* (post-mount, painted) state as `active`, not the raw `open`
 * prop, so focus isn't grabbed a frame before the overlay is visible. The
 * container needs `tabIndex={-1}` for the fallback `container.focus()`.
 */
export function useDialogFocus(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const restoreTo = document.activeElement as HTMLElement | null;

    // `tabIndex >= 0` drops nominally-focusable controls that have been opted
    // out with `tabindex="-1"` (e.g. the drawer's hidden "back" button).
    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.tabIndex >= 0
      );

    if (!container.contains(document.activeElement)) {
      (focusable()[0] ?? container).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      restoreTo?.focus?.();
    };
  }, [active, containerRef]);
}
