import { useCallback, useRef } from 'react';
import { ProductCardSkeleton, SallaProductsList } from '@salla.sa/twilight-components-react';
import { NoContent } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { parseNextPageToken, product } from '@salla.sa/twilight-theme-engine/api/product';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { ProductCard } from '../product';
import { useProductCardLayout } from '../../hooks/useProductCardLayout';

export interface LatestProductsProps {
  data: {
    title?: string;
    priority?: boolean;
    [key: string]: unknown;
  };
}

/**
 * `latest-products` home block — the store's newest products, loading more as
 * the customer scrolls. The engine shows it when the merchant placed no blocks.
 *
 * Fork of the engine block — identical markup and data flow, only swapped to the
 * theme's {@link ProductCard} wrapper so these cards match every other product
 * list (solid add-to-cart button, wishlist in the footer).
 * Registered in `app/router.tsx`.
 *
 * Upgrade notes: `FORKS.md`.
 */
export function LatestProducts({ data }: LatestProductsProps) {
  const { t } = useTranslation();
  const layout = useProductCardLayout();
  const nextRef = useRef<string | null>(null);

  const loader = useCallback(async () => {
    const result = await product.list({ source: 'latest', ...parseNextPageToken(nextRef.current) });
    nextRef.current = result.next;
    return result;
  }, []);

  return (
    <>
      <div className="s-block__title">
        <h2>{data.title || t('blocks.home.latest_products', 'Latest Products')}</h2>
      </div>
      <SallaProductsList<Product>
        loader={loader}
        mode="infinite"
        itemsClassName={`s-products-list-${layout}-cards`}
        skeleton={<ProductCardSkeleton />}
        skeletonType="item"
        skeletonCount={8}
        empty={
          <NoContent
            icon="sicon-shopping-bag"
            message={t('pages.categories.no_products', 'No products found in this category')}
          />
        }
        t={(key, fallback) => t(key, fallback || key)}
      >
        {(products) =>
          products.map((item, index) => (
            <ProductCard
              key={item.id}
              product={item}
              layout={layout}
              imagePriority={!!data.priority && index < 2}
            />
          ))
        }
      </SallaProductsList>
    </>
  );
}
