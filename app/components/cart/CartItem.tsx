import { useCallback, useEffect, useRef, useState } from 'react';
import type { Money, CartItem as CartItemType } from '@salla.sa/twilight-theme-engine/types';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { SallaCartItemOffers } from '@salla.sa/twilight-components-react/cart-item-offers';
import { Delete01Icon, MinusIcon, PlusIcon } from '../icons';

interface CartItemProps {
  item: CartItemType;
  isFirst?: boolean;
  /** Called after a successful quantity change / delete so the page can refetch. */
  onMutated?: () => void;
}

/**
 * Theme fork of the engine `CartItem`.
 *
 * Differences from upstream:
 *  - flat row (border-separated) instead of a padded `bg-white` card;
 *  - the "Total:" label is dropped (the cart-page column heading covers it);
 *  - the delete control is a plain trash icon at the row end, not a red icon
 *    button in the corner.
 * Upgrade notes: `FORKS.md`.
 */
function toNumber(value: number | Money | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return value.amount;
}

function moneyCurrency(value: number | Money | undefined): string | undefined {
  if (typeof value !== 'object') return undefined;
  return value.currency;
}

/**
 * Plain-React quantity stepper — the `<salla-quantity-input>` web component
 * (deferred or Core) either stuck on its skeleton or never wired its buttons
 * here, so the pill (`.s-quantity-input-*`, styled in `quantity-stepper.scss`)
 * is rebuilt in React and the change is pushed straight to `salla.cart`.
 */
function CartQuantity({
  value,
  max,
  label,
  disabled = false,
  onChange,
}: {
  value: number;
  max?: number;
  label: string;
  /** Row is being removed — freeze the stepper and drop any pending commit. */
  disabled?: boolean;
  onChange: (quantity: number) => Promise<void>;
}) {
  const [qty, setQty] = useState(value);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // follow a server-corrected quantity on refetch, but not while the user is
  // mid-edit (a stale refetch would otherwise snap the number back)
  useEffect(() => {
    if (!pending.current) setQty(value);
  }, [value]);

  // Never let a debounced commit fire after the row is gone (deleted mid-edit)
  // or once it's being deleted — it would `updateItem` a stale / removed id.
  useEffect(() => {
    if (disabled) {
      clearTimeout(timer.current);
      pending.current = false;
    }
  }, [disabled]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.max(1, max ? Math.min(next, max) : next);
      setQty(clamped);
      pending.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        pending.current = false;
        // Revert to the server-confirmed `value`, not the locally-optimistic
        // chain — a failed update never changes it, and mid-burst edits (e.g.
        // 3 -> 4 before 2 -> 3 ever committed) would otherwise roll back to
        // an unconfirmed intermediate quantity instead of the real one.
        onChange(clamped).catch(() => setQty(value));
      }, 350);
    },
    [max, onChange, value]
  );

  return (
    <div className="s-quantity-input">
      <div className="s-quantity-input-container">
        <button
          type="button"
          className="s-quantity-input-increase-button s-quantity-input-button"
          aria-label={`${label} +`}
          disabled={disabled || (!!max && qty >= max)}
          onClick={() => commit(qty + 1)}
        >
          <PlusIcon aria-hidden="true" />
        </button>
        <input
          className="s-quantity-input-input"
          name="quantity"
          inputMode="numeric"
          aria-label={label}
          value={qty}
          disabled={disabled}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
            commit(Number.isFinite(n) ? n : 1);
          }}
        />
        <button
          type="button"
          className="s-quantity-input-decrease-button s-quantity-input-button"
          aria-label={`${label} -`}
          disabled={disabled || qty <= 1}
          onClick={() => commit(qty - 1)}
        >
          <MinusIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Name + price/offer badges + weight — the left column's text block. */
function CartItemInfo({ item }: { item: CartItemType }) {
  const { t } = useTranslation();
  const { format } = useMoney();

  return (
    <div className="space-y-1">
      <div className="text-gray-900 leading-6 text-lg font-bold">
        <Link to={item.url} className="text-base">
          {item.product_name}
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {item.offer && (
          <span className="text-sm text-gray-500 line-through item-regular-price">
            {format(toNumber(item.product_price), {
              currency: moneyCurrency(item.product_price),
            })}
          </span>
        )}

        {item.is_on_sale && (
          <span className="inline-flex gap-1 leading-4 text-sm text-gray-500 line-through item-original-price">
            {format(toNumber(item.original_price), {
              currency: moneyCurrency(item.original_price),
            })}
          </span>
        )}

        <span
          className={`inline-flex gap-1 leading-4 item-price ${item.has_discount ? 'text-red-800' : 'text-sm text-gray-500'}`}
        >
          {format(toNumber(item.price), { currency: moneyCurrency(item.price) })}
        </span>
      </div>

      {item.weight_label && (
        <p className="text-sm text-gray-500">
          {t('pages.products.weight')}: <span>{item.weight_label}</span>
        </p>
      )}

      {item.offer && !item.detailed_offers?.length && (
        <span className="old-offers flex items-center gap-1 mx-1.5">
          <i className="sicon-discount-calculator text-gray-500 offer-icon"></i>
          <span className="text-sm text-gray-500 offer-name">{item.offer.names}</span>
        </span>
      )}

      {item.detailed_offers && item.detailed_offers.length > 0 && (
        <SallaCartItemOffers
          quantity={item.quantity}
          itemId={String(item.id) as never}
          productPrice={toNumber(item.product_price) ?? 0}
          offers={JSON.stringify(item.detailed_offers)}
        />
      )}
    </div>
  );
}

