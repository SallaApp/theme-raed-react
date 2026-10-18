import { memo, useRef } from 'react';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ScrollCarousel } from '../common';
import { parseSlideVideo } from '../../lib/slideVideo';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import { SlideVideo, useSlideVideos, type SliderBanner } from './EnhancedSlider';

export interface PhotosSliderWithTextProps {
  data: {
    slides?: SliderBanner[];
    /** twilight.json `auto_play`: scroll to the next card on a timer. On unless switched off. */
    auto_play?: boolean;
    in_container?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

function SlideCard({
  slide,
  index,
  motionAllowed,
}: {
  slide: SliderBanner;
  index: number;
  motionAllowed: boolean;
}) {
  const button = slide.btnname?.trim();
  const content = (
    <>
      <Image
        src={slide.image}
        className="absolute inset-0 w-full h-full object-cover"
        alt={slide.title || `photos-slider-${index}`}
        width={1200}
        height={800}
        priority={index === 0}
      />
      {motionAllowed && <SlideVideo url={slide.video} poster={slide.image} />}
      {!slide.without_overlay && <span className="s-text-photos-slider__overlay" />}
      <div className="s-text-photos-slider__content">
        {slide.title && <h3 className="s-text-photos-slider__title">{slide.title}</h3>}
        {slide.description && (
          <p className="s-text-photos-slider__description">{slide.description}</p>
        )}
        {button && (
          <Link to={slide.url || '#'} className="home-slider__cta">
            {button}
          </Link>
        )}
      </div>
    </>
  );

  // Without a button, a link makes the whole card clickable (no link inside a link).
  if (!button && slide.url) {
    return (
      <Link to={slide.url} className="s-text-photos-slider__slide">
        {content}
      </Link>
    );
  }
  return <div className="s-text-photos-slider__slide">{content}</div>;
}

/**
 * `photos-slider-with-text` home block: the photos slider's two-per-row cards
 * ({@link ScrollCarousel}) with the enhanced slider's per-slide title, text,
 * button and background video. Styling: `04-components/home-blocks.scss`.
 */
export const PhotosSliderWithText = memo(function PhotosSliderWithText({
  data,
}: PhotosSliderWithTextProps) {
  const { t } = useTranslation();
  const slides = data.slides || [];
  const root = useRef<HTMLDivElement>(null);
  const motionAllowed = useMotionAllowed();
  useSlideVideos(
    root,
    motionAllowed && slides.some((slide) => parseSlideVideo(slide.video))
  );

  if (!slides.length) return null;

  return (
    <div ref={root}>
      <ScrollCarousel
        prevLabel={t('blocks.home.reviews_prev', 'Previous')}
        nextLabel={t('blocks.home.reviews_next', 'Next')}
        autoPlay={slides.length > 1 && data.auto_play !== false}
      >
        {slides.map((slide, index) => (
          // A static settings list whose items have no id: see
          // .react-doctor/false-positives.md.
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key
          <SlideCard key={index} slide={slide} index={index} motionAllowed={motionAllowed} />
        ))}
      </ScrollCarousel>
    </div>
  );
});
