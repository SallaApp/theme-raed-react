import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedProductsSkeleton } from '@salla.sa/twilight-components-react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { ProductCard } from '../product';
import { blockLimit } from '../../lib/blockLimit';

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
 * Fork of the engine block (synced with engine 1.0.132) — identical markup and
 * data flow, only swapped to the theme's {@link ProductCard} wrapper so the grid
 * here gets the same card treatment as every other product list (solid
 * add-to-cart button, wishlist moved to the footer; see
 * `04-components/product.scss`). Registered in `app/router.tsx`.
 *
 * The engine renders its own card and only swaps it for a `product:card`
 * registry override, which the theme cannot register (its wrapper renders the
 * engine card, so it would recurse) — that is why the fork stays.
 *
 * Cards lay out vertically unless the block's `isVertical` or the merchant's
 * `vertical_fixed_products` theme setting says otherwise (default on, like Twig
 * Raed's `theme.settings.get('vertical_fixed_products', true)`).
 *
 * Upgrade notes: `FORKS.md`.
 */
export function FixedProducts({ data }: FixedProductsProps) {
  const { t } = useTranslation();
  const { theme } = useTwilight();

  const title = data.title;
  const limit = blockLimit(data.limit);
  const isVertical = data.isVertical ?? theme.settings.vertical_fixed_products ?? true;

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

  return (
    <Suspense fallback={<FixedProductsSkeleton />}>
      {title && (
        <div className="s-block__title">
          <div className="right-side">
            <h2>{title}</h2>
          </div>
          {data.display_all_url && (
            <Link to={data.display_all_url} className="s-block__display-all">
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
