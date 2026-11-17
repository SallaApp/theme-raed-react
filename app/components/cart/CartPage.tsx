import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SallaConditionalOffer } from '@salla.sa/twilight-components-react/conditional-offer';
import { SallaOffer } from '@salla.sa/twilight-components-react/offer';
import { HookSlot, usePageConfig } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Breadcrumb, NoContent } from '@salla.sa/twilight-theme-engine/common';
import { CartSummary, SeoCartWidget } from '@salla.sa/twilight-theme-engine/cart';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { CartSkeleton } from '@salla.sa/twilight-theme-engine/skeleton';
import { loyalty } from '@salla.sa/twilight-theme-engine/api/loyalty';
import { cart } from '@salla.sa/twilight-theme-engine/api/cart';
import type { CartPageProps } from '@salla.sa/twilight-theme-engine/routes/cart';
import { resyncSallaCart } from '../../lib/cartResync';
import { CartItem } from './CartItem';

/**
 * Whether `cart/<id>` refused the SDK's cart id itself: any 4xx but 401 (auth)
 * and 429 (rate limit). A purchased cart doesn't answer 404, so 404 alone missed
 * the "ordered, then opened the cart" case. The engine's API client throws ky's
 * `HTTPError`, and the SDK's own 403 / "Cart not available" reset never sees it.
 */
function isStaleCart(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status != null && status >= 400 && status < 500 && status !== 401 && status !== 429;
}

/**
 * Theme fork of the engine `CartPage`.
 *
 * Same data flow as upstream, plus a column-heading row above the items
 * (Products (N) · Quantity · Total) so the flat {@link CartItem} rows read as a
 * table, and an error state with a retry when the cart can't be loaded
 * (upstream keeps its skeleton up for good). A cart the API refuses (4xx, e.g.
 * already ordered) is dropped from the SDK, re-synced and shown empty until the
 * current cart loads. Upgrade notes: `FORKS.md`.
 */
