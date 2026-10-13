import { SallaAddProductButton } from '@salla.sa/twilight-components-react/add-product-button';
import { SallaButton } from '@salla.sa/twilight-components-react/button';
import { SallaCountDown } from '@salla.sa/twilight-components-react/count-down';
import { SallaFileUpload } from '@salla.sa/twilight-components-react/file-upload';
import { SallaGifting } from '@salla.sa/twilight-components-react/gifting';
import { SallaMultipleBundleProduct } from '@salla.sa/twilight-components-react/multiple-bundle-product';
// Use the eager (non-deferred) Core export: product options are an essential form
// control, and the deferred wrapper's visibility-triggered hydration races with the
// gallery's image layout shift and gets stuck on the skeleton, so options never appear.
import { SallaProductOptionsCore as SallaProductOptions } from '@salla.sa/twilight-components-react/product-options';
import { SallaProductSizeGuide } from '@salla.sa/twilight-components-react/product-size-guide';
import { SallaQuantityInput } from '@salla.sa/twilight-components-react/quantity-input';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { hapticImpact } from '@salla.sa/twilight-theme-engine/native-app';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { getActiveCurrency } from '@salla.sa/twilight-theme-engine/api/client';
import { CurrencySymbol } from '@salla.sa/twilight-theme-engine/common';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePriceBump } from '../../hooks/usePriceBump';

/** The web component's `type="submit"` path skips its own loader, so drive the
    inner `<salla-button>` spinner by hand. */
type LoadableButton = HTMLElement & { load?: () => void; stop?: () => void };
const addButton = (form: HTMLFormElement | null): LoadableButton | null =>
  (form?.querySelector('salla-button') as LoadableButton | null) ?? null;

type ProductOptionsElement = HTMLElement & { validateAndScroll?: () => Promise<boolean> };

interface AddToCartFormProps {
  product: Product;
  stickyAddToCart?: boolean;
  giftingIntro?: string;
  formStartSlot?: ReactNode;
  formEndSlot?: ReactNode;
}

/** True when the click came from the buy-now widget (`<salla-mini-checkout-widget>`,
 *  a shadow-DOM element — hence `composedPath`, not `closest`). */
const isQuickBuyClick = (e: { nativeEvent: Event }) =>
  e.nativeEvent
    .composedPath()
    .some((node) => (node as HTMLElement).localName === 'salla-mini-checkout-widget');

// Forms whose buy-now widget was just clicked. The widget lives inside the product form and
// its click must never add the product to the cart, so the one submit that click can cause
// (it runs in the same task, right after the click) is dropped. The flag is cleared as soon
// as it has done that, or when the task ends — a later, deliberate add-to-cart press is
// never swallowed.
const quickBuyPending = new WeakSet<HTMLFormElement>();

const handleQuickBuyClick = (e: React.MouseEvent<HTMLFormElement>) => {
  if (!isQuickBuyClick(e)) return;
  const form = e.currentTarget;
  quickBuyPending.add(form);
  window.setTimeout(() => quickBuyPending.delete(form), 0);
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (quickBuyPending.delete(e.currentTarget)) return;
  hapticImpact('medium');
  const btn = addButton(e.currentTarget);
  btn?.load?.();
  // Safety net: the cart events clear it on a real response; this covers a
  // silent validation bail (`salla.form.onSubmit` returns `false` either way).
  window.setTimeout(() => btn?.stop?.(), 8000);
  window.salla?.form.onSubmit('cart.addItem', e);
};

const handleChange = (e: React.FormEvent<HTMLFormElement>) => {
  const form = e.currentTarget;
  // Not reportValidity(): it focuses and scrolls to the first empty required option mid-edit.
  const isComplete = Array.from(form.elements).every(
    (el) => !(el as HTMLInputElement).willValidate || (el as HTMLInputElement).validity.valid
  );
  if (isComplete) {
    window.salla?.product?.getPrice(new FormData(form));
    return;
  }
  // A new quantity can't be priced yet: show the empty options, like the add-to-cart button.
  if ((e.target as Element).closest?.('salla-quantity-input')) {
    void form.querySelector<ProductOptionsElement>('salla-product-options')?.validateAndScroll?.();
  }
};

/** Weight line + a link that opens the size-guide modal. Renders nothing for a
 * product with neither. */
