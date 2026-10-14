import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import {
  FeaturedProducts,
  featuredProductsConfig,
} from '../../../app/components/home/FeaturedProducts';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

const listMock = vi.fn().mockResolvedValue({
  data: [
    { id: 1, name: 'Full P1', is_out_of_stock: false },
    { id: 2, name: 'Full P2', is_out_of_stock: false },
  ],
});

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: { list: (...args: unknown[]) => listMock(...args) },
}));

vi.mock('@salla.sa/twilight-theme-engine/product', () => ({
  ProductCard: ({
    product,
    layout,
  }: {
    product: { id?: number; name?: string };
    layout?: string;
  }) => (
    <div data-testid="product-card" data-layout={layout ?? 'vertical'}>
      {product.name}
    </div>
  ),
}));

vi.mock('@salla.sa/twilight-components-react', () => ({
  ProductsListSkeleton: () => <div data-testid="list-skeleton" />,
  SallaProductsList: ({
    loader,
    children,
  }: {
    loader: () => unknown;
    children: (items: unknown[]) => unknown;
  }) => {
    loader();
    return (
      <div data-testid="salla-products-list">
        {
          children([
            { id: 1, name: 'Full P1' },
            { id: 2, name: 'Full P2' },
          ]) as never
        }
      </div>
    );
  },
}));

const tab = (over: Record<string, unknown> = {}) => ({
  name: 'Tab',
  type: 'latest_products',
  ...over,
});

