import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ArrowLeftIcon, ArrowRightIcon, StarIcon } from '../icons';
import { useDragScroll } from '../../hooks/useDragScroll';

export interface TestimonialItem {
  avatar?: string;
  name?: string;
  text?: string;
  stars?: number;
}

function TestimonialCard({ item, index }: { item: TestimonialItem; index: number }) {
  return (
    <article className="testimonial-card">
      <div className="testimonial-card__head">
        <div className="testimonial-card__person">
          {item.avatar && (
            <img
              className="testimonial-card__avatar"
              src={item.avatar}
              alt={item.name?.trim() ? item.name : `testimonial-${index}`}
              width={44}
              height={44}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          )}
          <b className="testimonial-card__name">{item.name}</b>
        </div>

        <span className="testimonial-card__rating">
          <StarIcon aria-hidden="true" />
          {Number(item.stars ?? 0).toFixed(1)}
        </span>
      </div>

      <p className="testimonial-card__text">{item.text}</p>
    </article>
  );
}

export interface TestimonialsCarouselProps {
  items: TestimonialItem[];
  title: string;
  description?: string;
}

/**
 * Horizontal card scroller for customer reviews — ~3.x cards per view, a
 * drag-scrollable row, and a progress bar + prev/next controls below. Used by
 * the `custom-testimonials` home block ({@link CustomTestimonials}). Styling:
 * `04-components/home-blocks.scss` (`.s-testimonials` / `.testimonial-card`).
 */
export function TestimonialsCarousel({ items, title, description }: TestimonialsCarouselProps) {
  const { t } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useDragScroll(scroller);
  const [pos, setPos] = useState(0);
  const [thumb, setThumb] = useState(1);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumb(el.scrollWidth ? el.clientWidth / el.scrollWidth : 1);
    setPos(max > 0 ? Math.min(1, Math.abs(el.scrollLeft) / max) : 0);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // Measured after layout (and on every resize), so mounting doesn't force a synchronous reflow.
    if (typeof ResizeObserver === 'undefined') {
      sync();
      return;
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, items]);

  const scrollByCard = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.testimonial-card');
    const step = (card?.offsetWidth || el.clientWidth * 0.8) + 24;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (!items.length) return null;

  const thumbWidth = Math.max(8, thumb * 100);

  return (
    <div className="s-testimonials">
      <div className="container s-testimonials__head">
        <h2 className="s-testimonials__title">{title}</h2>
        {description && <p className="s-testimonials__desc">{description}</p>}
      </div>

      <div
        ref={scroller}
        className="s-testimonials__scroller hide-scroll"
        onScroll={sync}
        {...drag}
      >
        {items.map((item, index) => (
          // A static settings list whose items have no id: see
          // .react-doctor/false-positives.md.
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key
          <TestimonialCard key={`${index}-${item.name ?? ''}`} item={item} index={index} />
        ))}
      </div>

      <div className="container s-testimonials__controls">
        <div className="s-testimonials__progress" aria-hidden="true">
          <span
            className="s-testimonials__progress-thumb"
            style={{
              width: `${thumbWidth}%`,
              insetInlineStart: `${pos * (100 - thumbWidth)}%`,
            }}
          />
        </div>

        <div className="s-testimonials__nav">
          <button
            type="button"
            aria-label={t('blocks.home.reviews_prev', 'Previous')}
            onClick={() => scrollByCard(1)}
          >
            <ArrowRightIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t('blocks.home.reviews_next', 'Next')}
            onClick={() => scrollByCard(-1)}
          >
            <ArrowLeftIcon aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
