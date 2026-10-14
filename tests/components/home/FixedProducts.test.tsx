import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FixedProducts } from '../../../app/components/home/FixedProducts';

const listMock = vi.fn();

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    queries: {
      list: (params: Record<string, unknown>) => ({
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
  FixedProductsSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('../../../app/components/product/ProductCard', () => ({
  ProductCard: ({ product }: { product: { name?: string } }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

const products = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `P${index + 1}` }));

function renderBlock(data: Record<string, unknown>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <FixedProducts data={{ products: { source: 'latest' }, ...data }} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listMock.mockReset();
});

describe('FixedProducts', () => {
  it('asks for and shows as many products as the block limit, past 4', async () => {
    listMock.mockResolvedValue({ items: products(8) });
    const { getAllByTestId } = renderBlock({ limit: 8 });
    await waitFor(() => expect(getAllByTestId('product-card')).toHaveLength(8));
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ perPage: 8 }));
  });

  it('never shows more than the limit, even when the API sends more', async () => {
    listMock.mockResolvedValue({ items: products(12) });
    const { getAllByTestId } = renderBlock({ limit: '8' });
    await waitFor(() => expect(getAllByTestId('product-card')).toHaveLength(8));
  });

  it('shows what the API returns when the block has no limit', async () => {
    listMock.mockResolvedValue({ items: products(6) });
    const { getAllByTestId } = renderBlock({});
    await waitFor(() => expect(getAllByTestId('product-card')).toHaveLength(6));
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ perPage: undefined }));
  });
});
