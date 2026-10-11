import { useEffect, useState } from 'react';

// Matches the theme's `md:` Tailwind breakpoint — the same cutoff any
// `md:hidden` / `hidden md:block` pair switches visibility on.
export const MOBILE_QUERY = '(max-width: 767px)';

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
