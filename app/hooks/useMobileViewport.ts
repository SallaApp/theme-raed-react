import { useEffect, useState } from 'react';

// Matches the theme's `md:` Tailwind breakpoint — the same cutoff any
// `md:hidden` / `hidden md:block` pair switches visibility on. Written as the
// exact opposite of `md:`'s `(min-width: 768px)`: `(max-width: 767px)` leaves
// widths such as 767.5px (browser zoom, display scaling) where neither matches.
export const MOBILE_QUERY = 'not all and (min-width: 768px)';

/**
 * Whether the viewport is at or below `md`. `false` on the server and through
 * hydration (matching `useHydrated`'s convention — combine the two rather than
 * trusting this alone before hydration completes, since the real viewport is
 * unknown until then).
 */
export function useMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
