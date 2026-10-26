import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

const m = vi.hoisted(() => ({
  register: vi.fn(),
  registerHomeComponents: vi.fn(),
  registerHomeComponentConfig: vi.fn(),
  registerThemeHooks: vi.fn(),
  createRouter: vi.fn(() => ({ id: Symbol('router') })),
}));

vi.mock('@salla.sa/twilight-theme-engine', () => ({ registry: { register: m.register } }));
vi.mock('@salla.sa/twilight-theme-engine/tanstack', () => ({ createRouter: m.createRouter }));
vi.mock('@salla.sa/twilight-theme-engine/routes/home', () => ({
  registerHomeComponents: m.registerHomeComponents,
  registerHomeComponentConfig: m.registerHomeComponentConfig,
  DefaultHomeComponents: { engineOnly: 'engine', brands: 'engine-brands' },
}));
vi.mock('@salla.sa/twilight-components-react', () => ({
  SliderSkeleton: () => <div data-testid="slider-skeleton" />,
}));
vi.mock('../stubs/routeTree.gen', () => ({ routeTree: { tree: true } }));
vi.mock('../../app/hooks', () => ({ registerThemeHooks: m.registerThemeHooks }));
vi.mock('../../app/components/product/ProductListSkeleton', () => ({
  ProductListSkeleton: () => null,
}));
vi.mock('../../app/components/product/ProductListPage', () => ({
  ProductListPage: () => <div data-testid="list-page" />,
}));
vi.mock('../../app/components/home', () => {
  const names = [
    'Brands',
    'CustomTestimonials',
    'EnhancedSlider',
    'FeaturedProducts',
    'FixedProducts',
    'MainLinks',
    'PhotosSlider',
    'ProductsSlider',
    'SliderProductsWithHeader',
    'EnhancedSquareBanners',
  ];
  return {
    ...Object.fromEntries(names.map((n) => [n, `theme-${n}`])),
    featuredProductsConfig: { className: 'featured-config' },
  };
});
vi.mock('../../app/components/home/Blog', () => ({ Blog: 'theme-Blog' }));
vi.mock('../../app/components/home/FeaturedProducts', () => ({
  FeaturedProductsSpecialOffer: 'theme-special-offer',
  FeaturedProductsWithSpecialProduct: 'theme-special-product',
}));
vi.mock('../../app/components/home/PhotosSliderWithText', () => ({
  PhotosSliderWithText: 'theme-PhotosSliderWithText',
}));

type BlockConfig = {
  height?: string;
  placeholder?: ReactElement;
  className?: string | ((data: Record<string, unknown>) => string);
};

const importRouter = () => import('../../app/router');
const config = () => m.registerHomeComponentConfig.mock.calls[0][0] as Record<string, BlockConfig>;
const classOf = (key: string, data: Record<string, unknown>) =>
  (config()[key].className as (d: Record<string, unknown>) => string)(data);

describe('theme registration', () => {
  it('registers the theme hooks and the product list page and skeleton in the engine registry', async () => {
    await importRouter();
    expect(m.registerThemeHooks).toHaveBeenCalledTimes(1);
    const keys = m.register.mock.calls.map(([key]) => key);
    expect(keys).toEqual(['product:list-page', 'product:list-skeleton']);
  });

  it('lazy-loads the product list page', async () => {
    await importRouter();
    const LazyPage = m.register.mock.calls[0][1];
    const { findByTestId } = render(<LazyPage />);
    expect(await findByTestId('list-page')).toBeTruthy();
  });

  it('keeps the engine home blocks and overrides them with the theme blocks', async () => {
    await importRouter();
    const registered = m.registerHomeComponents.mock.calls[0][0];
    expect(registered.engineOnly).toBe('engine');
    expect(registered.brands).toBe('theme-Brands');
    expect(registered['main-links']).toBe('theme-MainLinks');
    expect(registered['square-links']).toBe('theme-MainLinks');
    expect(registered.blog).toBe('theme-Blog');
  });

  it('serves every featured-products view style from the theme component', async () => {
    await importRouter();
    const registered = m.registerHomeComponents.mock.calls[0][0];
    for (const key of [
      'featured-products',
      'featured-products:style1',
      'featured-products:style2',
      'featured-products:style3',
    ]) {
      expect(registered[key]).toBe('theme-FeaturedProducts');
    }
    expect(registered['featured-products-special-offer']).toBe('theme-special-offer');
    expect(registered['featured-products-special-product']).toBe('theme-special-product');
  });
});

