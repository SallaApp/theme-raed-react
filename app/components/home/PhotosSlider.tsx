import { memo, useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
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

function useBannerRatio(root: RefObject<HTMLElement | null>, firstImage: string | undefined) {
  const [ratio, setRatio] = useState<number>();

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
  }, [root, firstImage]);

  return ratio;
}

function useOffscreen(root: RefObject<HTMLElement | null>) {
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);

  return offscreen;
}

function StageSlide({
  item,
  index,
  current,
  copy = false,
}: {
  item: PhotoItem;
  index: number;
  current: boolean;
  copy?: boolean;
}) {
  return (
    <Link
      to={item.url || '#'}
      className={`s-photos-slider__slide${current ? ' is-current' : ''}`}
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
}

function StageArrows({ onStep }: { onStep: (dir: 1 | -1) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="s-photos-stage__arrow s-photos-stage__arrow--prev"
        aria-label={t('blocks.home.reviews_prev', 'Previous')}
        onClick={() => onStep(-1)}
      >
        <ArrowRightIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        className="s-photos-stage__arrow s-photos-stage__arrow--next"
        aria-label={t('blocks.home.reviews_next', 'Next')}
        onClick={() => onStep(1)}
      >
        <ArrowLeftIcon aria-hidden="true" />
      </button>
    </>
  );
}

function StagePager({
  items,
  active,
  autoPlay,
  paused,
  onPause,
  onPick,
  onFilled,
}: {
  items: PhotoItem[];
  active: number;
  autoPlay: boolean;
  paused: boolean;
  onPause: () => void;
  onPick: (index: number) => void;
  onFilled: () => void;
}) {
  const { t } = useTranslation();
  const playing = autoPlay && !paused;

  return (
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
          onClick={onPause}
        >
          {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
        </button>
      )}
      {items.map((item, index) => (
        <button
          // Positions in a static settings list, whose items may repeat or have no id.
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key
          key={index}
          type="button"
          className={`s-photos-stage__segment${index === active ? ' is-active' : ''}`}
          aria-label={`${t('blocks.home.slider_page', 'Slide')} ${index + 1}`}
          aria-current={index === active ? 'true' : undefined}
          onClick={() => onPick(index)}
        >
          <span className="s-photos-stage__bar">
            {playing && index === active && (
              <span className="s-photos-stage__fill" onAnimationEnd={onFilled} />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * `photos-slider` home block: one centred banner with its neighbours on both
 * sides, endless in both directions. The banner is the container's width, and
 * less on a short screen so it stays above the fold. The current pager segment
 * fills over 5 seconds and that fill is the timer: hovering, focusing or leaving
 * the screen pauses it, and the block moves on when it ends. Phones have no fill,
 * so nothing moves on its own there. Styling: `04-components/home-blocks.scss`.
 */
// Its branches are one flat list of class names and one- or many-banner switches.
// react-doctor-disable-next-line react-doctor/no-high-complexity-react-function
export const PhotosSlider = memo(function PhotosSlider({ data }: PhotosSliderProps) {
  const items = data.items || [];
  const count = items.length;
  const { trackProps, dragging, looped, active, motionAllowed, step, goTo } =
    useLoopCarousel(count);

  const root = useRef<HTMLDivElement>(null);
  const ratio = useBannerRatio(root, items[0]?.image);
  const offscreen = useOffscreen(root);
  const [paused, setPaused] = useState(false);

  if (!count) return null;

  const multiple = count > 1;
  const autoPlay = multiple && data.auto_play !== false && motionAllowed;

  const copies = (set: string, list: PhotoItem[], offset = 0) =>
    list.map((item, position) => (
      <StageSlide
        // Positions in a static settings list, whose items may repeat or have no id.
        // react-doctor-disable-next-line react-doctor/no-array-index-as-key
        key={`${set}:${position + offset}`}
        item={item}
        index={position + offset}
        current={position + offset === active}
        copy
      />
    ));

  return (
    <div
      ref={root}
      className={[
        's-photos-stage',
        !multiple && 'is-single',
        multiple && !looped && 'is-static',
        autoPlay && !paused && 'is-playing',
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
          {/* The server has no scroll position to give, so it pulls the last banner in
              beside the first: the same picture the looped row shows once it can scroll. */}
          {looped && copies('before', items)}
          {multiple && !looped && copies('before', items.slice(-1), count - 1)}
          {items.map((item, index) => (
            <StageSlide
              // Positions in a static settings list, whose items may repeat or have no id.
              // react-doctor-disable-next-line react-doctor/no-array-index-as-key
              key={`real:${index}`}
              item={item}
              index={index}
              current={index === active}
            />
          ))}
          {looped && copies('after', items)}
        </div>

        {multiple && <StageArrows onStep={step} />}
      </div>

      {multiple && (
        <StagePager
          items={items}
          active={active}
          autoPlay={autoPlay}
          paused={paused}
          onPause={() => setPaused(!paused)}
          onPick={goTo}
          onFilled={() => step(1)}
        />
      )}
    </div>
  );
});
