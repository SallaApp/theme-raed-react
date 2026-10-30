import { memo, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from '../icons';
import { useLoopCarousel } from '../../hooks/useLoopCarousel';

interface PhotoItem {
  id?: string | number;
  url?: string;
  link_type?: string;
  image?: string;
}

export interface PhotosSliderProps {
  data: {
    items?: PhotoItem[];
    position?: number;
    is_repeated?: boolean;
    /** The automatic move to the next banner. On unless switched off. */
    auto_play?: boolean;
    [key: string]: unknown;
  };
}

/** Banner shapes outside this range would be a sliver or a tower, so they are cropped to it. */
const MIN_RATIO = 1.2;
const MAX_RATIO = 3.5;

const SRCSET_WIDTHS = [640, 960, 1280, 1920] as const;
const SIZES = '(min-width: 1308px) 1260px, calc(100vw - 3rem)';

/** A copy on either side of the real slides, for the loop: never read out or tabbed to. */
const COPY_PROPS = { tabIndex: -1, 'aria-hidden': true } as const;

/**
 * `photos-slider` home block: one centred banner with its neighbours on both
 * sides, endless in both directions. The banner is the container's width, and
 * less on a short screen so it stays above the fold. The current pager segment
 * fills over 5 seconds and that fill is the timer: hovering, focusing or leaving
 * the screen pauses it, and the block moves on when it ends. Phones have no fill,
 * so nothing moves on its own there. Styling: `04-components/home-blocks.scss`.
 */
export const PhotosSlider = memo(function PhotosSlider({ data }: PhotosSliderProps) {
  const { t } = useTranslation();
  const items = data.items || [];
  const count = items.length;
  const { trackProps, dragging, looped, active, motionAllowed, step, goTo } =
    useLoopCarousel(count);

  const root = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number>();
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);

  const firstImage = items[0]?.image;

  // Banners carry no dimensions, so the first one's own shape sets the stage's.
  useEffect(() => {
    const img = root.current?.querySelector<HTMLImageElement>(
      '.s-photos-slider__slide:not([aria-hidden="true"]) img'
    );
    if (!img) return;
    const measure = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const shape = img.naturalWidth / img.naturalHeight;
      setRatio(Math.max(MIN_RATIO, Math.min(MAX_RATIO, shape)));
    };
    if (img.complete) measure();
    img.addEventListener('load', measure);
    return () => img.removeEventListener('load', measure);
  }, [firstImage]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!count) return null;

  const multiple = count > 1;
  const autoPlay = multiple && data.auto_play !== false && motionAllowed;
  const playing = autoPlay && !paused;

  const slide = (item: PhotoItem, index: number, copy: 'before' | 'after' | null) => (
    <Link
      key={`${copy ?? 'real'}:${item.id ?? `${item.url ?? ''}:${item.image ?? ''}`}:${index}`}
      to={item.url || '#'}
      className={`s-photos-slider__slide${index === active ? ' is-current' : ''}`}
      {...(copy && COPY_PROPS)}
    >
      <Image
        src={item.image}
        alt={copy ? '' : `photos-slider-${index}`}
        width={1280}
        height={753}
        sizes={SIZES}
        srcSetWidths={SRCSET_WIDTHS}
        priority={!copy && index === 0}
        draggable={false}
      />
    </Link>
  );

  const realSlides = items.map((item, index) => slide(item, index, null));
  // The server has no scroll position to give, so it pulls the last banner in
  // beside the first: the same picture the looped row shows once it can scroll.
  const slidesBefore = looped
    ? items.map((item, index) => slide(item, index, 'before'))
    : multiple && [slide(items[count - 1], count - 1, 'before')];
  const slidesAfter = looped && items.map((item, index) => slide(item, index, 'after'));

  return (
    <div
      ref={root}
      className={[
        's-photos-stage',
        !multiple && 'is-single',
        multiple && !looped && 'is-static',
        playing && 'is-playing',
        offscreen && 'is-offscreen',
      ]
        .filter(Boolean)
        .join(' ')}
      style={ratio ? ({ '--stage-ratio': ratio } as CSSProperties) : undefined}
    >
      <div className="s-photos-stage__viewport">
        <div
          className={`s-photos-stage__track hide-scroll${dragging ? ' is-dragging' : ''}`}
          {...trackProps}
        >
          {slidesBefore}
          {realSlides}
          {slidesAfter}
        </div>

        {multiple && (
          <>
            <button
              type="button"
              className="s-photos-stage__arrow s-photos-stage__arrow--prev"
              aria-label={t('blocks.home.reviews_prev', 'Previous')}
              onClick={() => step(-1)}
            >
              <ArrowRightIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              className="s-photos-stage__arrow s-photos-stage__arrow--next"
              aria-label={t('blocks.home.reviews_next', 'Next')}
              onClick={() => step(1)}
            >
              <ArrowLeftIcon aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {multiple && (
        <div className="s-photos-stage__pager">
          {autoPlay && (
            <button
              type="button"
              className="s-photos-stage__pause"
              aria-label={
                paused
                  ? t('blocks.home.slider_play', 'Play slides')
                  : t('blocks.home.slider_pause', 'Pause slides')
              }
              onClick={() => setPaused(!paused)}
            >
              {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
            </button>
          )}
          {items.map((item, index) => (
            <button
              key={item.id ?? `${item.url ?? ''}:${item.image ?? ''}:${index}`}
              type="button"
              className={`s-photos-stage__segment${index === active ? ' is-active' : ''}`}
              aria-label={`${t('blocks.home.slider_page', 'Slide')} ${index + 1}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => goTo(index)}
            >
              <span className="s-photos-stage__bar">
                {playing && index === active && (
                  <span className="s-photos-stage__fill" onAnimationEnd={() => step(1)} />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
