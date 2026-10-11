import { useEffect, useState } from 'react';
import { afterNextPaint } from '../lib/afterNextPaint';

/**
 * `BottomSheet`'s enter transition is 300ms (`04-components/bottom-sheet.scss`),
 * plus its own ~2-frame delay before that starts. Starting the row stagger
 * partway through had the two motions overlapping and the stagger was easy to
 * miss, so wait for the sheet to settle, then a clear pause, and the two
 * reveals read as separate beats.
 */
export const ROWS_IN_DELAY_MS = 350;

/**
 * Whether a sheet's rows should play their staggered entrance (`.is-in`).
 * `false` while closed, so it replays from the top on every open.
 *
 * For a sheet whose rows come from a web component (`<salla-menu>`,
 * `<salla-user-menu>`): two things can still be missing when `open` flips
 * true. `BottomSheet` defers its own mount to an effect, so `containerSelector`
 * may not exist yet, and the component renders its rows asynchronously on top
 * of that (registering the custom element, fetching data). A fixed delay can't
 * cover either reliably, so this watches the document (`BottomSheet` portals to
 * `<body>`) until a `rowSelector` match shows up, then releases the stagger.
 */
export function useStaggeredRows(
  open: boolean,
  containerSelector: string,
  rowSelector: string
): boolean {
  const [rowsIn, setRowsIn] = useState(false);

  useEffect(() => {
    if (!open) {
      setRowsIn(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelPaint: (() => void) | undefined;
    let observer: MutationObserver | undefined;

    const release = () => {
      timer = setTimeout(() => {
        // Force a reflow so the web component's closed state is painted before
        // `.is-in` flips it; otherwise a just-inserted row never transitions.
        void document.querySelector<HTMLElement>(containerSelector)?.offsetWidth;
        cancelPaint = afterNextPaint(() => setRowsIn(true));
      }, ROWS_IN_DELAY_MS);
    };

    if (document.querySelector(rowSelector)) {
      release();
    } else {
      observer = new MutationObserver(() => {
        if (document.querySelector(rowSelector)) {
          observer?.disconnect();
          release();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      clearTimeout(timer);
      cancelPaint?.();
    };
  }, [open, containerSelector, rowSelector]);

  return rowsIn;
}
