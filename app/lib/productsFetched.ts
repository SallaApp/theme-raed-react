import { whenSallaReady } from '@salla.sa/twilight-theme-engine/utils';
import type { Product } from '@salla.sa/twilight-theme-engine/types';

/** The engine's `dispatchProductsFetched`, which it does not export: the store's analytics reports each page as `Product List Viewed`. */
export function dispatchProductsFetched(
  list: { items: Product[]; next: string | null },
  source: { type: string; value?: string | number }
): void {
  if (typeof window === 'undefined') return;
  const payload = {
    data: list.items,
    cursor: { next: list.next },
    nextPage: list.next,
    source: source.type,
    sourceValue: source.value,
  };
  whenSallaReady((sdk) => sdk.event.dispatch('salla-products-list::products.fetched', payload));
}
