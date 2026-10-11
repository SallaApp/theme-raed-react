import { memo } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { TestimonialsCarousel, type TestimonialItem } from '../common/TestimonialsCarousel';

export interface CustomTestimonialsProps {
  data: {
    items: TestimonialItem[];
    title?: string;
    description?: string;
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * `custom-testimonials` home block — merchant-authored reviews in the shared
 * {@link TestimonialsCarousel} (gray band via `.s-block--custom-testimonials`,
 * ~3.x cards per view, progress bar + prev/next controls).
 */
export const CustomTestimonials = memo(function CustomTestimonials({
  data,
}: CustomTestimonialsProps) {
  const { t } = useTranslation();
  const { items, title, description } = data;

  if (!items?.length) return null;

  return (
    <TestimonialsCarousel
      items={items}
      title={title || t('blocks.home.testimonials', 'Customer reviews')}
      description={description}
    />
  );
});
