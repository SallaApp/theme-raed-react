import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Page } from '@salla.sa/twilight-theme-engine/types';
import { CartPage } from '../../../app/components/cart/CartPage';

const makeCart = () => ({
  id: 5,
  items: [
    {
      id: 1,
      product_id: 2,
      product_name: 'Product',
      product_image: '',
      url: '/p2',
      quantity: 1,
      price: 10,
      product_price: 10,
      total: 10,
      is_available: true,
    },
  ],
  options: [
    {
      id: 9,
      quantity: 1,
      options: [{ id: 3, name: 'Wrapping', type: 'text', required: true, details: [] }],
    },
  ],
});
let cartData = makeCart();
// Set to make `cart/<id>` fail, as an error response does.
let cartError: Error | null = null;

vi.mock('@salla.sa/twilight-components-react/conditional-offer', () => ({
  SallaConditionalOffer: () => null,
}));
vi.mock('@salla.sa/twilight-components-react/offer', () => ({ SallaOffer: () => null }));
vi.mock('@salla.sa/twilight-components-react/cart-item-offers', () => ({
  SallaCartItemOffers: () => null,
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: () => null,
  usePageConfig: () => {},
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (amount: unknown) => String(amount) }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => null,
  NoContent: ({ message }: { message: string }) => <p data-testid="cart-empty-message">{message}</p>,
  Link: ({ children }: { children?: unknown }) => <a>{children as never}</a>,
  Image: () => <img alt="" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/cart', () => ({
  CartSummary: () => null,
  SeoCartWidget: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: { settings: {} } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/skeleton', () => ({
  CartSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/api/loyalty', () => ({
  loyalty: { queries: { points: () => ({ queryKey: ['points'], queryFn: () => null }) } },
}));
vi.mock('@salla.sa/twilight-theme-engine/api/cart', async (importOriginal) => {
  const { cart } =
    await importOriginal<typeof import('@salla.sa/twilight-theme-engine/api/cart')>();
  return {
    cart: {
      ...cart,
      queries: {
        ...cart.queries,
        detail: (id: number) => ({
          queryKey: ['cart', id],
          queryFn: () => {
            if (cartError) throw cartError;
            return cartData;
          },
        }),
      },
    },
  };
});

function renderPage() {
  return render(
    // No retries, so a failed request reaches its error state straight away.
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CartPage page={{} as Page} />
    </QueryClientProvider>
  );
}

describe('CartPage', () => {
  let originalSalla: unknown;
  let getCurrentCartId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cartData = makeCart();
    cartError = null;
    getCurrentCartId = vi.fn(() => Promise.resolve(5));
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = {
      onReady: () => Promise.resolve(),
      cart: { api: { getCurrentCartId } },
      event: { on: vi.fn(), off: vi.fn() },
    };
  });

  afterEach(() => {
    (window as { salla?: unknown }).salla = originalSalla;
  });

  describe('cart id', () => {
    it('reads the cart id only after the SDK is ready', async () => {
      let ready!: () => void;
      const sdkReady = new Promise<void>((resolve) => (ready = resolve));
      (window as unknown as { salla: { onReady: () => Promise<void> } }).salla.onReady = () =>
        sdkReady;

      const { getByTestId, container } = renderPage();
      expect(getByTestId('skeleton')).toBeTruthy();
      expect(getCurrentCartId).not.toHaveBeenCalled();

      ready();
      await waitFor(() => expect(container.querySelector('.cart-options')).toBeTruthy());
      expect(getCurrentCartId).toHaveBeenCalled();
    });

    it('still loads the cart when salla.onReady() rejects', async () => {
      (window as unknown as { salla: { onReady: () => Promise<void> } }).salla.onReady = () =>
        Promise.reject(new Error('partial init'));

      const { container } = renderPage();

      await waitFor(() => expect(container.querySelector('.cart-options')).toBeTruthy());
      expect(getCurrentCartId).toHaveBeenCalled();
    });
  });

  describe('cart options', () => {
    it('renders the raw element with the options attribute, so it shows them instead of fetching', async () => {
      const { container } = renderPage();

      const element = await waitFor(() => {
        const found = container.querySelector('.cart-options form#item-9 salla-product-options');
        expect(found).toBeTruthy();
        return found!;
      });
      expect(element.getAttribute('options')).toBe(JSON.stringify(cartData.options[0].options));
      expect(element.getAttribute('product-id')).toBe('9');
    });

    it('renders no options element for a cart option without fields, like Twig', async () => {
      cartData.options[0].options = [];
      const { container } = renderPage();

      await waitFor(() =>
        expect(container.querySelector('.cart-options form#item-9')).toBeTruthy()
      );
      expect(container.querySelector('salla-product-options')).toBeNull();
    });

    it('renders no cart options block when the cart has none', async () => {
      cartData.options = [];
      const { container } = renderPage();

      await waitFor(() => expect(container.querySelector('.cart-item')).toBeTruthy());
      expect(container.querySelector('.cart-options')).toBeNull();
    });
  });

  describe('when the cart cannot be loaded', () => {
    it('shows an error with a retry instead of the skeleton when the cart request fails', async () => {
      cartError = new Error('Request failed with status code 404');
      const { getByText, queryByTestId, container } = renderPage();

      await waitFor(() => expect(getByText('common.errors.error_occurred')).toBeTruthy());
      expect(queryByTestId('skeleton')).toBeNull();

      cartError = null;
      fireEvent.click(getByText('common.elements.try_again'));
      await waitFor(() => expect(container.querySelector('.cart-item')).toBeTruthy());
    });

    it('shows the error when the SDK fails to give the cart id', async () => {
      getCurrentCartId.mockImplementation(() => Promise.reject(new Error('no cart id')));
      const { getByText, queryByTestId } = renderPage();

      await waitFor(() => expect(getByText('common.errors.error_occurred')).toBeTruthy());
      expect(queryByTestId('skeleton')).toBeNull();
    });

    it('shows the empty cart, not the skeleton, when the SDK knows of no cart', async () => {
      getCurrentCartId.mockImplementation(() => Promise.resolve(null));
      const { getByTestId, queryByTestId } = renderPage();

      await waitFor(() =>
        expect(getByTestId('cart-empty-message').textContent).toBe('pages.cart.empty_cart')
      );
      expect(queryByTestId('skeleton')).toBeNull();
    });
  });
});
