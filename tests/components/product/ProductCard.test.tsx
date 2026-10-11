import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { ProductCard } from '../../../app/components/product/ProductCard';

const wishlistState = { ids: [] as number[] };

// Mirrors the real engine's conditional: the image-corner wishlist button only
// renders for `!isHorizontal && !isFullImage` (theme-engine ProductCard.tsx) —
// a `layout` change on an already-mounted card unmounts just that button while
// its siblings (and the whole card) stay mounted.
vi.mock('@salla.sa/twilight-theme-engine/product', () => ({
  ProductCard: ({
    product,
    layout = 'vertical',
  }: {
    product: { id: number; name: string };
    layout?: string;
  }) => (
    <div className="s-product-card-vertical" data-testid="engine-card">
      <div className="s-product-card-image">
        {layout !== 'horizontal' && (
          <button
            type="button"
            className="s-product-card-wishlist-btn"
            aria-label="engine wishlist"
          >
            {product.name}
          </button>
        )}
      </div>
      <div className="s-product-card-content-footer" data-testid="footer">
        <salla-add-product-button fill="outline" />
      </div>
    </div>
  ),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({
    has: (id: number) => wishlistState.ids.includes(id),
    toggle: vi.fn((id: number) => {
      wishlistState.ids = wishlistState.ids.includes(id)
        ? wishlistState.ids.filter((x) => x !== id)
        : [...wishlistState.ids, id];
    }),
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

const product = { id: 42, name: 'Test product' } as never;

beforeEach(() => {
  wishlistState.ids = [];
  cleanup();
});

describe('ProductCard', () => {
  it('portals a wishlist toggle into the engine card footer instead of moving the image one', async () => {
    const { getByTestId, getByLabelText } = render(<ProductCard product={product} />);

    await waitFor(() => {
      expect(
        getByTestId('footer').querySelector('[aria-label="Add or remove to wishlist"]')
      ).toBeTruthy();
    });

    // The engine's own image-corner button is untouched — still inside the image container,
    // not moved (i.e. this is a style hide, not the old appendChild reparenting).
    expect(getByLabelText('engine wishlist').closest('.s-product-card-image')).toBeTruthy();
    // Our portaled button lives in the footer, as a distinct element.
    expect(getByTestId('footer').querySelector('button')).toBeTruthy();
  });

  it('hides the engine image-corner button so only one wishlist control is visible', async () => {
    const { getByTestId, getByLabelText } = render(<ProductCard product={product} />);

    await waitFor(() => expect(getByLabelText('engine wishlist').style.display).toBe('none'));
    // The footer's portaled button stays visible (no inline hide applied to it).
    expect(getByTestId('footer').querySelector('button')?.style.display).not.toBe('none');
  });

  it('toggles the wishlist through the portaled button without touching the engine node', async () => {
    const { getByTestId } = render(<ProductCard product={product} />);

    await waitFor(() => expect(getByTestId('footer').querySelector('button')).toBeTruthy());
    const footerBtn = getByTestId('footer').querySelector('button')!;
    footerBtn.click();

    expect(wishlistState.ids).toContain(42);
  });

  it('shows a saved product as added when the list sends its id as a string', async () => {
    wishlistState.ids = [42];
    const { getByTestId } = render(<ProductCard product={{ id: '42', name: 'Listed' } as never} />);

    await waitFor(() =>
      expect(getByTestId('footer').querySelector('button')?.className).toContain(
        's-product-card-wishlist-added'
      )
    );
  });

  it('marks the heart with the product id, as Twig does, so wishlist apps can find it', async () => {
    const { getByTestId } = render(<ProductCard product={product} />);

    await waitFor(() =>
      expect(getByTestId('footer').querySelector('button')?.getAttribute('data-id')).toBe('42')
    );
  });

  it('unmounts cleanly — no DOM-reparenting removeChild errors', async () => {
    const { getByTestId, unmount } = render(<ProductCard product={product} />);
    await waitFor(() => expect(getByTestId('footer').querySelector('button')).toBeTruthy());

    expect(() => unmount()).not.toThrow();
  });

  it('survives the engine unmounting its own conditional wishlist button on a layout change', async () => {
    // The old implementation physically moved the engine's image-corner button into the
    // footer with `appendChild`. React still believed it lived under `.s-product-card-image`,
    // so when a `layout` change made the engine stop rendering it there, React's reconciler
    // tried to `removeChild` it from that (no-longer-actual) parent and threw `NotFoundError`.
    const { getByTestId, rerender } = render(<ProductCard product={product} layout="vertical" />);
    await waitFor(() => expect(getByTestId('footer').querySelector('button')).toBeTruthy());

    expect(() => rerender(<ProductCard product={product} layout="horizontal" />)).not.toThrow();
  });
});
