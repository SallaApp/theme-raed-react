import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useStore', () => ({
  useStore: () => ({ settings: { product: { filters: false } } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/brands/7', searchStr: '' }),
  useTwilight: () => ({ theme: { settings: {} } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/utils', async () => {
  const sort = await import('@salla.sa/twilight-theme-engine/utils/sort-options');
  return { sortOptions: sort.sortOptions, onSallaEvent: () => () => {}, whenSallaReady: () => {} };
});
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => null,
  NoContent: () => null,
  ProductCardSkeleton: () => null,
  // The real `Image` adds `object-${objectFit}` (default `cover`) to the class.
  Image: ({ src, className, objectFit }: { src?: string; className?: string; objectFit?: string }) => (
    <img src={src} alt="" className={className} data-object-fit={objectFit ?? 'cover'} />
  ),
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

describe('ProductListPage brand header', () => {
  it("contains the brand logo rather than cropping it, as the engine's list page does", () => {
    const { container } = render(
      <ProductListPage
        {...({
          page: { title: 'Acme' },
          source: {
            type: 'brands',
            value: '7',
            entity: { name: 'Acme', banner: 'banner.jpg', logo: 'logo.png' },
          },
          query: { sort: 'ourSuggest', filters: false },
          products: [],
          pagination: { next: null },
          filters: [],
        } as never)}
      />
    );

    const logo = container.querySelector<HTMLImageElement>('img[src="logo.png"]')!;
    expect(logo.dataset.objectFit).toBe('contain');
    // An `object-contain` class would lose to the `object-cover` the image adds by default.
    expect(logo.className).not.toMatch(/\bobject-/);

    // The banner still covers its strip.
    expect(container.querySelector<HTMLImageElement>('img[src="banner.jpg"]')?.dataset.objectFit).toBe(
      'cover'
    );
  });
});
