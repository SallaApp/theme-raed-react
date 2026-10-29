import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';

export type ProductCardLayout = 'vertical' | 'horizontal';

/** Read the `product_card_layout` dropdown setting (string, or `[{value}]`). */
export function productCardLayout(raw: unknown): ProductCardLayout {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const value =
    typeof first === 'string' ? first : (first as { value?: string } | undefined)?.value;
  return value === 'horizontal' ? 'horizontal' : 'vertical';
}

/**
 * The merchant's product card layout (`product_card_layout`), for the product
 * blocks on the home page and the default view of the product listing.
 */
export function useProductCardLayout(): ProductCardLayout {
  const { theme } = useTwilight();
  const settings = theme?.settings as { product_card_layout?: unknown } | undefined;
  return productCardLayout(settings?.product_card_layout);
}
