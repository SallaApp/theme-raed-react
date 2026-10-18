import { useDocumentClass } from '@salla.sa/twilight-theme-engine/hooks/useDocumentClass';

/**
 * Locks page scroll (`menu-opened` on `<body>`) while `active` is true.
 *
 * Several overlays lock scroll on their own (BottomSheet instances, HeaderNav's
 * drawer, …), and one can close right as another opens. The engine's
 * `useDocumentClass` keeps a body class while any caller still registers it
 * (its `DocumentClassProvider`, mounted by `TwilightProvider`, merges every
 * caller's classes), so the page stays locked until the last overlay closes.
 */
export function useScrollLock(active: boolean) {
  useDocumentClass({ body: { class: active ? 'menu-opened' : undefined } });
}
