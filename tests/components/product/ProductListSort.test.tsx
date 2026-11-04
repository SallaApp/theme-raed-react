import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// The store settings each test sees; `vi.hoisted` shares them with the hoisted mock.
const store = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useStore', () => ({ useStore: () => store }));
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
  return { sortOptions: sort.sortOptions, onSallaEvent: () => () => {} };
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
  ItemsList: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/home', () => ({
  Testimonials: () => null,
  useReorderButtons: () => {},
}));
vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: { list: vi.fn() },
  parseNextPageToken: () => ({}),
}));
vi.mock('@salla.sa/twilight-theme-engine/routes/product-listing', () => ({
  useAppliedFilters: () => ({
    filters: null,
    page: null,
    lastPage: null,
    status: 'idle',
    retry: () => {},
  }),
}));
vi.mock('../../../app/components/product/ProductCard', () => ({ ProductCard: () => null }));
vi.mock('../../../app/components/common', () => ({
  BlockHookSlot: () => null,
  BottomSheet: () => null,
}));
vi.mock('../../../app/hooks/useScrollDirection', () => ({ useScrollDirection: () => 'up' }));

import { ProductListPage } from '../../../app/components/product/ProductListPage';

const renderList = (type: string, sort = 'ourSuggest') =>
  render(
    <ProductListPage
      {...({
        page: { title: 'Products' },
        source: { type, value: '1' },
        query: { sort, filters: false },
        products: [{ id: 1 }],
        pagination: { next: null },
        filters: [],
      } as never)}
    />
  );

const offered = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('select option'))
    .map((option) => option.getAttribute('value'))
    .filter(Boolean);

beforeEach(() => {
  localStorage.clear();
  store.settings = { product: { filters: false } };
});

describe('ProductListPage sort menu', () => {
  it('offers the five default sorts when the store sends no sort setting', () => {
    const { container } = renderList('categories');
    expect(offered(container)).toEqual([
      'ourSuggest',
      'bestSell',
      'topRated',
      'priceFromLowToTop',
      'priceFromTopToLow',
    ]);
  });

  it('offers only the sorts the merchant turned on, sale price ones included', () => {
    store.settings = {
      product: { filters: false, sort_options: ['bestSell', 'salePriceFromLowToTop'] },
    };
    const { container } = renderList('search', 'bestSell');
    expect(offered(container)).toEqual(['bestSell', 'salePriceFromLowToTop']);
  });

  it('has no sort menu on a brand page, as in Twig', () => {
    const { container } = renderList('brands');
    expect(container.querySelector('select')).toBeNull();
  });

  it('names no order when the list is in a sort the merchant has since turned off', () => {
    store.settings = { product: { filters: false, sort_options: ['bestSell', 'topRated'] } };
    const { container } = renderList('categories', 'ourSuggest');
    expect(container.querySelector<HTMLSelectElement>('select')?.value).toBe('');
    expect(container.querySelector('.s-catalog-toolbar__sort-label')?.textContent).toBe('Sort By');
  });
});
