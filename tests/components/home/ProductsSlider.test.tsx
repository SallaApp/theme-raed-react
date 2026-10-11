import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsSlider } from '../../../app/components/home/ProductsSlider';

const listMock = vi.fn();

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    list: (...args: unknown[]) => listMock(...args),
    queries: {
      list: (params: { source: string; sourceValue?: unknown }) => ({
        queryKey: ['products', 'list', params],
        queryFn: () => listMock(params),
      }),
    },
  },
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children }: { to: string; children?: unknown }) => (
    <a href={to}>{children as never}</a>
  ),
}));

vi.mock('@salla.sa/twilight-components-react', () => ({
  ProductsListSkeleton: () => <div data-testid="list-skeleton" />,
}));

vi.mock('../../../app/components/product/ProductCard', () => ({
  ProductCard: ({ product }: { product: { id?: number; name?: string } }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

// `useQuery` needs a QueryClient in context — `retry: false` so an error test
// doesn't wait through React Query's real retry backoff.
function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  listMock.mockReset();
  listMock.mockResolvedValue({
    items: [
      { id: 1, name: 'P1' },
      { id: 2, name: 'P2' },
      { id: 3, name: 'P3' },
    ],
  });
  Element.prototype.scrollBy = vi.fn();
});

describe('ProductsSlider', () => {
  it('renders nothing without a products source', () => {
    const { container } = renderWithClient(<ProductsSlider data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('fetches from the given source and renders a slide per product', async () => {
    const { getAllByTestId } = renderWithClient(
      <ProductsSlider data={{ products: { source: 'related', source_value: 99 } }} />
    );
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'related', sourceValue: 99 })
      )
    );
    await waitFor(() => expect(getAllByTestId('product-card')).toHaveLength(3));
    expect(getAllByTestId('product-card')[0].textContent).toBe('P1');
  });

  it('shows the skeleton until the products resolve', () => {
    listMock.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = renderWithClient(
      <ProductsSlider data={{ products: { source: 'related', source_value: 1 } }} />
    );
    expect(getByTestId('list-skeleton')).toBeTruthy();
  });

  it('removes the whole block (title included) when the source resolves empty', async () => {
    listMock.mockResolvedValue({ items: [] });
    const { container } = renderWithClient(
      <ProductsSlider
        data={{ products: { source: 'related', source_value: 1 }, title: 'Similar products' }}
      />
    );
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('hides the block on a fetch error, without reporting a false onResolve(0)', async () => {
    listMock.mockRejectedValue(new Error('network error'));
    const onResolve = vi.fn();
    const { container } = renderWithClient(
      <ProductsSlider
        data={{ products: { source: 'related', source_value: 1 }, title: 'Similar products' }}
        onResolve={onResolve}
      />
    );
    await waitFor(() => expect(container.firstChild).toBeNull());
    // A fetch failure isn't the same thing as "resolved with 0 products" —
    // the caller shouldn't hear a count for a request that never succeeded.
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('renders the title and a display-all link', async () => {
    const { getByText } = renderWithClient(
      <ProductsSlider
        data={{
          products: { source: 'related', source_value: 1 },
          title: 'Similar products',
          display_all_url: '/c/all',
        }}
      />
    );
    expect(getByText('Similar products')).toBeTruthy();
    await waitFor(() =>
      expect((getByText('View All').closest('a') as HTMLAnchorElement).getAttribute('href')).toBe(
        '/c/all'
      )
    );
  });

  it('renders progress + prev/next controls and scrolls on click', async () => {
    const { container, getByLabelText, getAllByTestId } = renderWithClient(
      <ProductsSlider data={{ products: { source: 'related', source_value: 1 } }} />
    );
    await waitFor(() => expect(getAllByTestId('product-card').length).toBe(3));

    expect(container.querySelector('.scroll-carousel__progress-thumb')).toBeTruthy();
    expect(getByLabelText('Previous')).toBeTruthy();

    fireEvent.click(getByLabelText('Next'));
    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });
});