function WeightAndSizeGuideSection({ product }: { product: Product }) {
  const { t } = useTranslation();
  if (!product.weight && !product.has_size_guide) return null;

  return (
    <section>
      {product.weight && (
        <div
          className={`center-between ${product.has_size_guide ? 'pb-5 mb-5 border-b-[1px]' : ''}`}
        >
          <b className="form-label rtl:space-x-reverse space-x-1">
            <i className="sicon-luggage-cart"></i>
            <span>{t('pages.products.weight')}</span>
          </b>
          <span className="product-weight text-sm">{product.weight}</span>
        </div>
      )}
      {product.has_size_guide && (
        <>
          <div className="center-between">
            <b className="form-label rtl:space-x-reverse space-x-1">
              <i className="sicon-pencil-ruler"></i>
              <span>{t('pages.products.size_guides')}</span>
            </b>
            <SallaButton
              shape="link"
              color="primary"
              className="!p-0 text-sm with-arrow"
              onClick={() => window.salla?.event?.dispatch('size-guide::open', String(product.id))}
            >
              {t('pages.products.show_size_guides')}
              <i className="sicon-keyboard_arrow_left"></i>
            </SallaButton>
          </div>
          <SallaProductSizeGuide />
        </>
      )}
    </section>
  );
}

/** The note / file-upload tabs and their collapse panels. Renders nothing for a
 * product with neither. */
