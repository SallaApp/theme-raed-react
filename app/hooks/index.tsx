import { hookRegistry, HookName, type HookContext } from '@salla.sa/twilight-theme-engine/hooks';
import { PageBlocks } from '@salla.sa/twilight-theme-engine/home';
import type { BlockScope } from '@salla.sa/twilight-theme-engine/api/home';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { AddProductToast } from '../components/cart';
import { DigitalFilesSettings } from '../components/product';

/**
 * The thank-you page hooks, in render order. The merchant's thank-you blocks
 * live here: the `tw-thank-you-page` config components at `thank-you:start`
 * (header emoji/colours/"Show order date", rewards, coupons, contacts) and
 * custom content at `thank-you:payment.end`.
 */
export const THANK_YOU_BLOCK_HOOKS = [
  HookName.THANK_YOU_START,
  HookName.THANK_YOU_ITEMS_START,
  HookName.THANK_YOU_ITEMS_END,
  HookName.THANK_YOU_PAYMENT_END,
  HookName.THANK_YOU_END,
] as const;

/**
 * Thank-you blocks belong to the theme version, not to a product, category or
 * page, so `component/list` is asked by hook alone (`?hooks=thank-you:start`).
 * `BlockScope` has no such variant; an empty scope adds no query params.
 */
const THEME_SCOPE = {} as BlockScope;

export function registerThemeHooks() {
  // The engine's thank-you page renders these hook slots but never loads the
  // blocks placed at them. Without this the theme editor's thank-you settings
  // (e.g. "Show order date" OFF) are saved but never reach the storefront:
  // each config component only applies them once it is mounted on the page.
  for (const hook of THANK_YOU_BLOCK_HOOKS) {
    hookRegistry.register(hook, () => <PageBlocks hook={hook} scope={THEME_SCOPE} />, 50);
  }

  // Register AddProductToast at body:end hook slot. Default on (twilight.json
  // ships the setting `"value": true`); only an explicit `false` turns it off.
  hookRegistry.register(
    HookName.BODY_END,
    (context: HookContext) => {
      const { twilight } = context;
      if (twilight?.theme?.settings?.enable_add_product_toast === false) return null;
      return <AddProductToast />;
    },
    50
  );

  // Register DigitalFilesSettings at product:single.description hook slot
  // Receives product from ProductDetails via context prop
  hookRegistry.register(
    HookName.PRODUCT_DESCRIPTION,
    (context: HookContext) => {
      const { product } = context as { product?: Product };
      if (!product?.digital_files_settings) return null;
      return <DigitalFilesSettings {...product.digital_files_settings} />;
    },
    50
  );
}
