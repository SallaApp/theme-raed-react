import { createContext, startTransition, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Product as ProductRoute } from '@salla.sa/twilight-theme-engine/routes/product';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { loadStaticVariants, swapProductId } from '../../lib/staticVariants';
import type { ProductRouteData } from './ProductPage';

/**
 * Switching between the products of an option group (TagVariantSelector)
 * without a route change: the next product loads in the background and the
 * page swaps to it in place, so the customer stays where they are and sees no
 * reload. A route change would re-run the root loader, which on a shared host
 * can reload the whole document, and shows the route skeleton meanwhile.
 */
export interface ProductSwitch {
  /** Loads the product and shows it. False when a later call took over. */
  open(id: number): Promise<boolean>;
}

const ProductSwitchContext = createContext<ProductSwitch | null>(null);

export function useProductSwitch(): ProductSwitch | null {
  return useContext(ProductSwitchContext);
}

/** The product route's data for one product: what its loader returns. */
async function loadProductRouteData(id: number, locale: string | undefined): Promise<ProductRouteData> {
  const [data, staticVariants] = await Promise.all([
    ProductRoute.loader({ params: { id: String(id) }, locale }),
    loadStaticVariants(id).catch(() => null),
  ]);
  return { ...data, staticVariants };
}

/** Waits briefly for the product's main image, so it doesn't pop in after the swap. */
function preloadMainImage(product: Product | undefined): Promise<void> {
  const url = product?.image?.url ?? product?.images?.[0]?.url;
  if (!url || typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = img.onerror = () => resolve();
    setTimeout(resolve, 1500);
    img.src = url;
  });
}

/**
 * Rewrites the address bar without telling the router. TanStack wraps
 * `history.replaceState` and would re-run the route (skeleton, and the root
 * loader that can reload the document on a shared host) for the product we
 * already show. `_ignoreSubscribers` is the switch TanStack's own history uses
 * for the same purpose; the router's history state is kept as it is.
 */
function replaceAddressQuietly(history: ReturnType<typeof useRouter>['history'], href: string) {
  history._ignoreSubscribers = true;
  try {
    window.history.replaceState(window.history.state, '', href);
  } finally {
    history._ignoreSubscribers = false;
  }
}

/**
 * The product shown on the page: the route's product, or the one switched to.
 * A router navigation (another product, back/forward) replaces the loader data
 * and so drops the switched product.
 */
export function useSwitchableProduct(loaded: ProductRouteData, locale: string | undefined) {
  const [switched, setSwitched] = useState<{ base: ProductRouteData; data: ProductRouteData } | null>(null);
  const router = useRouter();
  const latest = useRef(0);
  const shown = switched?.base === loaded ? switched.data : loaded;

  const open = useCallback(
    async (id: number) => {
      const run = ++latest.current;
      const data = await loadProductRouteData(id, locale);
      await preloadMainImage(data.product);
      if (run !== latest.current) return false;

      const previousName = shown.product.name;
      // A transition keeps this page on screen while the new one's lazy parts
      // load, instead of hiding it behind the nearest Suspense fallback.
      startTransition(() => setSwitched({ base: loaded, data }));
      // The address follows the product (a refresh or a shared link opens it),
      // replacing this entry so Back leaves the page as before.
      const path = swapProductId(window.location.pathname, id);
      if (path) replaceAddressQuietly(router.history, `${path}${window.location.search}`);
      if (previousName && data.product.name) {
        document.title = document.title.replace(previousName, data.product.name);
      }
      return true;
    },
    [loaded, locale, router.history, shown.product.name]
  );

  const productSwitch = useMemo<ProductSwitch>(() => ({ open }), [open]);
  return { shown, productSwitch };
}

export const ProductSwitchProvider = ProductSwitchContext.Provider;
