import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AddProductToast } from '../../../app/components/cart/AddProductToast';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    locale: 'ar',
    isRTL: true,
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (amount: unknown) => String(amount) }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string;
    children?: React.ReactNode;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

type Listener = (...args: unknown[]) => void;

const cartLine = (id: string, productId: number, name: string) => ({
  id,
  product_id: productId,
  product_name: name,
  product_image: `${name}.png`,
  url: `/p/${productId}`,
  quantity: 1,
  price: 100,
  total: 100,
});

const OLDER = cartLine('4173949297216737155', 739383169, 'Older line product');
const ADDED = cartLine('4175119222412797568', 603240529, 'Added product');
const CART_ITEMS = [OLDER, ADDED];

// The add-item response: `Product Added` lists every cart line, oldest first.
const addResponse = (
  entries: Array<{ id: number; cart_item_id?: string }>,
  items?: Array<{ id: string; product_id: number }>
) => ({
  data: {
    ...(items ? { cart: { items } } : {}),
    events: { 'twilight::api': { events: { 'Product Added': entries } } },
  },
});

const ALL_LINES = [
  { id: OLDER.product_id, cart_item_id: OLDER.id },
  { id: ADDED.product_id, cart_item_id: ADDED.id },
];

describe('AddProductToast', () => {
  let listeners: Map<string, Set<Listener>>;
  let details: ReturnType<typeof vi.fn>;

  const emit = (name: string, ...args: unknown[]) =>
    act(() => listeners.get(name)?.forEach((cb) => cb(...args)));

  // The SDK fires `Product Added` from the response events, then `cart::item.added`.
  const emitAdd = (response: unknown, productId: string | number) => {
    const entries = (response as ReturnType<typeof addResponse>).data.events['twilight::api']
      .events['Product Added'];
    emit('Product Added', entries);
    emit('cart::item.added', response, productId);
  };

  beforeEach(() => {
    listeners = new Map();
    details = vi.fn().mockResolvedValue({ data: { cart: { items: CART_ITEMS } } });
    (window as unknown as { salla: unknown }).salla = {
      event: {
        on: (name: string, cb: Listener) => {
          if (!listeners.has(name)) listeners.set(name, new Set());
          listeners.get(name)!.add(cb);
        },
        off: (name: string, cb: Listener) => listeners.get(name)?.delete(cb),
      },
      cart: { api: { details } },
      url: { get: () => '/cart', asset: (path: string) => `/${path}` },
    };
  });

  afterEach(() => {
    delete (window as unknown as { salla?: unknown }).salla;
  });

  it('shows the added product when the cart already held another line', async () => {
    render(<AddProductToast />);

    emitAdd(addResponse(ALL_LINES), String(ADDED.product_id));

    await waitFor(() => expect(screen.getAllByText('Added product').length).toBeGreaterThan(0));
    expect(screen.queryByText('Older line product')).toBeNull();
    expect(details).toHaveBeenCalledTimes(1);
  });

  it('shows the existing line when the added product merged into it', async () => {
    render(<AddProductToast />);

    emitAdd(addResponse(ALL_LINES), String(OLDER.product_id));

    await waitFor(() =>
      expect(screen.getAllByText('Older line product').length).toBeGreaterThan(0)
    );
    expect(screen.queryByText('Added product')).toBeNull();
  });

  it('shows a quick-added product from the response cart when the event has no line for it', async () => {
    render(<AddProductToast />);

    emitAdd(
      addResponse(
        [],
        [
          { id: OLDER.id, product_id: OLDER.product_id },
          { id: ADDED.id, product_id: ADDED.product_id },
        ]
      ),
      ADDED.product_id
    );

    await waitFor(() => expect(screen.getAllByText('Added product').length).toBeGreaterThan(0));
    expect(details).toHaveBeenCalledTimes(1);
  });

  it("closes when the shopper follows one of its links, which stay in the app unlike Twig's", async () => {
    const options = ['Color', 'Size', 'Print', 'Wrap'].map((name) => ({
      type: 'radio',
      name,
      details: [{ name: `${name} value`, is_selected: true }],
    }));
    details.mockResolvedValue({ data: { cart: { items: [{ ...ADDED, options }] } } });
    const { container } = render(<AddProductToast />);

    emitAdd(addResponse(ALL_LINES), String(ADDED.product_id));
    await waitFor(() => expect(screen.getByText('Show more')).toBeTruthy());

    act(() => screen.getByText('Show more').click());

    expect(container.querySelector('.s-add-product-toast--visible')).toBeNull();
  });

  it('stays hidden when the cart has no line for the added product', async () => {
    const { container } = render(<AddProductToast />);

    emitAdd(addResponse([{ id: 1, cart_item_id: '1' }]), '1');

    await waitFor(() => expect(details).toHaveBeenCalledTimes(1));
    expect(container.querySelector('.s-add-product-toast')).toBeNull();
  });

  it('keeps a single listener and removes it on unmount', () => {
    const { unmount } = render(<AddProductToast />);
    expect(listeners.get('cart::item.added')?.size).toBe(1);
    expect(listeners.get('Product Added')?.size ?? 0).toBe(0);

    unmount();

    expect(listeners.get('cart::item.added')?.size).toBe(0);
  });
});
