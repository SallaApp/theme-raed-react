import { describe, it, expect, vi, afterEach } from 'vitest';
import { dispatchProductsFetched } from '../../app/lib/productsFetched';

describe('dispatchProductsFetched', () => {
  afterEach(() => {
    delete (window as { salla?: unknown }).salla;
  });

  it("emits the page as Twig's <salla-products-list> does, once the SDK is ready", async () => {
    const dispatch = vi.fn();
    (window as { salla?: unknown }).salla = {
      event: { on: vi.fn(), dispatch },
      onReady: () => Promise.resolve(),
    };
    const items = [{ id: 1, name: 'Lamp' }] as never[];

    dispatchProductsFetched(
      { items, next: 'https://store.test/api/products?cursor=abc' },
      { type: 'categories', value: '12' }
    );

    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1));
    expect(dispatch).toHaveBeenCalledWith('salla-products-list::products.fetched', {
      data: items,
      cursor: { next: 'https://store.test/api/products?cursor=abc' },
      nextPage: 'https://store.test/api/products?cursor=abc',
      source: 'categories',
      sourceValue: '12',
    });
  });
});
