/**
 * Listing delivery promises (`GET /api/v1/products` → `delivery_promise`).
 *
 * The products list sends, per product, at most one promise per type, fastest
 * first: `[{ type: 'express', label: 'ساعتين' }, …]`. `label` is only the
 * duration; the sentence around it comes from the theme's locales. The field is
 * absent unless the store enables listing delivery promises.
 */
export const DELIVERY_PROMISE_TYPES = ['express', 'same_day', 'next_day', 'standard'] as const;

export type DeliveryPromiseType = (typeof DELIVERY_PROMISE_TYPES)[number];

export interface DeliveryPromise {
  type: DeliveryPromiseType;
  label: string;
}

/** Salla icon font class per promise type. */
export const DELIVERY_PROMISE_ICONS: Record<DeliveryPromiseType, string> = {
  express: 'sicon-flash',
  same_day: 'sicon-shipping-fast',
  next_day: 'sicon-shipping',
  standard: 'sicon-shipping',
};

/** English fallbacks for the locale keys `blocks.product.delivery_promise.<type>`. */
export const DELIVERY_PROMISE_FALLBACKS: Record<DeliveryPromiseType, string> = {
  express: 'Express delivery in {{label}}',
  same_day: 'Same-day delivery in {{label}}',
  // Next-day shows no duration.
  next_day: 'Next-day delivery',
  standard: 'Delivery in {{label}}',
};

const isType = (value: unknown): value is DeliveryPromiseType =>
  typeof value === 'string' && (DELIVERY_PROMISE_TYPES as readonly string[]).includes(value);

/**
 * The product's promises to show, in the order the API sent them. Anything that
 * is not a list, and any entry with an unknown type or an empty label, is
 * dropped, so a missing or malformed field shows nothing.
 */
export function deliveryPromisesOf(product: unknown): DeliveryPromise[] {
  const list = (product as { delivery_promise?: unknown } | null | undefined)?.delivery_promise;
  if (!Array.isArray(list)) return [];

  return list.filter(
    (item): item is DeliveryPromise =>
      !!item &&
      typeof item === 'object' &&
      isType((item as DeliveryPromise).type) &&
      typeof (item as DeliveryPromise).label === 'string' &&
      (item as DeliveryPromise).label.trim() !== ''
  );
}