describe('FeaturedProducts', () => {
  it('renders nothing without sections', () => {
    const { container } = render(<FeaturedProducts data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    ['latest_products', {}, { source: 'latest' }],
    ['most_sales', {}, { source: 'sales' }],
    ['top_rated_products', {}, { source: 'top-rated' }],
    ['category', { category: [{ value: '12' }] }, { source: 'categories', sourceValue: [12] }],
    ['tag', { tag: 5 }, { source: 'tags', sourceValue: [5] }],
    [
      'chosen_products',
      { chosen_products: { source: 'selected', source_value: [1, 2] } },
      { source: 'selected', sourceValue: [1, 2] },
    ],
  ])('loads a %s tab from its source', (type, extra, expected) => {
    listMock.mockClear();
    const { getAllByTestId } = render(
      <FeaturedProducts data={{ items: [tab({ type, ...extra })] }} />
    );
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining(expected));
    expect(getAllByTestId('product-card')).toHaveLength(2);
  });

  it('still renders the legacy payload (label, stub products, nested main_product)', () => {
    listMock.mockClear();
    const { getAllByTestId, getAllByText, container } = render(
      <FeaturedProducts
        data={{
          title: 'Legacy heading',
          items: [
            { label: 'Old A', products: [{ id: 1 }, { id: 2 }] },
            { label: 'Old B', products: [{ id: 3 }] },
          ],
        }}
      />
    );
    expect(getAllByText('Old A').length).toBeGreaterThan(0);
    expect(container.querySelector('h2.s-block__title')?.textContent).toBe('Legacy heading');
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'selected', sourceValue: [1, 2] })
    );
    expect(getAllByTestId('product-card').length).toBeGreaterThan(0);
  });

  it('renders a legacy nested main_product as the special product', () => {
    const { getAllByTestId, container } = render(
      <FeaturedProducts
        data={{
          main_product: { title: 'Old deal', product: { id: 9, name: 'Hero' } },
          items: [{ label: 'A', products: [{ id: 1 }] }],
        }}
      />
    );
    expect(
      getAllByTestId('product-card').some((el) => el.getAttribute('data-layout') === 'special')
    ).toBe(true);
    expect(container.querySelector('h2.s-block__title')?.textContent).toBe('Old deal');
  });

  it('keeps the legacy main_product title even without a product', () => {
    const { container } = render(
      <FeaturedProducts
        data={{ title: 'Fallback', main_product: { title: 'Only title' }, items: [tab()] }}
      />
    );
    expect(container.querySelector('h2.s-block__title')?.textContent).toBe('Only title');
  });

  it('skips a tab whose source needs a value that is missing', () => {
    listMock.mockClear();
    const { container } = render(
      <FeaturedProducts data={{ items: [tab({ type: 'category', category: null })] }} />
    );
    expect(listMock).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="product-card"]')).toBeNull();
  });

  it('marks the first tab panel active so it is not left display:none', () => {
    const { container } = render(
      <FeaturedProducts data={{ items: [tab({ name: 'A' }), tab({ name: 'B' })] }} />
    );
    const panels = container.querySelectorAll('.tabs-wrapper .tabs__item');
    expect(panels).toHaveLength(2);
    expect(panels[0].classList.contains('is-active')).toBe(true);
    expect(panels[1].classList.contains('is-active')).toBe(false);
  });

  it('switches the active panel when another tab is clicked', () => {
    const { container, getAllByText } = render(
      <FeaturedProducts data={{ items: [tab({ name: 'A' }), tab({ name: 'B' })] }} />
    );
    fireEvent.click(getAllByText('B')[0]);
    const panels = container.querySelectorAll('.tabs-wrapper .tabs__item');
    expect(panels[0].classList.contains('is-active')).toBe(false);
    expect(panels[1].classList.contains('is-active')).toBe(true);
  });

  it('falls back to a numbered label when a tab has no name', () => {
    const { getAllByText } = render(
      <FeaturedProducts data={{ items: [tab({ name: '' }), tab({ name: undefined })] }} />
    );
    expect(getAllByText('Products 1').length).toBeGreaterThan(0);
    expect(getAllByText('Products 2').length).toBeGreaterThan(0);
  });

  it('hides the tab bar for a single section', () => {
    const { container } = render(<FeaturedProducts data={{ items: [tab()] }} />);
    expect(container.querySelector('.tabs')).toBeNull();
    expect(container.querySelector('.tabs-wrapper .tabs__item.is-active')).toBeTruthy();
  });

  it('renders the main product and title for special_offer_with_products', () => {
    const { getAllByTestId, container } = render(
      <FeaturedProducts
        data={{
          show_method: [{ value: 'special_offer_with_products' }],
          main_product_title: 'Deal',
          main_product: { id: 9, name: 'Hero' },
          items: [tab()],
        }}
      />
    );
    const special = getAllByTestId('product-card').find(
      (el) => el.getAttribute('data-layout') === 'special'
    );
    expect(special?.textContent).toBe('Hero');
    expect(container.querySelector('h2.s-block__title')?.textContent).toBe('Deal');
  });

  it('fetches an unhydrated special product by id for products_with_special_product', () => {
    listMock.mockClear();
    render(
      <FeaturedProducts
        data={{
          show_method: 'products_with_special_product',
          items: [tab({ special_product: { source: 'selected', source_value: [7] } })],
        }}
      />
    );
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'selected', sourceValue: [7], perPage: 1 })
    );
  });
});

describe('featuredProductsConfig.className', () => {
  const cls = featuredProductsConfig.className;

  it('marks the default / without-special variant as an initialized tab block in the container', () => {
    const out = cls({ view_style: 'products_without_special_product' });
    expect(out).toContain('s-block--featured-products');
    expect(out).toContain('s-block-tabs');
    expect(out).toContain('tabs-initialized');
    expect(out).toContain('container');
  });

  it('adds the full-bg tabbed classes for style 2', () => {
    const out = cls({ view_style: 'style2', is_slider: true });
    expect(out).toContain('s-block--tabs-produtcs');
    expect(out).toContain('as-slider');
  });

  it('adds two-cols only for a multi-section grid (style 3)', () => {
    expect(cls({ view_style: 'style3', items: [{}, {}] })).toContain('two-cols');
    expect(cls({ view_style: 'style3', items: [{}] })).not.toContain('two-cols');
  });
});
