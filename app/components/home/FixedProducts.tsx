import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedProductsSkeleton } from '@salla.sa/twilight-components-react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { ProductCard } from '../product';
import { blockLimit } from '../../lib/blockLimit';
import { showsDisplayAll } from '../../lib/displayAll';
import { useProductCardLayout } from '../../hooks/useProductCardLayout';

export interface FixedProductsProps {
  data: {
    products: { source: ProductsListSource; source_value?: number[] | null };
    title?: string;
    limit?: number | string;
    display_all_url?: string | null;
    key?: string | null;
    isVertical?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * `fixed-products` home block (`s-block--fixed-products`).
 *
 * Fork of the engine block — identical markup and data flow, only swapped to the
 * theme's {@link ProductCard} wrapper so the grid here gets the same card
 * treatment as every other product list (solid add-to-cart button, wishlist
 * moved to the footer; see `04-components/product.scss`).
 * Registered in `app/router.tsx`.
 *
 * Unlike the engine block, it shows as many products as the merchant's `limit`,
 * not always the first 4.
 *
 * Upgrade notes: `FORKS.md`.
 */
export function FixedProducts({ data }: FixedProductsProps) {
  const { t } = useTranslation();

  const title = data.title;
  const limit = blockLimit(data.limit);
  // The store-wide horizontal layout wins; otherwise the block's own choice.
  const isVertical = useProductCardLayout() === 'vertical' && data.isVertical !== false;

  const { data: result, isLoading } = useQuery(
    product.queries.list({
      source: data.products.source,
      sourceValue: data.products?.source_value,
      perPage: limit,
    })
  );

  const products = result?.items ?? [];

  if (isLoading) {
    return <FixedProductsSkeleton />;
  }

  if (!products.length) return null;

  const displayAllUrl = showsDisplayAll(data.products.source, products.length, limit, result?.next)
    ? data.display_all_url
    : null;

  return (
    <Suspense fallback={<FixedProductsSkeleton />}>
      {title && (
        <div className="s-block__title">
          <div className="right-side">
            <h2>{title}</h2>
          </div>
          {displayAllUrl && (
            <Link to={displayAllUrl} className="s-block__display-all">
              {t('blocks.home.display_all', 'View All')}
              <i className="sicon-arrow-left"></i>
            </Link>
          )}
        </div>
      )}
      <div
        className={
          's-products-list-wrapper ' +
          (isVertical ? 's-products-list-vertical-cards' : 's-products-list-horizontal-cards')
        }
      >
        {products.slice(0, limit).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            layout={isVertical ? 'vertical' : 'horizontal'}
          />
        ))}
      </div>
    </Suspense>
  );
}
