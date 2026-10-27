import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { ProductsSlider } from '../../../app/components/home/ProductsSlider';
import { STORE_API } from '../../mocks/handlers';
import { createProduct } from '../../mocks/factories';
import { installMockServer, server, useScenario } from '../../mocks/server';

installMockServer();

// Every `GET /products` the block makes, so a test can assert what it asked the API for.
let requests: URL[] = [];
const respondWith = (resolver: Parameters<typeof http.get>[1]) =>
  server.use(
    http.get(`${STORE_API}/products`, (info) => {
      requests.push(new URL(info.request.url));
      return resolver(info);
    })
  );

// Only the module under test, not the whole barrel and everything it re-exports.
vi.mock('../../../app/components/common', async () => ({
  ScrollCarousel: (
    await vi.importActual<typeof import('../../../app/components/common/ScrollCarousel')>(
      '../../../app/components/common/ScrollCarousel'
    )
  ).ScrollCarousel,
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children }: { to: string; children?: unknown }) => (
    <a href={to}>{children as never}</a>
  ),
}));

vi.mock('@salla.sa/twilight-components-react', () => ({
  ProductsListSkeleton: () => <div data-testid="list-skeleton" />,
}));

vi.mock('../../../app/components/product', () => ({
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
  requests = [];
  useScenario('default');
  respondWith(() =>
    HttpResponse.json({
      data: [1, 2, 3].map((id) => createProduct({ id, name: `P${id}` })),
      cursor: { current: 1, next: null, previous: null },
    })
  );
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
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].searchParams.get('source')).toBe('related');
    expect(requests[0].searchParams.getAll('source_value[]')).toEqual(['99']);
    await waitFor(() => expect(getAllByTestId('product-card')).toHaveLength(3));
    expect(getAllByTestId('product-card')[0].textContent).toBe('P1');
  });

  it('asks for the block limit and never shows more, even when the API sends more', async () => {
    respondWith(() =>
      HttpResponse.json({
        data: Array.from({ length: 12 }, (_, index) =>
          createProduct({ id: index + 1, name: `P${index + 1}` })
        ),
      })
    );
    const { getAllByTestId } = renderWithClient(
      <ProductsSlider data={{ products: { source: 'latest' }, limit: 8 }} />
    );
    await waitFor(() => expect(getAllByTestId('product-card')).toHaveLength(8));
    expect(requests[0].searchParams.get('per_page')).toBe('8');
  });

  it('shows the skeleton until the products resolve', () => {
    respondWith(() => new Promise(() => {}));
    const { getByTestId } = renderWithClient(
      <ProductsSlider data={{ products: { source: 'related', source_value: 1 } }} />
    );
    expect(getByTestId('list-skeleton')).toBeTruthy();
  });

  it('removes the whole block (title included) when the source resolves empty', async () => {
    respondWith(() => HttpResponse.json({ data: [] }));
    const { container } = renderWithClient(
      <ProductsSlider
        data={{ products: { source: 'related', source_value: 1 }, title: 'Similar products' }}
      />
    );
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('hides the block on a fetch error, without reporting a false onResolve(0)', async () => {
    respondWith(() => HttpResponse.error());
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
