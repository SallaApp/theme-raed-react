import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { resetWishlistStore } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { ProductDetails } from '../../../app/components/product/ProductDetails';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    locale: 'ar',
    t: (key: string) => key,
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: ({ name }: { name: string }) => <div data-hook-slot={name} />,
}));

// jsdom has no IntersectionObserver; report every element as visible so the
// deferred-hydration wrappers mount.
beforeAll(() => {
  class VisibleObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.cb(
        [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.IntersectionObserver = VisibleObserver as unknown as typeof IntersectionObserver;
});

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 266863684,
    name: 'Product',
    price: 500,
    regular_price: 500,
    sale_price: 0,
    is_on_sale: false,
    status: 'sale',
    type: 'product',
    ...overrides,
  }) as Product;

const skuValue = (container: HTMLElement) =>
  container.querySelector('.text-unicode')?.textContent ?? null;

describe('ProductDetails SKU row', () => {
  it('shows the product SKU when no live SKU is passed', async () => {
    const { container } = render(<ProductDetails product={makeProduct({ sku: 'PARENT' })} />);

    await waitFor(() => expect(skuValue(container)).toBe('PARENT'));
  });

  it('shows the selected variant SKU over the loader SKU', async () => {
    const { container } = render(
      <ProductDetails product={makeProduct({ sku: 'PARENT' })} sku="VAR-1" />
    );

    await waitFor(() => expect(skuValue(container)).toBe('VAR-1'));
  });

  it('hides the row when the selected variant has no SKU', async () => {
    const { container } = render(
      <ProductDetails product={makeProduct({ sku: 'PARENT' })} sku="" />
    );

    await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
    expect(container.querySelector('.text-unicode')).toBeNull();
  });
});

const barcodeValue = (container: HTMLElement) =>
  [...container.querySelectorAll('.text-unicode')].find((el) =>
    el.previousElementSibling?.textContent?.includes('pages.products.barcode')
  )?.textContent ?? null;

describe('ProductDetails barcode row', () => {
  it('shows the product barcode when no live barcode is passed', async () => {
    const { container } = render(
      <ProductDetails product={makeProduct({ barcode: 'PARENT-BC' })} />
    );

    await waitFor(() => expect(barcodeValue(container)).toBe('PARENT-BC'));
  });

  it('shows the selected variant barcode over the loader barcode', async () => {
    const { container } = render(
      <ProductDetails product={makeProduct({ barcode: 'PARENT-BC' })} barcode="VAR-BC" />
    );

    await waitFor(() => expect(barcodeValue(container)).toBe('VAR-BC'));
  });

  it('hides the row when the selected variant has no barcode', async () => {
    const { container } = render(
      <ProductDetails product={makeProduct({ barcode: 'PARENT-BC' })} barcode="" />
    );

    await waitFor(() => expect(container.querySelector('h1')).toBeTruthy());
    expect(container.textContent).not.toContain('pages.products.barcode');
  });
});

describe('ProductDetails description hooks', () => {
  it('renders .start and description once, and leaves .end to the page after the form (as in Twig)', async () => {
    const { container } = render(<ProductDetails product={makeProduct()} />);
    const count = (name: string) => container.querySelectorAll(`[data-hook-slot="${name}"]`).length;
    await waitFor(() => expect(count('product:single.description.start')).toBe(1));
    expect(count('product:single.description')).toBe(1);
    expect(count('product:single.description.end')).toBe(0);
  });
});

