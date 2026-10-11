import { memo } from 'react';
import type { Brand } from '@salla.sa/twilight-theme-engine/types';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';

export interface BrandsData {
  brands: Brand[];
  title?: string;
  show_all?: boolean;
  position?: number;
  [key: string]: unknown;
}

export interface BrandsProps {
  data: BrandsData;
}

export const Brands = memo(function Brands({ data }: BrandsProps) {
  const { brands, title, show_all: showAll } = data;
  const { t } = useTranslation();
  // Twig's brands block shows "View All" by the theme's setting; the component sends no `show_all`.
  const { theme } = useTwilight();
  const showMoreButton = theme?.settings?.is_more_button_enabled;

  if (!brands.length) return null;

  const gridCols = brands.length > 5 ? 'md:grid-cols-4' : 'md:grid-cols-5';
  const hasLargeItems = brands.length > 5;

  return (
    <>
      <div className="container">
        {(title || showAll) && (
          <div className="s-block__title">
            {title && (
              <div className="right-side">
                <h2>{title}</h2>
              </div>
            )}
            {showMoreButton && (
              <Link to="/brands" className="s-block__display-all">
                {t('blocks.home.display_all', 'View All')}
                <i className="sicon-arrow-left"></i>
              </Link>
            )}
          </div>
        )}

        <div className={`grid grid-cols-2 ${gridCols} grid-flow-row gap-4 lg:gap-8`}>
          {brands.map((brand, index) => {
            const isFirstOrThird = index === 0 || index % 3 === 0;
            return (
              <Link
                key={brand.id}
                to={brand.url}
                className={`brand-item ${hasLargeItems && isFirstOrThird ? 'sm:row-span-2 sm:h-auto' : ''}`}
              >
                <img
                  className="max-h-full"
                  width="400"
                  height="300"
                  src={brand.logo}
                  alt={brand.name}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding={index === 0 ? 'sync' : 'async'}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
});
