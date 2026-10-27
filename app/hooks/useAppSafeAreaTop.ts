import { useSyncExternalStore } from 'react';

const VAR = '--app-safe-area-top';

function read(): number {
  const value = parseFloat(document.documentElement.style.getPropertyValue(VAR));
  return Number.isFinite(value) ? value : 0;
}

function subscribe(notify: () => void): () => void {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => observer.disconnect();
}

/**
 * The Salla app's top inset (status bar / notch) in pixels, as the engine
 * writes it to `--app-safe-area-top` on `<html>` from `mobile::ui.safearea`.
 * 0 on the server, in a browser, and until the app reports it; follows later
 * reports, which the app can send at any time.
 */
export function useAppSafeAreaTop(): number {
  return useSyncExternalStore(subscribe, read, () => 0);
}
