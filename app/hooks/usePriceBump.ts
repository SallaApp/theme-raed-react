import { useEffect, useRef, useState } from 'react';

/**
 * Returns a key that bumps every time the passed price signature changes —
 * except on first render. Put it on the price element as both `key` (so React
 * remounts it and the CSS animation replays) and a truthy check for the
 * `price-bump` class, so the little pulse fires on a live quantity / option
 * update but not on initial page load. Animation: `04-components/product.scss`.
 */
export function usePriceBump(...values: unknown[]): number {
  const signature = values.join('|');
  const [bump, setBump] = useState(0);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === null) {
      previous.current = signature;
      return;
    }
    if (previous.current !== signature) {
      previous.current = signature;
      setBump((n) => n + 1);
    }
  }, [signature]);

  return bump;
}