function CartPageContent({ page }: CartPageProps) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Tells the SDK this is the cart page on a direct load, so `<salla-product-options>`
  // pre-checks each item's selected option.
  usePageConfig(page);
  const { data: loyaltyPoints } = useQuery(loyalty.queries.points());

  const cartIdQuery = useQuery(cart.queries.currentId());
  const cartId = cartIdQuery.data;

  const cartQuery = useQuery({
    ...cart.queries.detail(cartId!),
    enabled: !!cartId,
  });
  const cartData = cartQuery.data;

  // Refetch after a row mutates its quantity / gets deleted — the SDK doesn't
  // push cart changes back into React, so item totals and the summary would
  // otherwise stay stale until a page reload.
  const refetchCart = useCallback(() => {
    if (cartId != null) {
      queryClient.invalidateQueries({ queryKey: cart.queries.detail(cartId).queryKey });
    }
  }, [cartId, queryClient]);

  // Belt-and-suspenders: also refetch on any SDK cart event that does fire.
  // Root on/off: onUpdated registers a wrapper that only offUpdated can remove.
  useEffect(() => {
    window.salla?.event?.on?.('cart::updated', refetchCart);
    return () => {
      window.salla?.event?.off?.('cart::updated', refetchCart);
    };
  }, [refetchCart]);

  // The SDK's cart id names a cart the API won't serve (purchased or deleted).
  const cartGone = isStaleCart(cartQuery.error);

  // Drop that cart from the SDK and load the visitor's current one, which also
  // updates the badges. Once per visit, so a second refusal can't loop.
  const resynced = useRef(false);
  useEffect(() => {
    if (!cartGone || resynced.current) return;
    resynced.current = true;
    void resyncSallaCart('theme::cartPage').then(() =>
      queryClient.invalidateQueries({ queryKey: cart.queries.currentId().queryKey })
    );
  }, [cartGone, queryClient]);

  // A failed request leaves its data undefined, so without this the skeleton
  // stayed up for good (e.g. `cart/<id>` answering an error).
  const failed = cartIdQuery.isError || (cartQuery.isError && !cartGone);
  // The SDK knew of no cart, or the API no longer has it.
  const noCart = (cartIdQuery.isSuccess && cartId == null) || cartGone;

  if (failed) {
    return (
      <div className="container">
        <Breadcrumb page={page} />
        <div className="no-content-placeholder">
          <i className="sicon-shopping-bag icon"></i>
          <p>{t('common.errors.error_occurred', 'Something went wrong')}</p>
          <button
            type="button"
            className="btn btn--outline-primary"
            onClick={() => {
              if (cartIdQuery.isError) cartIdQuery.refetch();
              else cartQuery.refetch();
            }}
          >
            {t('common.elements.try_again', 'Try again')}
          </button>
        </div>
      </div>
    );
  }

  if (!noCart && (cartId == null || cartData === undefined)) {
    return <CartSkeleton />;
  }

  // No cart: it was already turned into an order, shown empty like Twig.
  if (noCart || !cartData || cartData.items.length === 0) {
    return (
      <div className="container">
        <Breadcrumb page={page} />
        <NoContent
          icon="sicon-shopping-bag"
          message={t('pages.cart.empty_cart', 'Your cart is empty')}
          actionLabel={t('common.elements.back_home', 'Back to Home')}
          actionUrl="/"
        />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Analytics — no visible UI, fires GTM checkout events */}
      <SeoCartWidget cart={cartData} />

      <Breadcrumb page={page} />
      <h1 className="sr-only">{t('common.titles.cart', 'Cart')}</h1>
      <SallaConditionalOffer />

      <HookSlot name="cart:start" />

      <div className="pt-5 flex flex-col items-start lg:flex-row pb-6 lg:pb-20">
        <div className="main-content w-full lg:w-[calc(100%-384px)]">
          <HookSlot name="cart:items.start" context={{ cartItems: cartData.items }} />

          <div className="cart-titles hidden md:flex rtl:space-x-reverse md:space-x-12 items-center border-b border-gray-200 pb-4 text-sm font-bold text-gray-900 mb-5">
            <span className="flex-1">
              {t('blocks.cart.products', 'Products')} ({cartData.items.length})
            </span>
            <span className="flex gap-6 md:gap-8">
              <span className="w-[120px] text-center">
                {t('pages.products.quantity', 'Quantity')}
              </span>
              <span>{t('blocks.cart.item_total', 'Total')}</span>
              <span className="w-5" aria-hidden="true"></span>
            </span>
          </div>

          {cartData.items.map((item, index) => (
            <CartItem key={item.id} item={item} isFirst={index === 0} onMutated={refetchCart} />
          ))}

          {cartData.options?.length > 0 && (
            <div className="cart-options">
              {cartData.options.map((option) => (
                <form
                  key={option.id}
                  className="first:pt-5 relative"
                  onChange={(e) => window.salla?.form.onChange('cart.updateItem', e)}
                  id={`item-${option.id}`}
                >
                  <input type="hidden" name="id" value={option.id} />
                  <input type="hidden" name="quantity" value={option.quantity} />
                  {option.options && option.options.length > 0 && (
                    // Raw element, like CartItem: the wrapper sets `options` too late and it renders empty.
                    <salla-product-options
                      key={JSON.stringify(option.options)}
                      options={JSON.stringify(option.options)}
                      product-id={option.id}
                    />
                  )}
                </form>
              ))}
            </div>
          )}

          <SallaOffer />
          <HookSlot name="cart:items.end" />
        </div>

        <CartSummary
          cart={cartData}
          applyCouponEnabled={store.settings?.cart?.apply_coupon_enabled}
          taxAmount={cartData.tax_amount}
          key={cartData.id}
          loyalty={cartData.loyalty}
          gift={cartData.gift}
          loyaltyPoints={loyaltyPoints ?? undefined}
        />
      </div>

      <HookSlot name="cart:end" />
    </div>
  );
}

export function CartPage(props: CartPageProps) {
  return <CartPageContent {...props} />;
}
