import { useSyncExternalStore } from 'react';

const subscribeNothing = () => () => {};

/**
 * `false` on the server and through hydration, then `true` once mounted on
 * the client — flips on the same tick hydration completes, no extra render.
 * Use it to gate anything that must match the SSR output exactly on first
 * paint (avoiding a hydration mismatch) and only reveal / upgrade once it's
 * safe to differ from the server render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
}
