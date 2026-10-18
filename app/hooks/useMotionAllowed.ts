import { useEffect, useState } from 'react';

/** Whether motion is allowed (no reduced-motion request); false on the server and before hydration. */
export function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    // Follows the setting live: switching it on mid-visit stops videos and autoplay.
    const sync = () => setAllowed(!query?.matches);
    sync();
    query?.addEventListener?.('change', sync);
    return () => query?.removeEventListener?.('change', sync);
  }, []);
  return allowed;
}
