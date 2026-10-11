import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    list: vi.fn().mockResolvedValue({ items: [{ id: 1, name: 'Product 1' }], next: null }),
  },
}));

vi.mock('@salla.sa/twilight-theme-engine/product', () => ({
  ProductCard: ({ product }: { product: { id: number; name: string } }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

vi.mock('@salla.sa/twilight-components-react', () => ({
  ProductsSliderSkeleton: () => <div data-testid="products-slider-skeleton" />,
  SallaProductsSlider: ({
    loader,
    children,
    blockTitle,
    sliderProps,
    displayAllUrl,
  }: Record<string, unknown>) => {
    const [items, setItems] = React.useState<unknown[]>([]);
    React.useEffect(() => {
      (loader as () => Promise<{ items: unknown[] }>)().then((result) => {
        setItems(result.items);
      });
    }, [loader]);
    return (
      <div
        data-testid="salla-products-slider"
        data-block-title={blockTitle ?? ''}
        data-slider-id={(sliderProps as Record<string, unknown>)?.id ?? ''}
        data-display-all-url={displayAllUrl ?? ''}
      >
        {items.map((item, index) =>
          (children as (item: unknown, index: number) => React.ReactNode)(item, index)
        )}
      </div>
    );
  },
}));

import { SliderProductsWithHeader } from '../../../app/components/home/SliderProductsWithHeader';

describe('SliderProductsWithHeader', () => {
  const mockData = {
    background: 'bg.jpg',
    title: 'Featured Products',
    description: 'Check out our best products',
    display_all_url: '/products',
    products: { source: 'latest' as const },
  };

  it('renders slider-bg with background image', () => {
    const { container } = render(<SliderProductsWithHeader data={mockData} />);
    const sliderBg = container.querySelector('.slider-bg');
    expect(sliderBg?.getAttribute('style')).toContain('background-image');
    expect(sliderBg?.getAttribute('style')).toContain('bg.jpg');
  });

  it('renders title', () => {
    const { container } = render(<SliderProductsWithHeader data={mockData} />);
    const title = container.querySelector('h3');
    expect(title?.textContent).toBe('Featured Products');
  });

  it('renders description', () => {
    const { container } = render(<SliderProductsWithHeader data={mockData} />);
    const desc = container.querySelector('.line-clamp-2');
    expect(desc?.textContent).toBe('Check out our best products');
  });

  it('renders SallaProductsSlider with correct slider id', async () => {
    const { container } = render(<SliderProductsWithHeader data={{ ...mockData, position: 1 }} />);
    const slider = container.querySelector('[data-testid="salla-products-slider"]');
    expect(slider).toBeTruthy();
    expect(slider?.getAttribute('data-slider-id')).toBe('slider-with-bg-1');
  });

  it('renders with source from products config', async () => {
    const { product } = await import('@salla.sa/twilight-theme-engine/api/product');
    render(
      <SliderProductsWithHeader data={{ ...mockData, products: { source: 'best_selling' } }} />
    );
    expect(product.list).toHaveBeenCalledWith(expect.objectContaining({ source: 'best_selling' }));
  });

  it('returns null when no source can be resolved', () => {
    const { container } = render(
      <SliderProductsWithHeader data={{ ...mockData, products: undefined }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