describe('ProductDetails wishlist heart', () => {
  const onAdded: Array<(e: unknown, id: number) => void> = [];

  beforeEach(() => {
    resetWishlistStore();
    localStorage.clear();
    onAdded.length = 0;
    (window as unknown as { salla: unknown }).salla = {
      init: vi.fn(),
      event: { on: vi.fn(), off: vi.fn() },
      storage: { get: vi.fn(() => [111]) },
      wishlist: {
        toggle: vi.fn(),
        event: {
          onAdded: vi.fn((cb) => onAdded.push(cb)),
          onRemoved: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    delete (window as unknown as { salla?: unknown }).salla;
  });

  const heart = (container: HTMLElement) =>
    container.querySelector('.product-details__title-actions .btn--wishlist');

  it('shows a saved product as added', async () => {
    const { container } = render(<ProductDetails product={makeProduct({ id: 111 })} />);

    await waitFor(() => expect(heart(container)?.className).toContain('is-added'));
  });

  it('labels the heart with the translated wishlist text', async () => {
    const { container } = render(<ProductDetails product={makeProduct({ id: 111 })} />);

    await waitFor(() =>
      expect(heart(container)?.getAttribute('aria-label')).toBe('pages.products.add_to_wishlist')
    );
  });

  it('marks the heart with the product id, as Twig does, so wishlist apps can find it', async () => {
    const { container } = render(<ProductDetails product={makeProduct({ id: 111 })} />);

    await waitFor(() => expect(heart(container)?.getAttribute('data-id')).toBe('111'));
  });

  it('switches to added when the SDK adds the product', async () => {
    const { container } = render(<ProductDetails product={makeProduct({ id: 222 })} />);
    await waitFor(() => expect(heart(container)?.className).toContain('not-added'));

    act(() => onAdded.forEach((cb) => cb({}, 222)));

    await waitFor(() => expect(heart(container)?.className).toContain('is-added'));
  });
});

describe('ProductDetails price', () => {
  afterEach(() => {
    document.cookie = 's-curr=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('labels the price in the currency the visitor chose, not the SAR the API reports', async () => {
    document.cookie = 's-curr=EUR; path=/';
    const { container } = render(
      <ProductDetails product={makeProduct({ price: 118.66, currency: 'SAR' })} />
    );

    const price = () =>
      [...container.querySelectorAll('p')].find((p) => p.textContent?.includes('118.66'));
    await waitFor(() => expect(price()?.textContent).toContain('EUR'));
    expect(price()?.querySelector('.sicon-sar')).toBeNull();
  });
});

describe('ProductDetails remaining quantity', () => {
  it('shows the remaining count for an out of stock product, as Twig does', async () => {
    const { container } = render(
      <ProductDetails
        product={makeProduct({ status: 'out', can_show_remained_quantity: true, quantity: 0 })}
      />
    );

    await waitFor(() => expect(container.textContent).toContain('pages.products.remained 0'));
    expect(container.textContent).not.toContain('blocks.product.in_stock');
  });

  it('keeps the in stock row while quantity is left', async () => {
    const { container } = render(
      <ProductDetails product={makeProduct({ can_show_remained_quantity: true, quantity: 19 })} />
    );

    await waitFor(() => expect(container.textContent).toContain('blocks.product.in_stock (19)'));
    expect(container.textContent).not.toContain('pages.products.remained');
  });
});

describe('ProductDetails description embeds', () => {
  it('loads iframes lazily unless the merchant set their own loading', async () => {
    const description =
      '<p>Intro</p><iframe class="ql-video" src="https://www.youtube.com/embed/x"></iframe>' +
      '<iframe loading="eager" src="https://maps.test/embed"></iframe>' +
      '<iframe loading = "eager" src="https://maps.test/spaced"></iframe>' +
      '<iframe title="A > B" loading="eager" src="https://maps.test/quoted"></iframe>' +
      '<iframe title="no loading=here" src="https://player.vimeo.com/video/1"></iframe>';
    const { container } = render(<ProductDetails product={makeProduct({ description })} />);

    const frames = () => [...container.querySelectorAll('.product__description iframe')];
    await waitFor(() => expect(frames()).toHaveLength(5));
    expect(frames().map((frame) => frame.getAttribute('loading'))).toEqual([
      'lazy',
      'eager',
      'eager',
      'eager',
      'lazy',
    ]);
  });
});
