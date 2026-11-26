import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const list = vi.fn();

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useStore', () => ({
  useStore: () => ({ settings: { product: { filters: false } } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/category/c1', searchStr: '' }),
  useTwilight: () => ({ theme: { settings: {} } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/utils', async () => {
  const sort = await import('@salla.sa/twilight-theme-engine/utils/sort-options');
  // `whenSallaReady` sends the page's analytics event (`lib/productsFetched`).
  return { sortOptions: sort.sortOptions, onSallaEvent: () => () => {}, whenSallaReady: () => {} };
});
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => null,
  NoContent: () => null,
  ProductCardSkeleton: () => null,
  Image: () => null,
  RenderWhenVisible: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@salla.sa/twilight-components-react/filters', () => ({ SallaFilters: () => null }));
vi.mock('@salla.sa/twilight-components-react', () => ({
  ReviewItemSkeleton: () => null,
  // The real list's contract: it starts from `items` and appends what `loader` returns.
  ItemsList: ({
    items: initial,
    loader,
    children,
  }: {
    items: { id: number }[];
    loader: () => Promise<{ items: { id: number }[]; next: string | null }>;
    children: (items: { id: number }[]) => React.ReactNode;
  }) => {
    const [items, setItems] = React.useState(initial);
    return (
      <div>
        <ol data-testid="ids">{children(items)}</ol>
        <button
          type="button"
          onClick={async () => {
            const result = await loader();
            setItems((prev) => [...prev, ...result.items]);
          }}
        >
          load-more
        </button>
      </div>
    );
  },
}));
vi.mock('@salla.sa/twilight-theme-engine/home', () => ({
  Testimonials: () => null,
  useReorderButtons: () => {},
}));
vi.mock('@salla.sa/twilight-theme-engine/api/product', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@salla.sa/twilight-theme-engine/api/product')>();
  return {
    product: { list: (...args: unknown[]) => list(...args) },
    parseNextPageToken: actual.parseNextPageToken,
  };
});
vi.mock('@salla.sa/twilight-theme-engine/routes/product-listing', () => ({
  useAppliedFilters: () => ({
    filters: null,
    page: null,
    lastPage: null,
    status: 'idle',
    retry: () => {},
  }),
}));
vi.mock('../../../app/components/product/ProductCard', () => ({
  ProductCard: ({ product }: { product: { id: number } }) => <li>{product.id}</li>,
}));
vi.mock('../../../app/components/common', () => ({
  BlockHookSlot: () => null,
  BottomSheet: () => null,
}));
vi.mock('../../../app/hooks/useScrollDirection', () => ({ useScrollDirection: () => 'up' }));

import { ProductListPage } from '../../../app/components/product/ProductListPage';

// The route loads page 1; the list loads pages 2 and 3 through the `c2` and `c3` cursors.
const pages: Record<string, { items: { id: number }[]; next: string | null }> = {
  c2: { items: [{ id: 3 }, { id: 4 }], next: 'c3' },
  c3: { items: [{ id: 5 }, { id: 6 }], next: null },
  first: { items: [{ id: 1 }, { id: 2 }], next: 'c2' },
};

const props = (sort = 'ourSuggest') =>
  ({
    page: { title: 'Category' },
    source: { type: 'categories', value: '1' },
    query: { sort, filters: false },
    products: [{ id: 1 }, { id: 2 }],
    pagination: { next: 'c2' },
    filters: [],
  }) as never;

const ids = () =>
  Array.from(screen.getByTestId('ids').querySelectorAll('li')).map((li) => Number(li.textContent));

const loadMore = () => act(async () => void fireEvent.click(screen.getByText('load-more')));

beforeEach(() => {
  localStorage.clear();
  list.mockReset();
  list.mockImplementation(async ({ cursor }: { cursor?: string }) => pages[cursor ?? 'first']);
});

describe('ProductListPage paging', () => {
  it('loads page 2 after a switch to the list view, even once every page was loaded', async () => {
    render(<ProductListPage {...props()} />);
    await loadMore();
    await loadMore();
    expect(ids()).toEqual([1, 2, 3, 4, 5, 6]);

    await act(async () => void fireEvent.click(screen.getByLabelText('List view')));
    expect(ids()).toEqual([1, 2]);

    await loadMore();
    expect(ids()).toEqual([1, 2, 3, 4]);
  });

  it('skips no page after a switch to the list view', async () => {
    render(<ProductListPage {...props()} />);
    await loadMore();

    await act(async () => void fireEvent.click(screen.getByLabelText('List view')));
    await loadMore();
    expect(ids()).toEqual([1, 2, 3, 4]);
  });

  it('loads page 2 of the new sort, when its next-page token is the same as before', async () => {
    const { rerender } = render(<ProductListPage {...props()} />);
    await loadMore();
    await loadMore();

    rerender(<ProductListPage {...props('bestSell')} />);
    await loadMore();
    expect(ids()).toEqual([1, 2, 3, 4]);
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'c2', sort: 'bestSell' }));
  });
});