function AttachmentsSection({
  product,
  activeCollapse,
  onToggle,
}: {
  product: Product;
  activeCollapse: string | null;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (!product.can_add_note && !product.can_upload_file) return null;

  const noteId = `note_${product.id}`;
  const fileId = `file_${product.id}`;

  return (
    <section>
      <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start">
        <div className="form-label">
          <b className="block">{t('pages.products.attachments')}</b>
        </div>
        <div className="mt-1 sm:mt-0 sm:col-span-2 text-end">
          <div className="flex rtl:space-x-reverse space-x-3">
            {product.can_add_note && (
              <button
                type="button"
                onClick={() => onToggle(noteId)}
                className={`btn-tab btn--collapse ${activeCollapse === noteId ? 'is-opened' : 'is-closed'}`}
              >
                <i className="font-medium sicon-chat-conversation-alt rtl:ml-1.5 ltr:mr-1.5"></i>
                <span className="fix-align">{t('pages.products.add_note')}</span>
              </button>
            )}
            {product.can_upload_file && (
              <button
                type="button"
                onClick={() => onToggle(fileId)}
                className={`btn-tab btn--collapse ${activeCollapse === fileId ? 'is-opened' : 'is-closed'}`}
              >
                <i className="font-medium sicon-paperclip rtl:ml-1.5 ltr:mr-1.5"></i>
                <span className="fix-align">{t('pages.products.add_file')}</span>
              </button>
            )}
          </div>

          {product.can_add_note && (
            <div
              className={`collapse-content ${activeCollapse === noteId ? 'is-opened' : 'is-closed'}`}
            >
              <div className="pt-4">
                <textarea
                  className="animated animatedfadeInDown fadeInDown form-input h-16 bg-gray-50 block"
                  placeholder={t('pages.products.notes_placeholder')}
                  name="notes"
                  cols={30}
                  rows={10}
                  defaultValue={product.notes}
                ></textarea>
              </div>
            </div>
          )}

          {product.can_upload_file && (
            <div
              className={`collapse-content ${activeCollapse === fileId ? 'is-opened' : 'is-closed'}`}
            >
              <div className="pt-4 px-1">
                <SallaFileUpload
                  accept="image/png, image/jpeg, image/jpg, image/gif, video/*, application/pdf"
                  className="product-option-uploader"
                >
                  <div className="product-option-uploader-placholder">
                    <span className="product-option-uploader-placholder-icon">
                      <i className="sicon-camera"></i>
                    </span>
                    <p className="profile-filepond-placholder-text">
                      {t('common.uploader.drag_and_drop')}
                    </p>
                    <span className="filepond--label-action">{t('common.uploader.browse')}</span>
                  </div>
                </SallaFileUpload>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Sale / starting-or-normal price, plus the out-of-stock message — the
 * left-hand side of the sticky bar's quantity row. */
function StickyPriceDisplay({ product, priceBump }: { product: Product; priceBump: number }) {
  const { t } = useTranslation();
  // The API converts the amounts but still labels them in the store's own currency.
  const priceCurrency = getActiveCurrency(product.currency);
  const priceBumpClass = priceBump ? ' price-bump' : '';

  return (
    <>
      <div
        className={`price-wrapper flex items-center gap-4 whitespace-nowrap ${product.is_out_of_stock ? 'hidden' : ''}`}
      >
        <div
          key={`sale-${priceBump}`}
          className={`price_is_on_sale${priceBumpClass} space-x-2 rtl:space-x-reverse whitespace-nowrap ${product.is_on_sale ? '' : 'hidden'}`}
        >
          <span className="price-bump__now total-price text-red-800 font-bold text-xl inline-block">
            {product.sale_price} <CurrencySymbol currency={priceCurrency} />
          </span>
          <span className="before-price text-gray-500 line-through">
            {product.regular_price} <CurrencySymbol currency={priceCurrency} />
          </span>
        </div>
        <div
          key={`plain-${priceBump}`}
          className={`starting-or-normal-price${priceBumpClass} gap-4 ${product.is_on_sale ? 'hidden' : 'flex'}`}
        >
          {product.starting_price && (
            <span className="starting-price-title">{t('pages.products.starting_price')}</span>
          )}
          <span className="price-bump__now total-price font-bold text-xl inline-block">
            {String(product.starting_price ?? product.price)}{' '}
            <CurrencySymbol currency={priceCurrency} />
          </span>
        </div>
      </div>

      <div
        className={`out-of-stock min-h-7 leading-7 text-base text-red-600 !opacity-50 font-bold ${product.is_out_of_stock ? 'scale-pulse' : 'hidden'}`}
      >
        {t('pages.products.out_of_stock')}
      </div>
    </>
  );
}

/** A booking / hidden-quantity product always orders exactly one — post a
 * hidden `1` instead of the stepper. */
function StickyQuantityField({ product }: { product: Product }) {
  const { t } = useTranslation();
  const max = product.max_quantity;
  // The loaded salla-quantity-input reads `name`/`max` from attributes; the wrapper sets properties.
  const quantityRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      el.setAttribute('name', 'quantity');
      if (max) el.setAttribute('max', String(max));
      else el.removeAttribute('max');
    },
    [max]
  );

  if (product.is_hidden_quantity || product.type === 'booking') {
    return (
      <input type="hidden" value="1" name="quantity" aria-label={t('pages.products.quantity')} />
    );
  }

  return (
    <SallaQuantityInput
      ref={quantityRef}
      max={product.max_quantity ?? undefined}
      value={1}
      name="quantity"
      aria-label={t('pages.products.quantity')}
      className="border-gray-200 flex ms-auto"
    />
  );
}

/** Live price + quantity stepper + the add-to-cart button itself. */
function StickyProductBar({
  product,
  stickyAddToCart,
  priceBump,
  hasPreorder,
}: {
  product: Product;
  stickyAddToCart?: boolean;
  priceBump: number;
  hasPreorder: boolean;
}) {
  const { store } = useTwilight();
  // The storefront API doesn't send `can_quick_buy` for a product, so gating on it
  // alone never shows the buy-now (+ Apple Pay) widget. Fall back to the store's
  // quick-purchase setting; the button itself still checks status, product type
  // and the wallet's availability before it renders anything.
  const quickBuy = product.can_quick_buy ?? !!store?.settings?.buy_now;
  // The loaded component copies host attributes (not properties) onto its inner salla-button.
  const addButtonRef = useCallback((el: HTMLElement | null) => {
    el?.setAttribute('width', 'wide');
    el?.setAttribute('type', 'submit');
  }, []);
  return (
    <section className="sticky-product-bar bg-white">
      {/* Live price on the start side, quantity stepper on the end side
          (replaces the standalone price section and the "Quantity" label). */}
      <div className="sticky-product-bar__quantity center-between mb-5">
        <StickyPriceDisplay product={product} priceBump={priceBump} />
        <StickyQuantityField product={product} />
      </div>

      <SallaAddProductButton
        ref={addButtonRef}
        {...(quickBuy ? { quickBuy: true } : {})}
        {...(stickyAddToCart ? { supportStickyBar: true } : {})}
        {...(product.is_require_shipping ? { requiredShipping: true } : {})}
        {...(hasPreorder ? { hasPreOrder: true } : {})}
        amount={
          typeof product.base_currency_price === 'object'
            ? product.base_currency_price.amount
            : product.base_currency_price
        }
        className="mt-5 w-full sticky-product-bar__btn"
        productStatus={product.status}
        productType={product.type}
        productId={product.id}
        loaderPosition="center"
        type="submit"
        width="wide"
        {...(product.notify_availability
          ? {
              ...(product.notify_availability.subscribed ? { isSubscribed: true } : {}),
              channels: product.notify_availability.channels.join(','),
              ...(product.notify_availability.subscribed_options
                ? {
                    subscribedOptions: JSON.stringify(
                      product.notify_availability.subscribed_options
                    ),
                  }
                : {}),
              ...(product.notify_availability.options ? { notifyOptionsAvailability: true } : {}),
            }
          : {})}
      >
        {product.add_to_cart_label}
      </SallaAddProductButton>
    </section>
  );
}

/**
 * Theme fork of the engine `AddToCartForm`.
 *
 * Differs from the engine version: the form is a `flex flex-col gap-8` column and its
 * section blocks (weight / size-guide, attachments, price, quantity) render flat:
 * no `bg-white` card padding, no `rounded`, no per-block `mb`. The sticky
 * add-to-cart bar keeps `bg-white` for its mobile fixed-position backdrop.
 * Upgrade notes: `FORKS.md`.
 */
export function AddToCartForm({
  product,
  stickyAddToCart,
  giftingIntro,
  formStartSlot,
  formEndSlot,
}: AddToCartFormProps) {
  const [activeCollapse, setActiveCollapse] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Replays the little pulse whenever the figures change (quantity / options).
  const priceBump = usePriceBump(
    product.sale_price,
    product.price,
    product.regular_price,
    product.starting_price
  );

  // Stop the add-to-cart spinner once the cart request resolves (either way).
  // Unsubscribe through the same `cart` reference `on*` used — `off*` finds the
  // wrapper `on*` registered by identity, so re-reading `window.salla.cart.event`
  // fresh in the cleanup wouldn't reliably remove it. Without this, navigating
  // product to product (this component remounts per product) left every prior
  // product's listeners still firing.
  useEffect(() => {
    const stop = () => addButton(formRef.current)?.stop?.();
    const cart = window.salla?.cart?.event;
    cart?.onItemAdded?.(stop);
    cart?.onItemAddedFailed?.(stop);
    return () => {
      cart?.offItemAdded?.(stop);
      cart?.offItemAddedFailed?.(stop);
    };
  }, []);

  // stable ref: an inline arrow re-runs on every render and resets the user's selection
  const optionsRef = useCallback(
    (el: { setOptionsData?: (data: never[]) => void } | null) =>
      void el?.setOptionsData?.(product.options as never[]),
    [product.options]
  );

  // salla-product-options reads its `options` prop only in its constructor (no
  // @Watch), and on first load that constructor runs before sdk.init has set
  // page.id — so its getDetails(page.id) fallback fetches nothing and the options
  // never reflect. Seed page.id (=== product.id) and wait for the SDK to be ready
  // before mounting the element so its fallback resolves on first load too.
  const [optionsReady, setOptionsReady] = useState(false);
  useEffect(() => {
    const salla = window.salla;
    if (!salla) return;
    let alive = true;
    salla.config?.set?.('page.id', product.id);
    Promise.resolve(salla.onReady?.()).finally(() => {
      if (alive) setOptionsReady(true);
    });
    return () => {
      alive = false;
    };
  }, [product.id]);

  const handleCollapseToggle = useCallback((id: string) => {
    setActiveCollapse((current) => (current === id ? null : id));
  }, []);

  const hasPreorder = Boolean(product.has_preorder_campaign && product.preorder);

  return (
    <form
      ref={formRef}
      className="form product-form mt-6 flex flex-col gap-8"
      encType="multipart/form-data"
      method="post"
      onClickCapture={handleQuickBuyClick}
      onSubmit={handleSubmit}
      onChange={handleChange}
    >
      <input type="hidden" name="id" value={product.id} />

      {formStartSlot}

      {optionsReady && product.options && product.options.length > 0 && (
        <SallaProductOptions
          key={product.id}
          // constructor-only options parse: push data via ref on client remount
          ref={optionsRef}
          options={JSON.stringify(product.options)}
          productId={product.id}
        />
      )}

      {product.has_bundle_products && (
        <SallaMultipleBundleProduct bundleSections={JSON.stringify(product)} />
      )}

      <WeightAndSizeGuideSection product={product} />

      <AttachmentsSection
        product={product}
        activeCollapse={activeCollapse}
        onToggle={handleCollapseToggle}
      />

      {formEndSlot}

      {hasPreorder ? (
        <section className="mt-5">
          <SallaCountDown preOrder={JSON.stringify(product.preorder)} boxed labeled />
        </section>
      ) : null}

      <StickyProductBar
        product={product}
        stickyAddToCart={stickyAddToCart}
        priceBump={priceBump}
        hasPreorder={hasPreorder}
      />

      {product.giftable && (
        <SallaGifting
          className="mt-5"
          widgetSubtitle={giftingIntro}
          productId={product.id}
          {...(product.is_require_shipping ? { physicalProducts: true } : {})}
        />
      )}
    </form>
  );
}
