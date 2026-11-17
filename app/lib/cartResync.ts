/**
 * Drops the SDK's stored cart and asks the API for the visitor's current one.
 *
 * The SDK keeps the cart id in `salla.storage` ('cart') and never learns that a
 * checkout turned it into an order: Twig themes relied on the cart page comparing
 * that id with the server's session cart, which the React engine doesn't do. So
 * after an order the header badge kept the old count and the cart page asked the
 * API for a purchased cart.
 *
 * `getCurrentCartId(true)` calls the SDK's `latest()`, which stores the fresh
 * cart's summary and fires `cart::updated`, so every badge listening to it
 * (`<salla-cart-summary>`, the mobile bottom bar) updates in place.
 */
type SallaCartApi = {
  reset?: () => void;
  getCurrentCartId?: (refresh?: boolean, caller?: string) => Promise<unknown>;
};

type SallaLike = {
  onReady?: () => Promise<unknown>;
  cart?: { reset?: () => void; api?: SallaCartApi };
};

function getSalla(): SallaLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.salla as unknown as SallaLike | undefined;
}

/** Resolves once the SDK is loaded and initialised (the engine fires `theme::ready` then). */
function whenSdkReady(): Promise<SallaLike | undefined> {
  const salla = getSalla();
  if (salla?.onReady) return salla.onReady().then(getSalla, getSalla);
  if (typeof document === 'undefined') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    document.addEventListener('theme::ready', () => resolve(getSalla()), { once: true });
  });
}

export async function resyncSallaCart(caller = 'theme::cartResync'): Promise<void> {
  const salla = await whenSdkReady();
  const cart = salla?.cart;
  if (!cart) return;
  if (cart.api?.reset) cart.api.reset();
  else cart.reset?.();
  try {
    await cart.api?.getCurrentCartId?.(true, caller);
  } catch {
    // `latest()` already reset the cart on failure; the next add to cart starts a new one.
  }
}
