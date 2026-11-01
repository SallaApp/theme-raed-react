import type { Product } from '@salla.sa/twilight-theme-engine/types';

/** The Twig Raed theme's placeholder, shown for a product with no photo yet. */
export const PRODUCT_IMAGE_PLACEHOLDER =
  'https://cdn.assets.salla.network/themes/1247874246/1.379.0/images/placeholder.png';

/**
 * The product with a photo to show, picked as the Twig card does: its image, its
 * thumbnail, then the placeholder. `isPlaceholder` says the last one was used.
 */
export function withImageFallback<T extends Pick<Product, 'image'> & { thumbnail?: string | null }>(
  product: T
): { product: T; isPlaceholder: boolean } {
  if (product.image?.url) return { product, isPlaceholder: false };
  const url = product.thumbnail || PRODUCT_IMAGE_PLACEHOLDER;
  return {
    product: { ...product, image: { ...product.image, url } },
    isPlaceholder: !product.thumbnail,
  };
}
