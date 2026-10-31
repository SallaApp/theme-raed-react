import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDragScroll } from './useDragScroll';
import { useMotionAllowed } from './useMotionAllowed';

/** How long the row must be still before it may jump back to the middle copies. */
const SETTLE_MS = 140;

/**
 * The slide nearest the centre: `scroll` is the row's `scrollLeft`, `first` the
 * `scrollLeft` that centres slide 0 and `step` the signed distance to the next
 * slide (negative in RTL).
 */
export function nearestSlide(scroll: number, first: number, step: number, total: number): number {
  if (!step) return 0;
  return Math.max(0, Math.min(total - 1, Math.round((scroll - first) / step)));
}

/** The `scrollLeft` that centres one of the row's children. */
function centreOf(el: HTMLElement, index: number): number {
  const slide = el.children[index] as HTMLElement | undefined;
  return slide ? slide.offsetLeft + slide.offsetWidth / 2 - el.clientWidth / 2 : 0;
}

function nearestIn(el: HTMLElement): number {
  const first = centreOf(el, 0);
  return nearestSlide(el.scrollLeft, first, centreOf(el, 1) - first, el.children.length);
}

/**
 * A centred, endless scroll row. The caller renders three copies of its `count`
 * slides once `looped` is true; the visitor always scrolls natively, and once
 * the row is still it jumps to the same slide in the middle copy. Until then
 * (the server's HTML and the first paint) nothing has moved yet.
 *
 * Spread `trackProps` onto the scroll container.
 */
export function useLoopCarousel(count: number) {
  const track = useRef<HTMLDivElement>(null);
  const { dragging, ...drag } = useDragScroll(track);
  const motionAllowed = useMotionAllowed();
  const loops = count > 1;

  const [looped, setLooped] = useState(false);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const settleTimer = useRef<number | undefined>(undefined);
  const heldByTouch = useRef(false);
  const heldByDrag = useRef(false);
  /** Where the arrows last asked to go, so clicks made mid-scroll add up. */
  const target = useRef<number | null>(null);

  const settle = useCallback(() => {
    const el = track.current;
    // A jump under a finger or a mouse would throw the row out from under it;
    // letting go schedules this again.
    if (!el || heldByTouch.current || heldByDrag.current) return;
    target.current = null;
    const near = nearestIn(el);
    if (near < count || near >= count * 2) {
      el.scrollTo({ left: centreOf(el, count + (near % count)), behavior: 'instant' });
    }
  }, [count]);

  const settleLater = useCallback(() => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, SETTLE_MS);
  }, [settle]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // Both before paint: the copies and the scroll position arrive in one frame,
  // so the banner the server rendered in the centre never moves.
  useLayoutEffect(() => {
    if (loops) setLooped(true);
  }, [loops]);

  useLayoutEffect(() => {
    const el = track.current;
    if (el && looped) el.scrollTo({ left: centreOf(el, count), behavior: 'instant' });
  }, [looped, count]);

  useEffect(() => {
    const el = track.current;
    if (!el || !looped || typeof ResizeObserver === 'undefined') return;
    // A new width or banner ratio moves every slide, so stay on the same one.
    const observer = new ResizeObserver(() => {
      el.scrollTo({ left: centreOf(el, count + activeRef.current), behavior: 'instant' });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [looped, count]);

  useEffect(() => {
    heldByDrag.current = dragging;
    if (!dragging && looped) settleLater();
  }, [dragging, looped, settleLater]);

  const scrollToSlide = (index: number) => {
    const el = track.current;
    if (!el) return;
    target.current = index;
    el.scrollTo({ left: centreOf(el, index), behavior: motionAllowed ? 'smooth' : 'auto' });
  };

  /** One slide forward (`1`) or back (`-1`), whichever way the row reads. */
  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el || !looped) return;
    const from = target.current ?? nearestIn(el);
    scrollToSlide(Math.max(0, Math.min(el.children.length - 1, from + dir)));
  };

  /** To one of the `count` slides, by the middle copy. */
  const goTo = (index: number) => {
    if (looped) scrollToSlide(count + index);
  };

  const trackProps = {
    ...drag,
    ref: track,
    onScroll: () => {
      const el = track.current;
      if (!el || !looped) return;
      const index = nearestIn(el) % count;
      activeRef.current = index;
      setActive(index);
      settleLater();
    },
    onTouchStart: () => {
      heldByTouch.current = true;
    },
    onTouchEnd: () => {
      heldByTouch.current = false;
      settleLater();
    },
    onTouchCancel: () => {
      heldByTouch.current = false;
      settleLater();
    },
  };

  return { trackProps, dragging, looped, active, motionAllowed, step, goTo };
}
