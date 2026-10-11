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

const section = (over: Record<string, unknown> = {}) => ({
  products: [
    { id: 1, name: 'stub-1', price: 10 },
    { id: 2, name: 'stub-2', price: 20 },
  ],
  ...over,
});

describe('FeaturedProducts', () => {
  it('renders nothing without sections', () => {
    const { container } = render(<FeaturedProducts data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('re-fetches each tab in full by id (not the out-of-stock stubs)', () => {
    listMock.mockClear();
    const { getAllByTestId, queryByText } = render(
      <FeaturedProducts data={{ items: [section({ label: 'All' })] }} />
    );
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'selected', sourceValue: [1, 2] })
    );
    // cards come from the fetched list, not the raw stubs
    expect(getAllByTestId('product-card')).toHaveLength(2);
    expect(queryByText('Full P1')).toBeTruthy();
    expect(queryByText('stub-1')).toBeNull();
  });

  it('marks the first tab panel active so it is not left display:none', () => {
    const { container } = render(
      <FeaturedProducts data={{ items: [section({ label: 'A' }), section({ label: 'B' })] }} />
    );
    const panels = container.querySelectorAll('.tabs-wrapper .tabs__item');
    expect(panels).toHaveLength(2);
    expect(panels[0].classList.contains('is-active')).toBe(true);
    expect(panels[1].classList.contains('is-active')).toBe(false);
  });

  it('switches the active panel when another tab is clicked', () => {
    const { container, getAllByText } = render(
      <FeaturedProducts data={{ items: [section({ label: 'A' }), section({ label: 'B' })] }} />
    );
    fireEvent.click(getAllByText('B')[0]);
    const panels = container.querySelectorAll('.tabs-wrapper .tabs__item');
    expect(panels[0].classList.contains('is-active')).toBe(false);
    expect(panels[1].classList.contains('is-active')).toBe(true);
  });

  it('labels tabs from the API `label` field', () => {
    const { getAllByText } = render(
      <FeaturedProducts
        data={{ items: [section({ label: 'أحدث المنتجات' }), section({ label: 'الأكثر مبيعاً' })] }}
      />
    );
    expect(getAllByText('أحدث المنتجات').length).toBeGreaterThan(0);
    expect(getAllByText('الأكثر مبيعاً').length).toBeGreaterThan(0);
  });

  it('falls back to a visible label when a section has no label/title/name', () => {
    const { getAllByText, container } = render(
      <FeaturedProducts data={{ items: [section({ type: 'latest_products' }), section()] }} />
    );
    expect(getAllByText('Latest Products').length).toBeGreaterThan(0);
    expect(getAllByText('Products 2').length).toBeGreaterThan(0);
    container.querySelectorAll('.tab-trigger .s-button-text').forEach((el) => {
      expect(el.textContent?.trim()).not.toBe('');
    });
  });

  it('hides the tab bar for a single section', () => {
    const { container } = render(
      <FeaturedProducts data={{ items: [section({ label: 'Only' })] }} />
    );
    expect(container.querySelector('.tabs')).toBeNull();
    expect(container.querySelector('.tabs-wrapper .tabs__item.is-active')).toBeTruthy();
  });

  it('renders the special product with the special layout', () => {
    const { getAllByTestId, container } = render(
      <FeaturedProducts
        data={{
          main_product: { title: 'Deal', product: { id: 9, name: 'Hero' } },
          items: [section()],
        }}
      />
    );
    const special = getAllByTestId('product-card').find(
      (el) => el.getAttribute('data-layout') === 'special'
    );
    expect(special?.textContent).toBe('Hero');
    expect(container.querySelector('h2.s-block__title')?.textContent).toBe('Deal');
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
