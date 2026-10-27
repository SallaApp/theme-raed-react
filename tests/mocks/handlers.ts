import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { toArticleSummary } from './factories';
import { defaultScenario, type MockData } from './scenarios';

/** The engine's default (`STORE_API_BASE` in its api client). */
export const STORE_API = 'https://api.salla.dev/store/v1';

const DEFAULT_PER_PAGE = 16;

const pageOf = <T>(items: T[], url: URL) => {
  const perPage = Number(url.searchParams.get('per_page')) || DEFAULT_PER_PAGE;
  // The engine hands `cursor.next` back as `cursor=`; here that opaque token is just the next page number.
  const page = Number(url.searchParams.get('cursor') ?? url.searchParams.get('page')) || 1;
  const slice = items.slice((page - 1) * perPage, page * perPage);
  const hasNext = page * perPage < items.length;
  return {
    data: slice,
    cursor: {
      current: page,
      previous: page > 1 ? String(page - 1) : null,
      next: hasNext ? String(page + 1) : null,
    },
  };
};

const price = (product: Product) => Number(product.sale_price ?? product.price);

const SORTERS: Record<string, (a: Product, b: Product) => number> = {
  price: (a, b) => price(a) - price(b),
  '-price': (a, b) => price(b) - price(a),
  name: (a, b) => a.name.localeCompare(b.name),
  '-name': (a, b) => b.name.localeCompare(a.name),
};

const filterProducts = (products: Product[], url: URL): Product[] => {
  const source = url.searchParams.get('source');
  const ids = url.searchParams.getAll('source_value[]').map(Number);
  let result = products;
  if (source === 'categories')
    result = products.filter((p) => ids.includes(Number(p.category?.id)));
  else if (source === 'brands') result = products.filter((p) => ids.includes(Number(p.brand?.id)));
  else if (source === 'tags')
    result = products.filter((p) => p.tags?.some((tag) => ids.includes(Number(tag.id))));
  else if (source === 'selected') result = products.filter((p) => ids.includes(p.id));
  else if (source === 'offers') result = products.filter((p) => p.is_on_sale);
  else if (source === 'search') {
    const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
    result = products.filter((p) => p.name.toLowerCase().includes(keyword));
  }
  const sorter = SORTERS[url.searchParams.get('sort') ?? ''];
  return sorter ? [...result].sort(sorter) : result;
};

/**
 * Handlers for the store API paths the engine's api modules call (`api/*.js` in
 * `@salla.sa/twilight-theme-engine`). `data` is read on every request, so a test can mutate it.
 */
export const createHandlers = (data: MockData = defaultScenario()): HttpHandler[] => [
  http.get(`${STORE_API}/store/settings`, () =>
    HttpResponse.json({
      data: { store: data.store, currencies: data.currencies, languages: {}, user: data.user },
    })
  ),
  http.get(`${STORE_API}/products`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(pageOf(filterProducts(data.products, url), url));
  }),
  http.get(`${STORE_API}/products/tags/:id`, ({ params }) =>
    HttpResponse.json({ tag: { id: Number(params.id), name: `Tag ${params.id}` } })
  ),
  http.get(`${STORE_API}/products/:id/details`, ({ params }) => {
    const found = data.products.find((p) => String(p.id) === params.id);
    return found
      ? HttpResponse.json({ data: found })
      : HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }),
  http.get(`${STORE_API}/categories`, () => HttpResponse.json({ data: data.categories })),
  http.get(`${STORE_API}/categories/:id`, ({ params }) => {
    const found = data.categories.find((c) => String(c.id) === params.id);
    return found
      ? HttpResponse.json({ data: found })
      : HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }),
  http.get(`${STORE_API}/brands`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(pageOf(data.brands, url));
  }),
  http.get(`${STORE_API}/brands/:id`, ({ params }) => {
    const found = data.brands.find((b) => String(b.id) === params.id);
    return found
      ? HttpResponse.json({ data: found })
      : HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }),
  http.get(`${STORE_API}/menus/header`, () => HttpResponse.json({ data: data.headerMenu })),
  http.get(`${STORE_API}/menus/footer`, () => HttpResponse.json({ data: data.footerMenu })),
  http.get(`${STORE_API}/blog`, () => {
    const summaries = data.articles.map(toArticleSummary);
    return HttpResponse.json({
      data: {
        categories: [],
        slides: summaries.slice(0, 3),
        articles: summaries,
        popular: summaries.slice(0, 3),
      },
    });
  }),
  http.get(`${STORE_API}/blog/articles`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      ...pageOf(data.articles.map(toArticleSummary), url),
      categories: [],
    });
  }),
  http.get(`${STORE_API}/blog/articles/:id`, ({ params }) => {
    const found = data.articles.find((a) => String(a.id) === params.id);
    return found
      ? HttpResponse.json({ data: found })
      : HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }),
  http.get(`${STORE_API}/cart/:id`, () => HttpResponse.json({ data: { cart: data.cart } })),
  http.get(`${STORE_API}/auth/user`, () => HttpResponse.json({ data: data.user })),
];

export const handlers = createHandlers();
