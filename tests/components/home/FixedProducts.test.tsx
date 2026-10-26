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

const themeSettings: { vertical_fixed_products?: boolean } = {};
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: themeSettings } }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children }: { to: string; children?: unknown }) => (
    <a href={to}>{children as never}</a>
  ),
}));

vi.mock('@salla.sa/twilight-components-react', () => ({
  FixedProductsSkeleton: () => <div data-testid="home-fixed-products-skeleton" />,
}));

vi.mock('../../../app/components/product', () => ({
  ProductCard: ({
    product,
    layout,
  }: {
    product: { id: number; name?: string };
    layout?: string;
  }) => (
    <div data-testid={`home-fixed-products-card-${product.id}`} data-layout={layout}>
      {product.name}
    </div>
  ),
}));

const products = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `P${index + 1}` }));

/** The rendered product cards, in order. */
const cards = (container: HTMLElement) =>
  container.querySelectorAll('[data-testid^="home-fixed-products-card-"]');

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
  delete themeSettings.vertical_fixed_products;
});

const wrapper = (container: HTMLElement) => container.querySelector('.s-products-list-wrapper');

describe('FixedProducts', () => {
  it('asks for and shows as many products as the block limit, past 4', async () => {
    listMock.mockResolvedValue({ items: products(8) });
    const { container } = renderBlock({ limit: 8 });
    await waitFor(() => expect(cards(container)).toHaveLength(8));
    expect(cards(container)[7].getAttribute('data-testid')).toBe('home-fixed-products-card-8');
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ perPage: 8 }));
  });

  it('never shows more than the limit, even when the API sends more', async () => {
    listMock.mockResolvedValue({ items: products(12) });
    const { container } = renderBlock({ limit: '8' });
    await waitFor(() => expect(cards(container)).toHaveLength(8));
  });

  it('shows what the API returns when the block has no limit', async () => {
    listMock.mockResolvedValue({ items: products(6) });
    const { container } = renderBlock({});
    await waitFor(() => expect(cards(container)).toHaveLength(6));
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ perPage: undefined }));
  });

  it('home.block.fixed-products: lays products out horizontally when vertical_fixed_products is off', async () => {
    themeSettings.vertical_fixed_products = false;
    listMock.mockResolvedValue({ items: products(2) });
    const { container } = renderBlock({});
    await waitFor(() => expect(cards(container)).toHaveLength(2));
    expect(wrapper(container)?.className).toContain('s-products-list-horizontal-cards');
    expect(wrapper(container)?.className).not.toContain('s-products-list-vertical-cards');
    cards(container).forEach((card) => expect(card.getAttribute('data-layout')).toBe('horizontal'));
  });

  it('home.block.fixed-products: lays products out vertically when vertical_fixed_products is on', async () => {
    themeSettings.vertical_fixed_products = true;
    listMock.mockResolvedValue({ items: products(2) });
    const { container } = renderBlock({});
    await waitFor(() => expect(cards(container)).toHaveLength(2));
    expect(wrapper(container)?.className).toContain('s-products-list-vertical-cards');
    cards(container).forEach((card) => expect(card.getAttribute('data-layout')).toBe('vertical'));
  });

  it('home.block.fixed-products: lays products out vertically when vertical_fixed_products is unset', async () => {
    listMock.mockResolvedValue({ items: products(2) });
    const { container } = renderBlock({});
    await waitFor(() => expect(cards(container)).toHaveLength(2));
    expect(wrapper(container)?.className).toContain('s-products-list-vertical-cards');
    cards(container).forEach((card) => expect(card.getAttribute('data-layout')).toBe('vertical'));
  });

  it("home.block.fixed-products: the block's own isVertical wins over the theme setting", async () => {
    themeSettings.vertical_fixed_products = true;
    listMock.mockResolvedValue({ items: products(2) });
    const { container } = renderBlock({ isVertical: false });
    await waitFor(() => expect(cards(container)).toHaveLength(2));
    expect(wrapper(container)?.className).toContain('s-products-list-horizontal-cards');
    cards(container).forEach((card) => expect(card.getAttribute('data-layout')).toBe('horizontal'));
  });

  it.each([0, -3, 2.5, 'abc', ''])(
    'home.block.fixed-products: falls back to the API page size for the invalid limit %j',
    async (limit) => {
      listMock.mockResolvedValue({ items: products(5) });
      const { container } = renderBlock({ limit });
      await waitFor(() => expect(cards(container)).toHaveLength(5));
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ perPage: undefined }));
    }
  );
});
