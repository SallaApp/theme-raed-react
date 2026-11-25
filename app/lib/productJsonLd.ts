import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { HeadDescriptor } from '@salla.sa/twilight-theme-engine/utils/head';

type PricedProduct = Pick<Product, 'is_on_sale' | 'sale_price' | 'price' | 'starting_price'>;

const GTIN_KEYS: Record<number, string> = { 8: 'gtin8', 12: 'gtin12', 13: 'gtin13', 14: 'gtin14' };

function toPrice(value: unknown): number | undefined {
  const price = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : undefined;
}

/**
 * The price the product page shows: the sale price while a discount is on, otherwise the
 * "starting from" price of a product with variants, otherwise the price.
 * `sale_price` is 0 on `products/{id}/details` when the product is not on sale.
 */
export function productOfferPrice(product: PricedProduct): number | undefined {
  const sale = toPrice(product.sale_price);
  if (product.is_on_sale && sale !== undefined && sale > 0) return sale;
  return toPrice(product.starting_price) ?? toPrice(product.price);
}

/** `{ gtin13: '…' }` for an 8, 12, 13 or 14 digit GTIN, otherwise nothing. */
export function productGtin(gtin: string | null | undefined): Record<string, string> {
  const digits = gtin?.trim() ?? '';
  const key = /^\d+$/.test(digits) ? GTIN_KEYS[digits.length] : undefined;
  return key ? { [key]: digits } : {};
}

/**
 * Corrects the engine's Product JSON-LD: `offers.price` is the price the page shows, and the
 * GTIN is written under the key for its length. Anything else is left as the engine built it.
 */
export function withProductJsonLd(
  result: HeadDescriptor,
  product: (PricedProduct & Pick<Product, 'gtin'>) | undefined
): HeadDescriptor {
  const jsonLd = result.jsonLd;
  if (!product || !jsonLd || Array.isArray(jsonLd) || jsonLd['@type'] !== 'Product') return result;

  const offers = jsonLd.offers as Record<string, unknown> | undefined;
  const price = productOfferPrice(product);
  return {
    ...result,
    jsonLd: {
      ...jsonLd,
      ...productGtin(product.gtin),
      ...(offers && !Array.isArray(offers) && price !== undefined ? { offers: { ...offers, price } } : {}),
    },
  };
}
