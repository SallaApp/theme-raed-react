import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ProductListPage } from '../../../app/components/product/ProductListPage';

const storeState: { settings: { product: { sort_options?: string[]; filters?: boolean } } } = {
  settings: { product: {} },
};

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useStore', () => ({
  useStore: () => storeState,
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/categories/1', searchStr: '' }),
  useTwilight: () => ({ theme: { settings: {} } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/utils', () => ({ onSallaEvent: () => () => {} }));
// The real sort helpers (not mocked): the test is about how the page wires them.
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => null,
  NoContent: () => null,
  ProductCardSkeleton: () => null,
  Image: () => null,
  RenderWhenVisible: () => null,
}));
vi.mock('@salla.sa/twilight-components-react/filters', () => ({ SallaFilters: () => null }));
vi.mock('@salla.sa/twilight-components-react', () => ({
  ItemsList: () => null,
  ReviewItemSkeleton: () => null,
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
    page: undefined,
    lastPage: undefined,
    status: 'idle',
    retry: () => {},
  }),
}));
vi.mock('../../../app/components/product/ProductCard', () => ({ ProductCard: () => null }));
vi.mock('../../../app/components/common', () => ({
  BlockHookSlot: () => null,
  BottomSheet: () => null,
}));
vi.mock('../../../app/hooks/useAppSafeAreaTop', () => ({ useAppSafeAreaTop: () => 0 }));
vi.mock('../../../app/hooks/useScrollDirection', () => ({ useScrollDirection: () => 'up' }));

type Props = Parameters<typeof ProductListPage>[0];

const renderPage = (sort: string, sourceType = 'categories') =>
  render(
    <ProductListPage
      {...({
        page: { title: 'Listing' },
        source: { type: sourceType, value: '1' },
        query: { sort, filters: false },
        products: [],
        pagination: { next: null },
        filters: [],
      } as unknown as Props)}
    />
  );

const optionValues = (container: HTMLElement) =>
  [...container.querySelectorAll('select option')].map((o) => (o as HTMLOptionElement).value);

beforeEach(() => {
  storeState.settings = { product: {} };
});
afterEach(cleanup);

describe('ProductListPage sort select', () => {
  it('plp.sort: hides sorts the merchant disabled', () => {
    storeState.settings.product.sort_options = ['bestSell', 'topRated'];
    const { container } = renderPage('bestSell');

    expect(optionValues(container)).toEqual(['bestSell', 'topRated']);
  });

  it('plp.sort: selects the current sort and names it in the label', () => {
    storeState.settings.product.sort_options = ['bestSell', 'topRated'];
    const { container } = renderPage('topRated');

    expect(container.querySelector('select')?.value).toBe('topRated');
    expect(container.querySelector('.s-catalog-toolbar__sort-label b')?.textContent).toBe(
      'Top Rated'
    );
    expect(container.querySelector('option[disabled]')).toBeNull();
  });

  it('plp.sort: offers the default sorts when the store sets none', () => {
    const { container } = renderPage('ourSuggest');

    expect(optionValues(container)).toEqual([
      'ourSuggest',
      'bestSell',
      'topRated',
      'priceFromLowToTop',
      'priceFromTopToLow',
    ]);
  });

  it('plp.sort: shows no sort select on a source that cannot sort', () => {
    const { container } = renderPage('ourSuggest', 'offers');

    expect(container.querySelector('select')).toBeNull();
  });

  it('plp.sort.fallback: shows no selection when the current sort is disabled', () => {
    storeState.settings.product.sort_options = ['bestSell', 'topRated'];
    const { container } = renderPage('ourSuggest');

    const select = container.querySelector('select') as HTMLSelectElement;
    const placeholder = select.querySelector('option[value=""]') as HTMLOptionElement;
    expect(select.value).toBe('');
    expect(placeholder.disabled).toBe(true);
    expect(placeholder.hidden).toBe(true);
    expect(placeholder.textContent).toBe('Sort By');
    expect(optionValues(container)).toEqual(['', 'bestSell', 'topRated']);
    // No sort is named when none describes the list.
    expect(container.querySelector('.s-catalog-toolbar__sort-label b')).toBeNull();
  });
});