describe('home block placements', () => {
  it('gives the featured-products layouts the shared wrapper config', async () => {
    await importRouter();
    for (const key of [
      'featured-products',
      'featured-products-special-offer',
      'featured-products-special-product',
    ]) {
      expect(config()[key]).toEqual({ className: 'featured-config' });
    }
  });

  it('runs the blog and testimonials as edge-to-edge bands', async () => {
    await importRouter();
    expect(config().blog.className).toContain('s-block--full-bg');
    expect(config().blog.height).toBe('clamp(480px, 45vw, 660px)');
    expect(config()['custom-testimonials'].className).toContain('s-block--full-bg');
  });

  it('reserves slider skeleton space for lazily placed blocks', async () => {
    await importRouter();
    for (const key of [
      'enhanced-slider',
      'main-links',
      'square-links',
      'photos-slider',
      'photos-slider-with-text',
    ]) {
      expect(config()[key].height).toBeTruthy();
      const { getByTestId, unmount } = render(config()[key].placeholder!);
      expect(getByTestId('slider-skeleton')).toBeTruthy();
      unmount();
    }
  });

  it('marks the boxed enhanced slider only when it sits in a container', async () => {
    await importRouter();
    expect(classOf('enhanced-slider', {})).toBe('s-block s-block--enhanced-slider');
    expect(classOf('enhanced-slider', { in_container: true })).toBe(
      's-block s-block--enhanced-slider s-block--enhanced-slider-boxed'
    );
  });

  it('merges main links with the block above only when asked and positioned', async () => {
    await importRouter();
    expect(classOf('main-links', {})).toBe('s-block s-block--main-links');
    expect(classOf('main-links', { merge_links_with_top_component: true, position: 2 })).toBe(
      's-block s-block--main-links merge-with-top-component merged-has-no-title'
    );
    expect(
      classOf('main-links', { merge_links_with_top_component: true, position: 2, title: 'T' })
    ).toBe('s-block s-block--main-links merge-with-top-component');
    expect(classOf('main-links', { merge_links_with_top_component: true, title: 'T' })).toBe(
      's-block s-block--main-links'
    );
  });

  it('flags repeated photo sliders', async () => {
    await importRouter();
    expect(classOf('photos-slider', {})).toBe('s-block s-block--photos-slider');
    expect(classOf('photos-slider', { is_repeated: true })).toBe(
      's-block s-block--photos-slider repeated-block'
    );
  });

  it('marks the boxed photos-with-text slider only when it sits in a container', async () => {
    await importRouter();
    expect(classOf('photos-slider-with-text', {})).toBe('s-block s-block--photos-slider-with-text');
    expect(classOf('photos-slider-with-text', { in_container: true })).toBe(
      's-block s-block--photos-slider-with-text s-block--photos-slider-with-text-boxed'
    );
  });
});

describe('getRouter', () => {
  beforeEach(() => {
    vi.resetModules();
    m.createRouter.mockClear();
  });

  it('reuses one router in the browser so the query cache survives navigation', async () => {
    const { getRouter } = await importRouter();
    const first = getRouter();
    expect(getRouter()).toBe(first);
    expect(m.createRouter).toHaveBeenCalledTimes(1);
    expect(m.createRouter).toHaveBeenCalledWith({ tree: true });
  });

  it('builds a fresh router per request on the server', async () => {
    vi.stubGlobal('window', undefined);
    try {
      const { getRouter } = await importRouter();
      expect(getRouter()).not.toBe(getRouter());
      expect(m.createRouter).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
