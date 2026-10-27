import { useSyncExternalStore } from 'react';

/** What counts as the visitor engaging with the page. */
const INTERACTION_EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'scroll', 'wheel'];

let interacted = false;
const listeners = new Set<() => void>();

function onInteraction() {
  interacted = true;
  for (const event of INTERACTION_EVENTS) window.removeEventListener(event, onInteraction);
  listeners.forEach((listener) => listener());
  listeners.clear();
}

function subscribe(listener: () => void) {
  if (interacted) return () => {};
  if (listeners.size === 0) {
    for (const event of INTERACTION_EVENTS) {
      window.addEventListener(event, onInteraction, { passive: true });
    }
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * `false` until the visitor first scrolls, touches, moves the pointer or presses
 * a key, then `true` for the rest of the visit (shared across components, never
 * resets on navigation). Gate heavy, decorative third-party loads on it (a
 * YouTube background), so they stay out of the page load and its main thread.
 * Always `false` on the server.
 */
export function useFirstInteraction(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => interacted,
    () => false
  );
}

/** @internal Test-only: forget the interaction, as on a fresh page load. */
export function resetFirstInteraction(): void {
  interacted = false;
}
