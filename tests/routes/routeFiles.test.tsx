import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ComponentType } from 'react';

// Every engine export is replaced by a stub that records how a route file wired it:
// `loader` returns a marker, `Component` and the stub itself render a labelled element.
const h = vi.hoisted(async () => {
  const { createElement } = await import('react');
  const cache = new Map<string, unknown>();
  const state = { loaderData: {} as Record<string, unknown> };

  cache.set(
    'slugBrandRedirectLoader',
    vi.fn((args: unknown) => ({ redirectedWith: args }))
  );

  const stub = (name: string) => {
    if (!cache.has(name)) {
      const render = (props: Record<string, unknown>) =>
        createElement('div', { 'data-stub': name, 'data-props': JSON.stringify(props) });
      const fn = Object.assign((props: Record<string, unknown>) => render(props), {
        loader: vi.fn((args: unknown) => Promise.resolve({ loadedBy: name, args })),
        Component: (props: Record<string, unknown>) => render(props),
      });
      cache.set(name, fn);
    }
    return cache.get(name) as ReturnType<typeof vi.fn> & {
      loader: ReturnType<typeof vi.fn>;
    };
  };

  const moduleOf = () =>
    new Proxy(
      {},
      {
        has: () => true,
        get: (_t, key) => {
          if (key === 'then' || typeof key === 'symbol') return undefined;
          if (key === 'withHead') return (entity: unknown) => ({ withHeadOf: entity });
          return stub(String(key));
        },
      }
    );

  return { cache, state, stub, moduleOf };
});

