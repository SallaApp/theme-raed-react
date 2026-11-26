import { memo } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { blockLinkUrl } from '../../lib/blockLink';

interface BannerItem {
  image?: string;
  url?: string;
  /** The link kind; a fixed page (`offers_link`) comes with no `url` (`blockLinkUrl`). */
  url__type?: string;
  title?: string;
  description?: string;
}

export interface EnhancedSquareBannersProps {
  data: {
    banners: BannerItem[];
    /** twilight.json `show_button`: mosaic "Discover now" CTA. Off unless switched on. */
    show_button?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * The link's `aria-label`: the title; none when the description names the link;
 * the "Discover now" CTA text when the banner has no text at all (its image is a
 * CSS background, with no alt to fall back on).
 */
const bannerLabel = (banner: BannerItem, ctaLabel: string) =>
  banner.title || (banner.description ? undefined : ctaLabel);

/** A banner with its title, description and link is "complete" (no mosaic overlay). */
const isComplete = (banner: BannerItem) =>
  Boolean(banner.title && banner.description && blockLinkUrl(banner));

/** Mosaic dark overlay: only when the banner has text and is not complete. */
const hasMosaicOverlay = (banner: BannerItem) =>
  Boolean((banner.title || banner.description) && !isComplete(banner));

function MosaicBanner({
  banner,
  ctaLabel,
  showButton,
}: {
  banner: BannerItem;
  ctaLabel: string;
  showButton: boolean;
}) {
  return (
    <Link
      to={blockLinkUrl(banner) || '#'}
      aria-label={bannerLabel(banner, ctaLabel)}
      className={`enhanced-square-banner bg-no-repeat bg-cover bg-center ${hasMosaicOverlay(banner) ? 'enhanced-square-banner--overlay' : ''}`}
      style={{ backgroundImage: `url(${banner.image})` }}
    >
      <span className="enhanced-square-banner__content">
        {banner.title && <h3 className="enhanced-square-banner__title">{banner.title}</h3>}
        {banner.description && (
          <p className="enhanced-square-banner__description">{banner.description}</p>
        )}
        {showButton && blockLinkUrl(banner) && (
          <span className="enhanced-square-banner__cta">{ctaLabel}</span>
        )}
      </span>
    </Link>
  );
}

export const EnhancedSquareBanners = memo(function EnhancedSquareBanners({
  data,
}: EnhancedSquareBannersProps) {
  const { t } = useTranslation();
  const { banners } = data;
  // Default-off switch (same pattern as `in_container` on EnhancedSlider).
  const showButton = Boolean(data.show_button);

  if (!banners.length) return null;

  const ctaLabel = t('blocks.home.discover_now', 'Discover now');

  // 5 banners: hero mosaic — two stacked banners on each side, one tall
  // banner spanning both rows in the center. Fewer banners keep the plain grid.
  if (banners.length === 5) {
    return (
      <div className="enhanced-square-banners-mosaic">
        {banners.map((banner, index) => (
          // A static settings list whose items have no id: see
          // .react-doctor/false-positives.md.
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key
          <MosaicBanner
            key={index}
            banner={banner}
            ctaLabel={ctaLabel}
            showButton={showButton}
          />
        ))}
      </div>
    );
  }

  const gridCols =
    banners.length <= 3 ? `md:grid-cols-${banners.length}` : 'md:grid-cols-3 two-row';
  const hasTwoRows = banners.length > 3;

  return (
    <div className={`grid ${gridCols} grid-flow-row gap-3 sm:gap-8`}>
      {banners.map((banner, index) => (
        <Link
          key={index}
          to={blockLinkUrl(banner) || '#'}
          aria-label={bannerLabel(banner, ctaLabel)}
          className={`banner-entry bg-no-repeat bg-cover bg-center ${banner.title && !isComplete(banner) ? 'has-overlay' : ''} ${hasTwoRows ? 'h-banner' : 'h-lg-banner'}`}
          style={{ backgroundImage: `url(${banner.image})` }}
        >
          <article className="banner-entry__text text-with-border">
            <h3 className="banner__title font-bold mb-1 leading-6">{banner.title}</h3>
            <p className="banner__description">{banner.description}</p>
          </article>
        </Link>
      ))}
    </div>
  );
});
