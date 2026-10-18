import { useEffect, useState } from 'react';

/** How far the page must move before the direction counts, so a jitter doesn't flip it. */
const THRESHOLD_PX = 8;

/**
 * Which way the page last scrolled: `'up'` (also at the start, and on the
 * server) or `'down'`. Changes only after the page moves {@link THRESHOLD_PX}
 * the other way, so the caller re-renders once per change of direction.
 */
export function useScrollDirection(): 'up' | 'down' {
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (Math.abs(y - last) < THRESHOLD_PX) return;
      // Above the top (iOS rubber-band) counts as up.
      setDirection(y > last && y > 0 ? 'down' : 'up');
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return direction;
}
