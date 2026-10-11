import { hookRegistry, HookName, type HookContext } from '@salla.sa/twilight-theme-engine/hooks';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { AddProductToast } from '../components/cart';
import { DigitalFilesSettings } from '../components/product';

export function registerThemeHooks() {
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
