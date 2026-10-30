import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ArrowLeftIcon, ArrowRightIcon } from '../icons';
import { useDragScroll } from '../../hooks/useDragScroll';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { forwardSign } from '../../lib/scrollDirection';
import { CarouselDots } from './CarouselDots';

export interface ScrollCarouselProps {
  children: ReactNode;
  /** Extra class on the scroll track. */
  className?: string;
  /** The row's title, on the same line as its arrows. Without one the arrows go under the row. */
  heading?: ReactNode;
  prevLabel: string;
  nextLabel: string;
  /** Scroll forward one slide on a timer, back to the start at the end. Off by default. */
  autoPlay?: boolean;
}

/** One slide and the gap after it. */
function slideStep(el: HTMLElement) {
  const first = el.firstElementChild as HTMLElement | null;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  return Math.max(1, (first?.offsetWidth || el.clientWidth * 0.8) + gap);
}

/** How many slides fit whole; the slack keeps a rounding sliver from losing one. */
export function slidesPerPage(width: number, gap: number, step: number): number {
  return Math.max(1, Math.floor((width + gap + 1) / step));
}

interface RailState {
  /** Nothing to scroll: every slide is in view. */
  fits: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** Visible share of the row and how far along it is, for the phone dots. */
  visible: number;
  progress: number;
  /** The slides in view, 1-based, and how many there are. */
  first: number;
  last: number;
  total: number;
}

function readRail(el: HTMLElement): RailState {
  const max = el.scrollWidth - el.clientWidth;
  const position = Math.abs(el.scrollLeft);
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  const step = slideStep(el);
  const total = el.children.length;
  const perPage = Math.min(total, slidesPerPage(el.clientWidth, gap, step));
  const first = Math.min(Math.round(position / step), total - perPage);
  return {
    fits: max <= 2,
    atStart: position <= 2,
    atEnd: position >= max - 2,
    visible: el.scrollWidth ? el.clientWidth / el.scrollWidth : 1,
    progress: max > 0 ? Math.min(1, position / max) : 0,
    first: first + 1,
    last: first + perPage,
    total,
  };
}

/** How long each slide stays before {@link ScrollCarousel}'s `autoPlay` moves on. */
const AUTO_PLAY_INTERVAL_MS = 5000;

/**
 * Horizontal row of whole slides, with arrows and a "1–4 of 8" count beside its
 * title (dots on phones, {@link CarouselDots}) and no controls at all when every
 * slide fits. The arrows move a page at a time and stop at the ends. Mouse drag,
 * native touch momentum, RTL-aware. The shared mechanism behind the products,
 * testimonials and blog rows; slide widths are set per block in
 * `04-components/home-blocks.scss`.
 */
export function ScrollCarousel({
  children,
  className = '',
  heading,
  prevLabel,
  nextLabel,
  autoPlay = false,
}: ScrollCarouselProps) {
  const { t } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  const { dragging, ...drag } = useDragScroll(track);
  // Null until measured: the arrows keep their place but stay hidden, so a row
  // that fits never flashes them and a row that scrolls doesn't move anything.
  const [rail, setRail] = useState<RailState | null>(null);

  const sync = useCallback(() => {
    const el = track.current;
    if (el) setRail(readRail(el));
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

  /** A page forward (`1`) or back (`-1`), whichever way the row reads. */
  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = slideStep(el);
    const distance = slidesPerPage(el.clientWidth, gap, step) * step;
    el.scrollBy({ left: dir * forwardSign(el) * distance, behavior: 'smooth' });
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

  const nav = !rail?.fits && (
    <div className={`scroll-carousel__nav${rail ? '' : ' invisible'}`}>
      {rail && (
        <span className="scroll-carousel__count">
          {rail.first === rail.last ? rail.first : `${rail.first}–${rail.last}`}{' '}
          {t('blocks.home.count_of', 'of')} {rail.total}
        </span>
      )}
      <button
        type="button"
        aria-label={prevLabel}
        disabled={rail?.atStart ?? true}
        onClick={() => page(-1)}
      >
        <ArrowRightIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={rail?.atEnd ?? false}
        onClick={() => page(1)}
      >
        <ArrowLeftIcon aria-hidden="true" />
      </button>
    </div>
  );

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
      {heading && (
        <div className="scroll-carousel__head">
          <div className="scroll-carousel__heading">{heading}</div>
          {nav}
        </div>
      )}

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

      <CarouselDots track={track} visible={rail?.visible ?? 1} progress={rail?.progress ?? 0} />

      {!heading && nav && <div className="scroll-carousel__foot">{nav}</div>}
    </div>
  );
}
