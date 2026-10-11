import { useEffect, useEffectEvent } from 'react';
import { MOBILE_QUERY } from './useMobileViewport';

/**
 * Calls `onClose` when the viewport widens past `MOBILE_QUERY` while `open`.
 *
 * For mobile-only overlays: without it, resizing or rotating past the
 * breakpoint leaves a fullscreen sheet stuck open over the desktop page, and
 * the bottom bar that would otherwise close it is hidden by then too.
 */
export function useCloseOnDesktop(open: boolean, onClose: () => void): void {
  const onCloseEvent = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      if (!mql.matches) onCloseEvent();
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [open]);
}
