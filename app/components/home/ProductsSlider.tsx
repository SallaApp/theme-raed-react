import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { ScrollCarousel } from '../common/ScrollCarousel';
import { ProductCard } from '../product/ProductCard';

export interface ProductsSliderProps {
  data: {
    products?: { source?: ProductsListSource; source_value?: number | number[] | null };
    title?: string;
    display_all_url?: string;
    position?: number;
    [key: string]: unknown;
  };
  /**
   * Called once the list resolves, with how many products came back. Lets a
   * parent drop the surrounding wrapper (lazy `<section>`, `.container`) when the
   * count is 0 instead of leaving an empty node in the DOM.
   */
  onResolve?: (count: number) => void;
}

/**
 * `products-slider` home block + the product page's "similar products" block
 * (rendered as `best-offers-<n>-slider` by the engine).
 *
 * Replaces the engine's Swiper (`<salla-products-slider>`) with the theme's
 * {@link ScrollCarousel} — a native scroll row with a progress bar + arrows,
 * matching the homepage testimonials. Styling: `04-components/home-blocks.scss`.
 */
export function ProductsSlider({ data, onResolve }: ProductsSliderProps) {
  const { t } = useTranslation();
  const source = data.products?.source;
  const sourceValue = data.products?.source_value ?? undefined;

  // `product.queries.list` over a manual fetch: scope-aware cache key, request
  // dedup, an AbortSignal wired to the query lifecycle instead of a hand-rolled
  // `alive` flag, and — the part that matters most here — automatic retries, so
  // a single transient failure doesn't reach `isError` at all (the old manual
  // fetch had no retry, so any rejection immediately read as "no products").
  const {
    data: result,
    isSuccess,
    isError,
  } = useQuery({
    ...product.queries.list({ source: source as ProductsListSource, sourceValue }),
    enabled: !!source,
  });
  const items = result?.items;

  // Keep `onResolve` out of this effect's deps — an inline callback would
  // otherwise re-fire on every parent render.
  const onResolveRef = useRef(onResolve);
  useEffect(() => {
    onResolveRef.current = onResolve;
  });

  // Only a genuinely successful result reports its count. An error (after
  // React Query's own retries) leaves the block hidden below without ever
  // calling `onResolve(0)` — the old code treated a fetch failure exactly
  // like a real empty result, which could make a parent drop its wrapper for
  // good over what might have just been a transient blip.
  useEffect(() => {
    // This *is* the parent notification, not something that could be lifted:
    // `onResolve` exists so a page-specific wrapper (e.g. the product page's
    // "similar products" rail) can drop itself once it knows this block came
    // back empty, and this component owns the fetch so it's reusable through
    // the generic home-component registry too — the result can only cross
    // that boundary once the query settles. See .react-doctor/false-positives.md.
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
    if (isSuccess) onResolveRef.current?.(items?.length ?? 0);
  }, [isSuccess, items?.length]);

  if (!source) return null;
  // Nothing to show: a genuinely empty result, or the request ultimately
  // failed — either way, drop the whole block (heading included) rather than
  // leave a lone title or a broken carousel, e.g. a product with no related
  // products.
  if (isError || (isSuccess && items?.length === 0)) return null;

  const { title } = data;
  const displayAll = data.display_all_url;
  const displayAllUrl = displayAll && displayAll !== '' && displayAll !== '#' ? displayAll : '';

  return (
    <div className="s-products-carousel">
      {(title || displayAllUrl) && (
        <div className="s-products-carousel__head">
          {title && <h2 className="s-products-carousel__title">{title}</h2>}
          {displayAllUrl && (
            <Link to={displayAllUrl} className="s-block__display-all">
              {t('blocks.home.display_all', 'View All')}
              <i className="sicon-arrow-left" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      {!isSuccess ? (
        <ProductsListSkeleton />
      ) : (
        <ScrollCarousel
          prevLabel={t('blocks.home.reviews_prev', 'Previous')}
          nextLabel={t('blocks.home.reviews_next', 'Next')}
        >
          {(items ?? []).map((item) => (
            <div key={item.id} className="s-products-carousel__slide">
              <ProductCard product={item} />
            </div>
          ))}
        </ScrollCarousel>
      )}
    </div>
  );
}