/** Donating rows have no control; hidden-quantity rows show a static number;
 * everything else gets the stepper. */
function CartItemQuantity({
  item,
  disabled,
  onChange,
}: {
  item: CartItemType;
  disabled: boolean;
  onChange: (quantity: number) => Promise<void>;
}) {
  const { t } = useTranslation();

  if (item.type === 'donating') return <span></span>;

  if (item.is_hidden_quantity) {
    return (
      <>
        <input
          type="hidden"
          value={item.quantity}
          name="quantity"
          aria-label={t('pages.products.quantity', 'Quantity')}
        />
        <span className="w-10 text-center">{item.quantity}</span>
      </>
    );
  }

  return (
    <CartQuantity
      value={item.quantity}
      max={item.max_quantity ?? undefined}
      label={t('pages.products.quantity', 'Quantity')}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

/** Out of stock beats any price; offers use their own special total. */
function cartItemTotalLabel(
  item: CartItemType,
  format: ReturnType<typeof useMoney>['format'],
  t: ReturnType<typeof useTranslation>['t']
) {
  if (!item.is_available) return t('pages.products.out_of_stock', 'Out of Stock');
  return item.detailed_offers?.length
    ? format(toNumber(item.total_special_price), {
        currency: moneyCurrency(item.total_special_price),
      })
    : format(toNumber(item.total), { currency: moneyCurrency(item.total) });
}

export function CartItem({ item, isFirst = false, onMutated }: CartItemProps) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const [deleting, setDeleting] = useState(false);
  // Belt-and-suspenders against `CartQuantity`'s debounced commit: it cancels
  // its pending timer once `disabled` propagates, but that's a render away —
  // a delete within the 350ms debounce window could otherwise still fire a
  // stale `updateItem` for an id that's already gone. Set synchronously in
  // `handleDelete`, before the delete request even starts.
  const deletingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const changeQuantity = useCallback(
    async (quantity: number) => {
      if (deletingRef.current) return;
      const form = formRef.current;
      // Like Twig, post the whole item form: the API rejects a quantity without the item's options.
      if (form && !form.reportValidity()) throw new Error('Required options are missing');
      const payload = form ? new FormData(form) : undefined;
      payload?.set('quantity', String(quantity));
      // Refetch only on success — on rejection the caller reverts the
      // optimistic quantity locally instead (server state didn't change).
      await window.salla?.cart.updateItem(payload ?? { id: item.id, quantity });
      onMutated?.();
    },
    [item.id, onMutated]
  );

  // Only the item's product-options run through the SDK form handler; the
  // quantity stepper posts to `salla.cart` itself (above).
  const handleChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    if (!(e.target as HTMLElement)?.closest?.('salla-product-options')) return;
    window.salla?.form.onChange('cart.updateItem', e);
    window.setTimeout(() => onMutated?.(), 800);
  };

  const handleDelete = async () => {
    if (deleting) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await window.salla?.cart.deleteItem(item.id);
      // Prefer a refetch (also refreshes the summary); fall back to yanking the row.
      if (onMutated) onMutated();
      else document.querySelector(`#item-${item.id}`)?.remove();
    } catch {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const isFreeProduct = toNumber(item.price) === 0 && item.has_discount;

  return (
    <form ref={formRef} onChange={handleChange} id={`item-${item.id}`}>
      <section className="cart-item relative border-b border-gray-200 pb-6 mb-6">
        <input type="hidden" name="id" value={item.id} />

        <div className="md:flex rtl:space-x-reverse md:space-x-12 items-start justify-between mb-4 last:mb-0">
          <div className="flex flex-1 rtl:space-x-reverse space-x-4">
            <Link to={item.url} className="relative overflow-hidden shrink-0">
              <Image
                src={item.product_image}
                alt={item.product_name}
                className="flex-none w-24 h-20 object-center object-cover"
                aspectRatio="6/5"
                priority={isFirst}
              />

              {isFreeProduct && (
                <div className="free-ribbon absolute top-[11px] right-[-38px] w-32 bg-red-600 text-white text-xs font-bold text-center py-1 rotate-45 shadow-md">
                  {t('pages.loyalty_program.free_product', 'Free')}
                </div>
              )}
            </Link>

            <CartItemInfo item={item} />
          </div>

          <div className="cart-item__controls mt-5 md:mt-0 flex gap-6 md:gap-8 justify-between items-center md:items-start">
            <CartItemQuantity item={item} disabled={deleting} onChange={changeQuantity} />

            <p className="flex-none font-bold">
              {/* label shows on mobile only — desktop has the column heading */}
              <span className="md:hidden">{t('blocks.cart.item_total', 'Total')}: </span>
              <span className="inline-block item-total">{cartItemTotalLabel(item, format, t)}</span>
            </p>

            <button
              type="button"
              className="cart-item__delete shrink-0 text-gray-400 transition-colors hover:text-red-600"
              aria-label={t('common.elements.remove', 'Remove from the cart')}
              aria-busy={deleting}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <span className="cart-item__delete-spinner" aria-hidden="true" />
              ) : (
                <Delete01Icon aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {item.options && item.options.length > 0 && (
          // Raw element, not the React wrapper: the wrapper assigns `options` after the
          // element's constructor has run, so it falls back to fetching the product's
          // default options (nothing selected) instead of showing the cart item's
          // selection. As an attribute it is set before connect. The element also
          // parses `options` once, so key on the data to remount when it changes.
          <salla-product-options
            key={JSON.stringify(item.options)}
            options={JSON.stringify(item.options)}
            product-id={item.product_id}
          />
        )}
      </section>
    </form>
  );
}
