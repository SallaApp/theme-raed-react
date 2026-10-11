import { Suspense, useCallback } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { ProductCard } from '../product/ProductCard';
import { ProductsSliderSkeleton, SallaProductsSlider } from '@salla.sa/twilight-components-react';

interface ProductsSourceConfig {
  source?: string;
  source_value?: number | number[] | null;
}

export interface SliderProductsWithHeaderData {
  background?: string;
  title?: string;
  description?: string;
  display_all_url?: string;
  products?: ProductsSourceConfig | Product[];
  position?: number;
  [key: string]: unknown;
}

export interface SliderProductsWithHeaderProps {
  data: SliderProductsWithHeaderData;
}

export function SliderProductsWithHeader({ data }: SliderProductsWithHeaderProps) {
  const {
    background,
    title,
    description,
    display_all_url: displayAll,
    products: productsField,
    position = 1,
  } = data;

  let resolvedSource: ProductsListSource | undefined;
  let resolvedSourceValue: string | number | number[] | undefined;

  if (
    productsField &&
    !Array.isArray(productsField) &&
    typeof productsField === 'object' &&
    'source' in productsField
  ) {
    const config = productsField as ProductsSourceConfig;
    if (config.source) {
      resolvedSource = config.source as ProductsListSource;
      resolvedSourceValue = config.source_value ?? undefined;
    }
  } else {
    const products: Product[] = Array.isArray(productsField) ? productsField : [];
    const ids = products.map((p) => p.id).filter((id): id is number => typeof id === 'number');
    if (ids.length) {
      resolvedSource = 'selected';
      resolvedSourceValue = ids;
    }
  }

  const displayAllUrl =
    displayAll && displayAll !== '' && displayAll !== '#' ? displayAll : undefined;

  const loader = useCallback(
    () =>
      product.list({
        source: resolvedSource as ProductsListSource,
        sourceValue: resolvedSourceValue,
      }),
    [resolvedSource, resolvedSourceValue]
  );

  if (!resolvedSource) return null;

  return (
    <>
      <div
        className="slider-bg"
        style={{ backgroundImage: background ? `url('${background}')` : undefined }}
      >
        <div className="container pt-8 sm:pt-20 relative">
          <div>
            {title && <h3 className="text-lg font-bold leading-12">{title}</h3>}
            {description && <p className="text-sm mb-8 line-clamp-2 max-w-lg">{description}</p>}
          </div>
        </div>
      </div>

      <div className="container -mt-62 relative overflow-hidden">
        <Suspense fallback={<ProductsSliderSkeleton />}>
          <SallaProductsSlider
            loader={loader}
            sliderProps={{ id: `slider-with-bg-${position}` }}
            blockTitle=" "
            {...(displayAllUrl ? { displayAllUrl } : {})}
          >
            {(product) => <ProductCard product={product} />}
          </SallaProductsSlider>
        </Suspense>
      </div>
    </>
  );
}
