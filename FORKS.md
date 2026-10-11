# Engine forks

These theme components are copies of engine components, changed for Raed. The engine does not
update them, so each upgrade of `@salla.sa/twilight-theme-engine` can leave them behind. This file
records where each one came from, so you can see what changed upstream.

**Base** is the engine version in the repo when the fork was last edited. It is the oldest
upstream change the fork might have taken in, not proof that it was synced then.

| Fork (`app/components/…`)     | Engine source (`packages/theme-engine/src/…`) | Wired in by                                        | Base   | What the fork changes                                                                                      |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `product/ProductPage.tsx`     | `routes/product/ProductPage.tsx`              | `app/routes/$slug.p$id.tsx`                        | 1.0.78 | Renders the forks below and the theme `ProductsSlider`; drops the store-wide testimonials block            |
| `product/ProductDetails.tsx`  | `components/product/ProductDetails.tsx`       | `ProductPage`                                      | 1.0.85 | Flat data-column blocks (no card background, rounding or padding)                                          |
| `product/ProductGallery.tsx`  | `components/product/ProductGallery.tsx`       | `ProductPage`                                      | 1.0.85 | Thumbs use `slidesPerView: 'auto'`; `<SallaMetadata>` renders under the slider                             |
| `product/AddToCartForm.tsx`   | `components/product/AddToCartForm.tsx`        | `ProductPage`                                      | 1.0.78 | `flex-col gap-8` form with flat sections; sticky bar keeps `bg-white`                                      |
| `product/ProductListPage.tsx` | `routes/product-listing/ProductListPage.tsx`  | `registry` `product:list-page` in `app/router.tsx` | 1.0.83 | Pill toolbar (count, grid/list switch, sort), desktop "hide filters" toggle, preferences in `localStorage` |
| `cart/CartPage.tsx`           | `routes/cart/CartPage.tsx`                    | `app/routes/cart.tsx`                              | 1.0.78 | Column-heading row above the items; renders the `CartItem` fork                                            |
| `cart/CartItem.tsx`           | `components/cart/CartItem.tsx`                | `CartPage`                                         | 1.0.64 | Flat row, no "Total:" label, trash icon at row end, React quantity stepper                                 |
| `page/PageSingle.tsx`         | `routes/page/PageSingle.tsx`                  | `app/routes/$slug.page-$id.tsx`                    | 1.0.78 | `customised` pages render only the `information_page.information_page` hook                                |
| `home/FixedProducts.tsx`      | `components/home/FixedProducts.tsx`           | `registerHomeComponents` in `app/router.tsx`       | 1.0.47 | Same markup, uses the theme `ProductCard`                                                                  |

## Upgrading the engine

For each fork, diff its engine source from **Base** to the new version and port what applies:

```bash
git diff engine-v1.0.78 engine-v1.0.90 -- packages/theme-engine/src/routes/product/ProductPage.tsx
```

Then set **Base** to the new version.

Outside this monorepo, engine 1.0.86 and later ship each component's source in
`node_modules/@salla.sa/twilight-theme-engine/tailwind/` as `<path>.tsx.txt`; compare that folder
across the two versions. Older packages have no source copy, so for a **Base** before 1.0.86 diff
the `engine-v<version>` tags above instead.

## Adding a fork

Add a row here, and say at the top of the file's doc comment what differs from the engine. Fork
only when a hook slot, the `registry`, or a home-component key can't do the job: every fork is
code you now maintain by hand. See
[Fork a built-in route](https://docs.salla.dev/twilight/react/recipes/fork-a-built-in-route).
