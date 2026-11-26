import { useEffect, useState } from 'react';

type CartSummary = { count?: number | string | null };
export type CartSdk = {
  storage?: { get?: <T>(key: string, fallback?: T) => T };
  helpers?: { number?: (value: number) => string };
  // Root on/off: onUpdated registers a wrapper that only offUpdated can remove.
  event?: {
    on?: (event: string, cb: (summary?: CartSummary) => void) => void;
    off?: (event: string, cb: (summary?: CartSummary) => void) => void;
  };
};

export function getCartSdk(): CartSdk | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.salla as unknown as CartSdk | undefined;
}

function normalizeCount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Live cart count for the cart badges (header and mobile bottom bar). Seeds `0` and reads `salla.storage` only
 * inside the effect: touching it during render makes the client hydrate a
 * non-zero count over the server's `0` (React hydration mismatch).
 */
export function useCartCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let subscribed: CartSdk | undefined;

    const readStorage = () => {
      if (!cancelled)
        setCount(normalizeCount(getCartSdk()?.storage?.get?.('cart.summary.count', 0)));
    };

    const onUpdated = (summary?: CartSummary) => {
      if (cancelled) return;
      if (summary && Object.prototype.hasOwnProperty.call(summary, 'count')) {
        setCount(normalizeCount(summary.count));
        return;
      }
      readStorage();
    };

    const sync = () => {
      const sdk = getCartSdk();
      if (sdk && sdk !== subscribed) {
        subscribed?.event?.off?.('cart::updated', onUpdated);
        subscribed = sdk;
        subscribed.event?.on?.('cart::updated', onUpdated);
      }
      readStorage();
    };

    sync();
    document.addEventListener('theme::ready', sync);

    return () => {
      cancelled = true;
      subscribed?.event?.off?.('cart::updated', onUpdated);
      document.removeEventListener('theme::ready', sync);
    };
  }, []);

  return count;
}
