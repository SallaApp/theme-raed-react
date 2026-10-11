import { useEffect } from 'react';

// Shared across every caller (BottomSheet instances, HeaderNav's drawer, …) --
// a plain module-level counter rather than a ref or context, since the
// callers don't share a parent and don't need to re-render on this changing.
let lockCount = 0;

/**
 * Locks page scroll (`menu-opened` on `<body>`) while `active` is true,
 * reference-counted across every caller instead of each one independently
 * adding / removing the same class. Without the count, one overlay closing
 * right as another opens can remove the class after the other one re-added
 * it (or vice versa), leaving the page scrollable behind a still-open sheet
 * or drawer — whichever effect happened to run last wins, and there's no
 * guarantee which one that is.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    document.body.classList.add('menu-opened');
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.classList.remove('menu-opened');
    };
  }, [active]);
}
