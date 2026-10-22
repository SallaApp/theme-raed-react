import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '../icons';
import { useDragScroll } from '../../hooks/useDragScroll';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { forwardSign } from '../../lib/scrollDirection';
import { CarouselDots } from './CarouselDots';

export interface ScrollCarouselProps {
  children: ReactNode;
  /** Extra class on the scroll track. */
  className?: string;
  prevLabel: string;
  nextLabel: string;
  /** Scroll forward one slide on a timer, back to the start at the end. Off by default. */
  autoPlay?: boolean;
}

/** One slide and the gap after it. */
function slideStep(el: HTMLElement) {
  const first = el.firstElementChild as HTMLElement | null;
  return (first?.offsetWidth || el.clientWidth * 0.8) + 24;
}

/** How long each slide stays before {@link ScrollCarousel}'s `autoPlay` moves on. */
const AUTO_PLAY_INTERVAL_MS = 5000;

/**
 * Horizontal scroller with a progress bar and prev/next arrows (dots on
 * phones, {@link CarouselDots}) — the shared
 * mechanism behind the testimonials and products carousels. Mouse drag, native
 * touch momentum, RTL-aware progress.
 */
export function ScrollCarousel({
  children,
  className = '',
  prevLabel,
  nextLabel,
  autoPlay = false,
}: ScrollCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const { dragging, ...drag } = useDragScroll(track);
  const [pos, setPos] = useState(0);
  const [thumb, setThumb] = useState(1);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumb(el.scrollWidth ? el.clientWidth / el.scrollWidth : 1);
    setPos(max > 0 ? Math.min(1, Math.abs(el.scrollLeft) / max) : 0);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    // Measured after layout (and on every resize), so mounting doesn't force a synchronous reflow.
    if (typeof ResizeObserver === 'undefined') {
      sync();
      return;
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, children]);

  /** One slide forward (`1`) or back (`-1`), whichever way the row reads. */
  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * forwardSign(el) * slideStep(el), behavior: 'smooth' });
  };

  // Autoplay waits while the visitor hovers, focuses or has just touched the row.
  const hovered = useRef(false);
  const focused = useRef(false);
  const touchedAt = useRef(0);

  // Follows the setting live: switching reduced motion on mid-visit stops the timer.
  const motionAllowed = useMotionAllowed();
  const playing = autoPlay && motionAllowed;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const el = track.current;
      if (!el || document.hidden || hovered.current || focused.current) return;
      if (Date.now() - touchedAt.current < AUTO_PLAY_INTERVAL_MS * 2) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if (Math.abs(el.scrollLeft) >= max - 2) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      el.scrollBy({ left: forwardSign(el) * slideStep(el), behavior: 'smooth' });
    }, AUTO_PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  const thumbWidth = Math.max(8, thumb * 100);

  return (
    <div
      className="scroll-carousel"
      {...(autoPlay && {
        onMouseEnter: () => {
          hovered.current = true;
        },
        onMouseLeave: () => {
          hovered.current = false;
        },
        onFocus: () => {
          focused.current = true;
        },
        onBlur: () => {
          focused.current = false;
        },
        onPointerDown: () => {
          touchedAt.current = Date.now();
        },
      })}
    >
      <div
        ref={track}
        className={['scroll-carousel__track hide-scroll', dragging && 'is-dragging', className]
          .filter(Boolean)
          .join(' ')}
        onScroll={sync}
        {...drag}
      >
        {children}
      </div>

      <CarouselDots track={track} visible={thumb} progress={pos} />

      <div className="scroll-carousel__controls">
        <div className="scroll-carousel__progress" aria-hidden="true">
          <span
            className="scroll-carousel__progress-thumb"
            style={{
              width: `${thumbWidth}%`,
              insetInlineStart: `${pos * (100 - thumbWidth)}%`,
            }}
          />
        </div>

        <div className="scroll-carousel__nav">
          <button type="button" aria-label={prevLabel} onClick={() => step(-1)}>
            <ArrowRightIcon aria-hidden="true" />
          </button>
          <button type="button" aria-label={nextLabel} onClick={() => step(1)}>
            <ArrowLeftIcon aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
