# Store API mock backend (MSW)

Request handlers, typed factories and named scenarios for the store API the engine calls
(`https://api.salla.dev/store/v1`). Shapes come from `@salla.sa/twilight-theme-engine`
(`dist/types`, `dist/api/*`) — the paths below are the ones its api modules request.

| File           | What                                                                                                                                                                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `factories.ts` | `createProduct`, `createSoldOutProduct`, `createOnSaleProduct`, `createProductWithOptions`, `createBookingProduct`, `createDigitalProduct`, `createCategory`, `createBrand`, `createMenuItem`, `createCart`, `createCartItem`, `createArticle`, `createUser`, `createCurrency`, `createStore`. Each takes overrides. |
| `scenarios.ts` | `MockData` and the scenarios `default`, `emptyStore`, `soldOutProduct`, `storeWithBlog`, `multiCurrency`.                                                                                                                                                                                                            |
| `handlers.ts`  | `createHandlers(data)` and `handlers` (default data).                                                                                                                                                                                                                                                                |
| `server.ts`    | Node server for vitest (jsdom): `installMockServer()`, `useScenario()`.                                                                                                                                                                                                                                              |
| `browser.ts`   | Worker for Storybook / Playwright: `startMockWorker(scenario)`.                                                                                                                                                                                                                                                      |

## Use in a unit test

```ts
import { installMockServer, useScenario } from '../mocks/server';

installMockServer(); // starts before the file, resets after each test, fails on unknown requests

it('shows the empty state', async () => {
  useScenario('emptyStore');
  // ...render; the real engine `product.list()` now gets an empty list
});
```

Override one request with `server.use(http.get(`${STORE_API}/products`, ...))` (see
`tests/components/home/ProductsSlider.test.tsx`). Nothing is global: a test file that
does not call `installMockServer()` is unaffected.

## Handled endpoints

`store/settings`, `products` (sources `latest`, `categories`, `brands`, `selected`, `offers`,
`search`; `page`/`cursor`, `per_page`, `sort=price|-price|name|-name`), `products/:id/details`,
`products/tags/:id`, `categories`, `categories/:id`, `brands`, `brands/:id`, `menus/header`,
`menus/footer`, `blog`, `blog/articles`, `blog/articles/:id`, `cart/:id`, `auth/user`.

## Not confirmed / not covered

- Testimonials, reviews, orders, wallet, loyalty, notifications, pages and `component/list`
  have no handler: the engine's response shapes for them were not checked, so none were invented.
- Real `sort` values and the exact real `cursor.next` format were not confirmed; the mock
  supports the four sorts above and uses the next page number as an opaque cursor.
- `store/settings` returns only `store`, `currencies`, `languages`, `user`; `createStore`
  fills the fields the theme reads, not every required field of the engine's `Store`.
- Browser worker: run `npx msw init public/ --save` when wiring Storybook or Playwright.
