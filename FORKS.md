# Engine forks

These theme components are copies of engine components, changed for Raed. The engine does not
update them, so each upgrade of `@salla.sa/twilight-theme-engine` can leave them behind. This file
records where each one came from, so you can see what changed upstream.

**Base** is the engine version in the repo when the fork was last edited. It is the oldest
upstream change the fork might have taken in, not proof that it was synced then.

| Fork (`app/components/…`)     | Engine source (`tailwind/…` in the engine)    | Wired in by                                        | Base   | What the fork changes                                                                                      |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `product/ProductPage.tsx`     | `routes/product/ProductPage.tsx`              | `app/routes/$slug.p$id.tsx`                        | 1.0.78 | Renders the forks below and the theme `ProductsSlider`; drops the store-wide testimonials block            |
| `product/ProductDetails.tsx`  | `components/product/ProductDetails.tsx`       | `ProductPage`                                      | 1.0.85 | Flat data-column blocks (no card background, rounding or padding); description YouTube iframes show as a click-to-play thumbnail (`lib/descriptionVideos.ts`)                                          |
| `product/ProductGallery.tsx`  | `components/product/ProductGallery.tsx`       | `ProductPage`                                      | 1.0.89 | Thumbs use `slidesPerView: 'auto'`; `<SallaMetadata>` renders under the slider                             |
| `product/AddToCartForm.tsx`   | `components/product/AddToCartForm.tsx`        | `ProductPage`                                      | 1.0.78 | `flex-col gap-8` form with flat sections; sticky bar keeps `bg-white`; options in the collapsible `common/ProductOptionsPanel.tsx`                                      |
| `product/ProductListPage.tsx` | `routes/product-listing/ProductListPage.tsx`  | `registry` `product:list-page` in `app/router.tsx` | 1.0.83 | Pill toolbar (count, grid/list switch, sort), desktop "hide filters" toggle, preferences in `localStorage` |
| `cart/CartPage.tsx`           | `routes/cart/CartPage.tsx`                    | `app/routes/cart.tsx`                              | 1.0.78 | Column-heading row above the items; renders the `CartItem` fork; an error state with retry instead of a skeleton that never ends when the cart can't be loaded; a cart the API answers 404 for calls `salla.cart.reset()` and shows empty |
| `cart/CartItem.tsx`           | `components/cart/CartItem.tsx`                | `CartPage`                                         | 1.0.64 | Flat row, no "Total:" label, trash icon at row end, React quantity stepper; options in the collapsible `common/ProductOptionsPanel.tsx`                                 |
| `page/PageSingle.tsx`         | `routes/page/PageSingle.tsx`                  | `app/routes/$slug.page-$id.tsx`                    | 1.0.78 | `customised` pages render only the `information_page.information_page` hook                                |
| `home/FixedProducts.tsx`      | `components/home/FixedProducts.tsx`           | `registerHomeComponents` in `app/router.tsx`       | 1.0.47 | Same markup, uses the theme `ProductCard`, and shows the block's `limit` products instead of always 4        |
| `home/LatestProducts.tsx`     | `components/home/LatestProducts.tsx`          | `registerHomeComponents` in `app/router.tsx`       | 1.0.139 | Same markup, uses the theme `ProductCard` (the no-blocks home fallback)                                     |
| `layout/PageAdvertisements.tsx` | `components/layout/PageAdvertisements.tsx` | `layout/Header.tsx` | 1.0.139 | The theme editor preview keeps each ad's pages (the engine shows every ad on every page there); page slug read from the router matches |
| `layout/Footer.tsx` | `components/layout/Footer.tsx` | `layout/ThemeLayout.tsx`, `layout/MobileAccountSheet.tsx` | 1.0.139 | Columns layout: a "Contact us" column (`<salla-contacts>` list) replaces the phone / email row under the description; the "Important links" column hides when the footer menu is empty |

## Upgrading the engine

The engine package ships each component's source as `tailwind/<path>.tsx.txt`, under the path in
**Engine source**. For each fork, compare that file between **Base** and the new version and port
what applies:

```bash
for v in 1.0.86 1.0.90; do
  mkdir -p engine-$v && tar -xzf "$(npm pack @salla.sa/twilight-theme-engine@$v --silent)" -C engine-$v
done
diff -u engine-1.0.86/package/tailwind/routes/product/ProductPage.tsx.txt \
  engine-1.0.90/package/tailwind/routes/product/ProductPage.tsx.txt
```

Then set **Base** to the new version. Packages before 1.0.86 have no source copy, so for an older
**Base** compare the fork with the 1.0.86 source in full.

## Adding a fork

Add a row here, and say at the top of the file's doc comment what differs from the engine. Fork
only when a hook slot, the `registry`, or a home-component key can't do the job: every fork is
code you now maintain by hand. See
[Fork a built-in route](https://docs.salla.dev/twilight/react/recipes/fork-a-built-in-route).
