import { memo } from 'react';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ScrollCarousel } from '../common/ScrollCarousel';

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
    [key: string]: unknown;
  };
}

/**
 * `photos-slider` home block. Replaces the engine's Swiper
 * (`<salla-slider type="carousel">`) with the theme's {@link ScrollCarousel}
 * — a native scroll row with a progress bar + arrows, matching the homepage
 * testimonials / products carousels. Styling: `04-components/home-blocks.scss`.
 */
export const PhotosSlider = memo(function PhotosSlider({ data }: PhotosSliderProps) {
  const { t } = useTranslation();
  const items = data.items || [];

  if (!items.length) return null;

  return (
    <ScrollCarousel
      prevLabel={t('blocks.home.reviews_prev', 'Previous')}
      nextLabel={t('blocks.home.reviews_next', 'Next')}
    >
      {items.map((item, index) => (
        <Link
          key={item.id ?? `${item.url ?? ''}:${item.image ?? ''}`}
          to={item.url || '#'}
          className="s-photos-slider__slide"
        >
          <Image
            src={item.image}
            className="w-full h-full object-cover"
            alt={`photos-slider-${index}`}
            width={1200}
            height={800}
            priority={index === 0}
          />
        </Link>
      ))}
    </ScrollCarousel>
  );
});
