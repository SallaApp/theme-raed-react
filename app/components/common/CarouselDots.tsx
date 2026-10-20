import type { RefObject } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

export interface CarouselDotsProps {
  /** The horizontally scrolling track the dots page through. */
  track: RefObject<HTMLElement | null>;
  /** Visible share of the track (`clientWidth / scrollWidth`), as the carousel already measures it. */
  visible: number;
  /** Scroll position along the track, 0 at the start to 1 at the end. */
  progress: number;
}

/** Pages a row of that visible share takes; the tolerance keeps a rounding sliver from adding one. */
export function pageCount(visible: number): number {
  return visible >= 0.99 ? 1 : Math.ceil(1 / visible - 0.05);
}

/**
 * Dot navigation for a scroll row: one dot per screenful, the current one
 * stretched into a pill. Phones show these in place of the carousels'
 * progress bar and arrows (`home-blocks.scss`, `.carousel-dots`).
 * Renders nothing when everything fits on one screen.
 */
export function CarouselDots({ track, visible, progress }: CarouselDotsProps) {
  const { t } = useTranslation();
  const pages = pageCount(visible);
  if (pages < 2) return null;

  const active = Math.round(progress * (pages - 1));

  const goTo = (page: number) => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Forward is towards negative scrollLeft in RTL.
    const forward = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: forward * (page / (pages - 1)) * max, behavior: 'smooth' });
  };

  return (
    <div className="carousel-dots">
      {Array.from({ length: pages }, (_, page) => (
        <button
          // Positions, not items: the dots are screenfuls of the same row.
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key
          key={page}
          type="button"
          className={`carousel-dots__dot${page === active ? ' is-active' : ''}`}
          aria-label={`${t('blocks.home.slider_page', 'Slide')} ${page + 1}`}
          aria-current={page === active ? 'true' : undefined}
          onClick={() => goTo(page)}
        />
      ))}
    </div>
  );
}