vi.mock('@tanstack/react-router', async () => {
  const { state } = await h;
  return {
    createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
      path,
      ...options,
      useLoaderData: () => state.loaderData,
    }),
  };
});
vi.mock('@salla.sa/twilight-theme-engine/tanstack', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/skeleton', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/seo-redirects', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/brands', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/loyalty', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/testimonials', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/thank-you', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/account', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/account/orders', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/blog', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/home', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/cart', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/product', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/routes/page', async () => (await h).moduleOf());
vi.mock('@salla.sa/twilight-theme-engine/api/page', async () => {
  const { stub } = await h;
  return { page: stub('pageApi') };
});
vi.mock('../../app/components/cart/CartPage', async () => (await h).moduleOf());
vi.mock('../../app/components/product/ProductPage', async () => (await h).moduleOf());
vi.mock('../../app/components/page/PageSingle', async () => (await h).moduleOf());

type RouteOptions = {
  path: string;
  loader?: (ctx: Record<string, unknown>) => Promise<unknown>;
  head?: unknown;
  pendingComponent?: ComponentType;
  component: ComponentType;
  validateSearch?: (search: Record<string, unknown>) => unknown;
  loaderDeps?: (ctx: { search: Record<string, unknown> }) => unknown;
};

const load = async (file: string) =>
  (await import(`../../app/routes/${file}.tsx`)).Route as RouteOptions;

const params = { locale: 'ar', id: '7', slug: 's', orderId: '99' };

type Case = {
  file: string;
  path: string;
  entity: string;
  skeleton?: string;
  renders?: string;
  expectArgs: Record<string, unknown>;
  ctx?: Record<string, unknown>;
};

const localeOnly = { locale: 'ar' };
const cases: Case[] = [
  {
    file: 'index',
    path: '/{-$locale}/',
    entity: 'Home',
    skeleton: 'HomeSkeleton',
    expectArgs: localeOnly,
  },
  { file: 'brands', path: '/{-$locale}/brands', entity: 'Brands', expectArgs: localeOnly },
  { file: 'loyalty', path: '/{-$locale}/loyalty', entity: 'Loyalty', expectArgs: localeOnly },
  {
    file: 'testimonials',
    path: '/{-$locale}/testimonials',
    entity: 'Testimonials',
    expectArgs: localeOnly,
  },
  {
    file: 'thankyou.$orderId',
    path: '/{-$locale}/thankyou/$orderId',
    entity: 'ThankYou',
    expectArgs: { params: { orderId: '99' }, locale: 'ar' },
  },
  {
    file: 'blog',
    path: '/{-$locale}/blog',
    entity: 'Blog',
    skeleton: 'BlogSkeleton',
    expectArgs: localeOnly,
  },
  {
    file: 'blog_.$slug.a-$id',
    path: '/{-$locale}/blog/$slug/a-{$id}',
    entity: 'BlogSingle',
    skeleton: 'BlogSkeleton',
    expectArgs: { params: { slug: 's', id: '7' }, locale: 'ar' },
  },
  {
    file: 'blog_.$slug.c-$id',
    path: '/{-$locale}/blog/$slug/c-{$id}',
    entity: 'BlogCategoryRoute',
    skeleton: 'BlogSkeleton',
    expectArgs: { params: { slug: 's', id: '7' }, locale: 'ar' },
  },
  {
    file: 'blog_.$slug.tag-$id',
    path: '/{-$locale}/blog/$slug/tag-{$id}',
    entity: 'BlogTagRoute',
    skeleton: 'BlogSkeleton',
    expectArgs: { params: { slug: 's', id: '7' }, locale: 'ar' },
  },
  {
    file: 'blog_.author.$id',
    path: '/{-$locale}/blog/author/$id',
    entity: 'BlogAuthorRoute',
    skeleton: 'BlogSkeleton',
    expectArgs: { params: { id: '7' }, locale: 'ar' },
  },
  {
    file: 'loyalty_points',
    path: '/{-$locale}/loyalty_points',
    entity: 'LoyaltyPoints',
    skeleton: 'CustomerLayoutSkeleton',
    expectArgs: localeOnly,
  },
  {
    file: 'account.profile',
    path: '/{-$locale}/account/profile',
    entity: 'Profile',
    skeleton: 'CustomerPageSkeleton',
    expectArgs: localeOnly,
  },
  {
    file: 'account.settings',
    path: '/{-$locale}/account/settings',
    entity: 'Settings',
    skeleton: 'CustomerPageSkeleton',
    expectArgs: localeOnly,
  },
  {
    file: 'account.notifications',
    path: '/{-$locale}/account/notifications',
    entity: 'Notifications',
    skeleton: 'CustomerPageSkeleton',
    expectArgs: localeOnly,
  },
  {
    file: 'account.orders.$id',
    path: '/{-$locale}/account/orders/$id',
    entity: 'OrderSingle',
    skeleton: 'CustomerPageSkeleton',
    expectArgs: { params: { id: '7' }, locale: 'ar' },
  },
];

beforeEach(async () => {
  const { state, cache } = await h;
  state.loaderData = { marker: 'data' };
  cache.forEach((s) => (s as { loader?: { mockClear(): void } }).loader?.mockClear());
});

describe.each(cases)('route $path', ({ file, path, entity, skeleton, expectArgs }) => {
  it('is registered under its locale-aware path', async () => {
    expect((await load(file)).path).toBe(path);
  });

  it('loads its page through the engine loader with the route params', async () => {
    const { stub } = await h;
    const route = await load(file);
    const result = await route.loader!({ params });
    expect(stub(entity).loader).toHaveBeenCalledWith(expectArgs);
    expect(result).toEqual({ loadedBy: entity, args: expectArgs });
  });

  it('takes its page head from the engine entry', async () => {
    const { stub } = await h;
    expect((await load(file)).head).toEqual({ withHeadOf: stub(entity) });
  });

  it('renders the engine component with the loaded data', async () => {
    const route = await load(file);
    const Component = route.component;
    render(<Component />);
    const el = document.querySelector(`[data-stub="${entity}"]`)!;
    expect(JSON.parse(el.getAttribute('data-props')!)).toEqual({ marker: 'data' });
  });

  if (skeleton) {
    it(`shows ${skeleton} while loading`, async () => {
      const Pending = (await load(file)).pendingComponent!;
      render(<Pending />);
      expect(document.querySelector(`[data-stub="${skeleton}"]`)).not.toBeNull();
    });
  } else {
    it('has no loading placeholder', async () => {
      expect((await load(file)).pendingComponent).toBeUndefined();
    });
  }
});

describe('paginated account routes', () => {
  describe.each([
    ['account.wallet', 'Wallet', { search: { page: 3 } }],
    ['account.wishlist', 'Wishlist', { search: { page: 3 }, locale: 'ar' }],
  ] as const)('%s', (file, entity, expected) => {
    it('keeps only a page number above 1 in the URL', async () => {
      const route = await load(file);
      expect(route.validateSearch!({ page: '3' })).toEqual({ page: 3 });
      expect(route.validateSearch!({ page: '1' })).toEqual({});
      expect(route.validateSearch!({ page: 'abc' })).toEqual({});
      expect(route.validateSearch!({})).toEqual({});
    });

    it('reloads when the page changes', async () => {
      const route = await load(file);
      expect(route.loaderDeps!({ search: { page: 2 } })).toEqual({ page: 2 });
    });

    it('loads the requested page, defaulting to the first', async () => {
      const { stub } = await h;
      const route = await load(file);
      await route.loader!({ deps: { page: 3 }, params });
      expect(stub(entity).loader).toHaveBeenCalledWith(expected);
      await route.loader!({ deps: {}, params });
      expect(stub(entity).loader).toHaveBeenLastCalledWith({
        ...expected,
        search: { page: 1 },
      });
    });

    it('renders the engine component with a loading placeholder', async () => {
      const route = await load(file);
      const Component = route.component;
      render(<Component />);
      expect(document.querySelector(`[data-stub="${entity}"]`)).not.toBeNull();
      const Pending = route.pendingComponent!;
      render(<Pending />);
      expect(document.querySelector('[data-stub="CustomerPageSkeleton"]')).not.toBeNull();
    });
  });
});

describe('account.orders', () => {
  it('filters by status only when one is given', async () => {
    const route = await load('account.orders');
    expect(route.validateSearch!({ status: 'paid' })).toEqual({ status: 'paid' });
    expect(route.validateSearch!({ status: '' })).toEqual({});
    expect(route.validateSearch!({})).toEqual({});
  });

  it('reloads when the status changes and passes it to the engine loader', async () => {
    const { stub } = await h;
    const route = await load('account.orders');
    expect(route.loaderDeps!({ search: { status: 'paid' } })).toEqual({ status: 'paid' });
    await route.loader!({ deps: { status: 'paid' }, params });
    expect(stub('Orders').loader).toHaveBeenCalledWith({
      search: { status: 'paid' },
      locale: 'ar',
    });
  });

  it('renders the engine component with a loading placeholder', async () => {
    const route = await load('account.orders');
    const Component = route.component;
    render(<Component />);
    expect(document.querySelector('[data-stub="Orders"]')).not.toBeNull();
    const Pending = route.pendingComponent!;
    render(<Pending />);
    expect(document.querySelector('[data-stub="CustomerPageSkeleton"]')).not.toBeNull();
    expect(route.head).toEqual({ withHeadOf: (await h).stub('Orders') });
  });
});

describe('cart route', () => {
  it('loads the cart and renders the theme cart page', async () => {
    const { stub } = await h;
    const route = await load('cart');
    await route.loader!({ params });
    expect(stub('Cart').loader).toHaveBeenCalledWith({ locale: 'ar' });
    expect(route.head).toEqual({ withHeadOf: stub('Cart') });
    const Component = route.component;
    render(<Component />);
    expect(document.querySelector('[data-stub="CartPage"]')).not.toBeNull();
    const Pending = route.pendingComponent!;
    render(<Pending />);
    expect(document.querySelector('[data-stub="CartSkeleton"]')).not.toBeNull();
  });
});

describe('product route', () => {
  beforeEach(() => {
    window.sessionStorage.setItem('breadcrumb-referrer', '/somewhere');
  });

  it('drops the visitor referrer so the product keeps its own category trail', async () => {
    const { stub } = await h;
    const route = await load('$slug.p$id');
    await route.loader!({ params });
    expect(window.sessionStorage.getItem('breadcrumb-referrer')).toBeNull();
    expect(stub('Product').loader).toHaveBeenCalledWith({ params: { id: '7' }, locale: 'ar' });
  });

  it('still loads the product when session storage is unavailable', async () => {
    const { stub } = await h;
    const route = await load('$slug.p$id');
    const spy = vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('denied');
    });
    await expect(route.loader!({ params })).resolves.toEqual({
      loadedBy: 'Product',
      args: { params: { id: '7' }, locale: 'ar' },
    });
    spy.mockRestore();
    expect(stub('Product').loader).toHaveBeenCalled();
  });

  it('loads the product on the server, where there is no window', async () => {
    const { stub } = await h;
    const route = await load('$slug.p$id');
    vi.stubGlobal('window', undefined);
    try {
      await route.loader!({ params });
    } finally {
      vi.unstubAllGlobals();
    }
    expect(stub('Product').loader).toHaveBeenCalled();
  });

  it('loads the product when the browser has no session storage', async () => {
    const { stub } = await h;
    const route = await load('$slug.p$id');
    vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue(undefined as never);
    await route.loader!({ params });
    expect(stub('Product').loader).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('remounts the product page for each product and shows the detail skeleton while loading', async () => {
    const { state, stub } = await h;
    state.loaderData = { product: { id: 5 } };
    const route = await load('$slug.p$id');
    expect(route.head).toEqual({ withHeadOf: stub('Product') });
    const Component = route.component;
    render(<Component />);
    expect(document.querySelector('[data-stub="ProductPage"]')).not.toBeNull();
    const Pending = route.pendingComponent!;
    render(<Pending />);
    expect(document.querySelector('[data-stub="ProductDetailSkeleton"]')).not.toBeNull();
  });
});

describe('static page route', () => {
  it('maps the page API record to the page-single props', async () => {
    const { stub } = await h;
    const record = {
      id: 7,
      name: 'About',
      url: '/about',
      content: '<p>hi</p>',
      metadata: { title: 't' },
      created_at: 'now',
      type: 'page',
    };
    stub('pageApi').findOrThrow = vi.fn().mockResolvedValue(record);
    const route = await load('$slug.page-$id');
    await expect(route.loader!({ params })).resolves.toEqual({
      page: {
        slug: 'page-single',
        id: 7,
        title: 'About',
        url: '/about',
        content: '<p>hi</p>',
        metadata: { title: 't' },
        created_at: 'now',
        type: 'page',
      },
    });
    expect(stub('pageApi').findOrThrow).toHaveBeenCalledWith('7');
    expect(route.head).toEqual({ withHeadOf: stub('PageSingle') });
    const Component = route.component;
    render(<Component />);
    expect(document.querySelector('[data-stub="PageSingle"]')).not.toBeNull();
  });
});

describe('redirect-only routes', () => {
  it('sends legacy brand URLs through the engine redirect loader', async () => {
    const { stub } = await h;
    const route = await load('$slug.brand-$id');
    await expect(route.loader!({ params })).toEqual({
      redirectedWith: { params: { slug: 's', id: '7', locale: 'ar' } },
    });
    expect(stub('slugBrandRedirectLoader')).toHaveBeenCalledWith({
      params: { slug: 's', id: '7', locale: 'ar' },
    });
  });

  it('logs out through the engine redirect component', async () => {
    const { stub } = await h;
    const route = await load('logout');
    expect(route.component).toBe(stub('LogoutRedirect'));
  });
});
