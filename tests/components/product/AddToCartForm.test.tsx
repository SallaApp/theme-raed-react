import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { AddToCartForm } from '../../../app/components/product/AddToCartForm';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    locale: 'ar',
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: { settings: {} } }),
}));

// jsdom has no IntersectionObserver; report every element as visible so the
// deferred-hydration wrappers mount the real web-component hosts.
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

afterEach(() => {
  delete (window as unknown as { salla?: unknown }).salla;
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
    max_quantity: 163,
    ...overrides,
  }) as Product;

const quantityHost = (container: HTMLElement) =>
  container.querySelector('salla-quantity-input') as HTMLElement | null;

describe('AddToCartForm quantity field', () => {
  it('puts name and max on the salla-quantity-input host as attributes', async () => {
    const { container } = render(<AddToCartForm product={makeProduct()} />);

    await waitFor(() => expect(quantityHost(container)).toBeTruthy());
    const host = quantityHost(container)!;
    expect(host.getAttribute('name')).toBe('quantity');
    expect(host.getAttribute('max')).toBe('163');
  });

  it('omits max when the product has no quantity limit', async () => {
    const { container } = render(
      <AddToCartForm product={makeProduct({ max_quantity: undefined })} />
    );

    await waitFor(() => expect(quantityHost(container)).toBeTruthy());
    const host = quantityHost(container)!;
    expect(host.getAttribute('name')).toBe('quantity');
    expect(host.hasAttribute('max')).toBe(false);
  });

  it('sends the quantity with the price request on change', () => {
    const getPrice = vi.fn();
    (window as unknown as { salla: unknown }).salla = { product: { getPrice } };
    const { container } = render(
      <AddToCartForm
        product={makeProduct({ is_hidden_quantity: true })}
        formStartSlot={<input type="text" name="notes" />}
      />
    );

    fireEvent.change(container.querySelector('input[name="notes"]')!, { target: { value: 'x' } });

    expect(getPrice).toHaveBeenCalledTimes(1);
    expect((getPrice.mock.calls[0][0] as FormData).get('quantity')).toBe('1');
  });

  it('skips the price request without focusing an empty required option', () => {
    const getPrice = vi.fn();
    (window as unknown as { salla: unknown }).salla = { product: { getPrice } };
    const { container } = render(
      <AddToCartForm
        product={makeProduct({ is_hidden_quantity: true })}
        formStartSlot={
          <>
            <select required name="options[1]" defaultValue="">
              <option value="">-</option>
              <option value="1">A</option>
            </select>
            <input type="text" name="notes" />
          </>
        }
      />
    );
    const select = container.querySelector('select')!;
    const onInvalid = vi.fn();
    select.addEventListener('invalid', onInvalid);

    fireEvent.change(container.querySelector('input[name="notes"]')!, { target: { value: 'x' } });

    expect(getPrice).not.toHaveBeenCalled();
    expect(onInvalid).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(select);
  });

  function renderWithEmptyRequiredOption() {
    const getPrice = vi.fn();
    (window as unknown as { salla: unknown }).salla = { product: { getPrice } };
    const utils = render(
      <AddToCartForm
        product={makeProduct({ is_hidden_quantity: true })}
        formStartSlot={
          <>
            <salla-product-options>
              <select required name="options[1]" defaultValue="">
                <option value="">-</option>
                <option value="1">A</option>
              </select>
            </salla-product-options>
            <salla-quantity-input>
              <input type="number" name="qty-stepper" defaultValue="1" />
            </salla-quantity-input>
            <input type="text" name="notes" />
          </>
        }
      />
    );
    const options = utils.container.querySelector('salla-product-options') as HTMLElement & {
      validateAndScroll: ReturnType<typeof vi.fn>;
    };
    options.validateAndScroll = vi.fn(() => Promise.resolve(false));
    return { ...utils, getPrice, options };
  }

  it('shows the empty required options when the quantity changes, like the add-to-cart button', () => {
    const { container, getPrice, options } = renderWithEmptyRequiredOption();

    fireEvent.change(container.querySelector('input[name="qty-stepper"]')!, {
      target: { value: '2' },
    });

    expect(getPrice).not.toHaveBeenCalled();
    expect(options.validateAndScroll).toHaveBeenCalledOnce();
  });

  it('keeps an option edit silent while another required option is still empty', () => {
    const { container, getPrice, options } = renderWithEmptyRequiredOption();

    fireEvent.change(container.querySelector('input[name="notes"]')!, { target: { value: 'x' } });

    expect(getPrice).not.toHaveBeenCalled();
    expect(options.validateAndScroll).not.toHaveBeenCalled();
  });

  it('posts a hidden quantity of 1 for hidden-quantity products', () => {
    const { container } = render(
      <AddToCartForm product={makeProduct({ is_hidden_quantity: true })} />
    );

    expect(quantityHost(container)).toBeNull();
    const form = container.querySelector('form')!;
    expect(new FormData(form).get('quantity')).toBe('1');
  });
});

describe('AddToCartForm add-to-cart button', () => {
  it('puts width and type on the salla-add-product-button host as attributes', async () => {
    const { container } = render(<AddToCartForm product={makeProduct()} />);

    await waitFor(() => expect(container.querySelector('salla-add-product-button')).toBeTruthy());
    const host = container.querySelector('salla-add-product-button')!;
    expect(host.getAttribute('width')).toBe('wide');
    expect(host.getAttribute('type')).toBe('submit');
  });
});
