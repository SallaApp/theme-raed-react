import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import type { Money } from '@salla.sa/twilight-theme-engine/types';

interface ToastProduct {
  id: number;
  name: string;
  image: string;
  price: number | Money;
  originalPrice?: number | Money;
  hasDiscount?: boolean;
  isOnSale?: boolean;
  quantity: number;
  url: string;
  options: Array<{ name: string; value: string; hideValue?: boolean }>;
}

interface ProductAddedEntry {
  id?: string | number;
  cart_item_id?: string | number;
}

interface AddItemResponse {
  data?: {
    cart?: { items?: Array<{ id: string | number; product_id?: string | number }> };
    events?: { 'twilight::api'?: { events?: { 'Product Added'?: ProductAddedEntry[] } } };
  };
}

interface CartOptionDetail {
  name: string;
  is_selected: boolean;
}

interface CartOption {
  type: string;
  name: string;
  details?: CartOptionDetail[];
  value?: string;
}

interface CartItemWithOptions {
  id: string | number;
  product_id: number;
  product_name: string;
  product_image: string;
  url: string;
  quantity: number;
  price: number | Money;
  original_price?: number | Money;
  total: number | Money;
  has_discount?: boolean;
  is_on_sale?: boolean;
  options?: CartOption[];
}

interface CartDetailsResponse {
  data?: {
    cart?: {
      items?: CartItemWithOptions[];
    };
  };
}

const TOAST_DURATION = 5000;
const UPDATE_INTERVAL = 50;
const EMPTY_OPTIONS: ToastProduct['options'] = [];

function extractOptions(options: CartOption[] | undefined): ToastProduct['options'] {
  if (!options?.length) return EMPTY_OPTIONS;

  return options.reduce<ToastProduct['options']>((result, option) => {
    if (option.type === 'splitter') return result;

    if (option.details?.length) {
      const selected = option.details.filter((d: CartOptionDetail) => d.is_selected);

      if (selected.length > 0) {
        result.push({
          name: option.name,
          value: selected.map((d: CartOptionDetail) => d.name).join(', '),
        });
      }
    } else if (option.value) {
      const hideValue = ['image', 'file', 'map'].includes(option.type);
      result.push({ name: option.name, value: option.value, hideValue });
    }

    return result;
  }, []);
}

export function AddProductToast() {
  const { t, isRTL } = useTranslation();
  const { format } = useMoney();

  const [product, setProduct] = useState<ToastProduct | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingTimeRef = useRef(TOAST_DURATION);

  const clearTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setIsVisible(false);
    setTimeout(() => setProduct(null), 300);
  }, [clearTimers]);

  const startAutoHideTimer = useCallback(() => {
    clearTimers();
    setIsPaused(false);
    remainingTimeRef.current = TOAST_DURATION;
    setProgressPercent(100);

    progressIntervalRef.current = setInterval(() => {
      if (isPaused) return;

      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - UPDATE_INTERVAL);
      const newProgress = (remainingTimeRef.current / TOAST_DURATION) * 100;
      setProgressPercent(newProgress);

      if (remainingTimeRef.current <= 0) {
        close();
      }
    }, UPDATE_INTERVAL);
  }, [isPaused, clearTimers, close]);

  const handleProductAdded = useCallback(
    async (cartItemId: string | number | undefined, productId: string) => {
      try {
        const salla = window.salla as {
          cart?: {
            api?: {
              details?: (id?: null, include?: string[]) => Promise<CartDetailsResponse>;
            };
          };
        };

        const cartResponse = await salla?.cart?.api?.details?.(null, ['options']);
        const cartItem = cartItemId
          ? cartResponse?.data?.cart?.items?.find((item) => String(item.id) === String(cartItemId))
          : cartResponse?.data?.cart?.items
              ?.filter((item) => String(item.product_id) === productId)
              .at(-1);
        if (!cartItem) return;

        const toastProduct: ToastProduct = {
          id: cartItem.product_id,
          name: cartItem.product_name,
          image: cartItem.product_image,
          price: cartItem.total,
          originalPrice: cartItem.original_price
            ? typeof cartItem.original_price === 'number'
              ? cartItem.original_price * cartItem.quantity
              : cartItem.original_price
            : undefined,
          hasDiscount: cartItem.has_discount,
          isOnSale: cartItem.is_on_sale,
          quantity: cartItem.quantity,
          url: cartItem.url,
          options: extractOptions(cartItem.options),
        };

        setProduct(toastProduct);
        setIsVisible(true);
        startAutoHideTimer();
      } catch (error) {
        (window.salla as { log?: (msg: string, err?: unknown) => void })?.log?.(
          'Error processing product added event:',
          error
        );
      }
    },
    [startAutoHideTimer]
  );

  // Latest handler, so the one-shot registration below can stay stable.
  const handlerRef = useRef(handleProductAdded);
  useEffect(() => {
    handlerRef.current = handleProductAdded;
  }, [handleProductAdded]);

  // `Product Added` lists every cart line; `cart::item.added` names the product that was added.
  useEffect(() => {
    type EventBus = {
      on?: (name: string, cb: (...args: unknown[]) => void) => void;
      off?: (name: string, cb: (...args: unknown[]) => void) => void;
    };
    // The emitter the listeners were added to. Cleanup removes them from this
    // one, not from whatever `window.salla.event` is by then — after an SDK
    // re-init a fresh lookup would `off` a different emitter and leave these bound.
    let boundTo: EventBus | undefined;
    let cancelled = false;

    // Named (not inline) so cleanup can `off` it, otherwise a remount / HMR leaves it bound.
    const onItemAdded = (...args: unknown[]) => {
      const [response, addedId] = args as [AddItemResponse | undefined, unknown];
      if (addedId == null) return;
      const productId = String(addedId);
      const entry = response?.data?.events?.['twilight::api']?.events?.['Product Added']
        ?.filter((item) => String(item.id) === productId)
        .at(-1);
      const line = response?.data?.cart?.items
        ?.filter((item) => String(item.product_id) === productId)
        .at(-1);
      void handlerRef.current(entry?.cart_item_id ?? line?.id, productId);
    };

    const bus = (): EventBus | undefined => (window.salla as { event?: EventBus })?.event;

    const bind = () => {
      if (boundTo || cancelled) return;
      const event = bus();
      if (!event?.on) return;
      boundTo = event;
      boundTo.on?.('cart::item.added', onItemAdded);
    };

    bind();
    document.addEventListener('theme::ready', bind);
    void (window.salla as { onReady?: () => Promise<unknown> })?.onReady?.().then(bind);

    return () => {
      cancelled = true;
      document.removeEventListener('theme::ready', bind);
      boundTo?.off?.('cart::item.added', onItemAdded);
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (isPaused && progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    } else if (!isPaused && isVisible && !progressIntervalRef.current) {
      progressIntervalRef.current = setInterval(() => {
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - UPDATE_INTERVAL);
        const newProgress = (remainingTimeRef.current / TOAST_DURATION) * 100;
        setProgressPercent(newProgress);

        if (remainingTimeRef.current <= 0) {
          close();
        }
      }, UPDATE_INTERVAL);
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isPaused, isVisible, close]);

  const handleCheckout = useCallback(() => {
    const salla = window.salla as { cart?: { submit?: () => void } };
    salla?.cart?.submit?.();
    close();
  }, [close]);

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  if (!isVisible || !product) {
    return null;
  }

  const visibleOptions = product.options.slice(0, 3);
  const showMoreButton = product.options.length > 3;
  const salla = window.salla as {
    url?: {
      get?: (key: string) => string | undefined;
      asset?: (path: string) => string | undefined;
    };
  };
  const cartUrl = salla?.url?.get?.('cart') || '/cart';
  const checkIconUrl = salla?.url?.asset?.('images/check.svg') || '/images/check.svg';

  const formatMoney = (value: number | Money): React.ReactNode => {
    return typeof value === 'object' && value.formatted
      ? value.formatted
      : format(typeof value === 'object' ? value.amount : value);
  };

  const priceDisplay = formatMoney(product.price);
  const originalPriceDisplay = product.originalPrice ? formatMoney(product.originalPrice) : null;

  return (
    <div
      className={`s-add-product-toast ${isVisible ? 's-add-product-toast--visible' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="s-add-product-toast__progress">
        <div
          className="s-add-product-toast__progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="s-add-product-toast__header">
        <div className="s-add-product-toast__header-content">
          <img
            src={checkIconUrl}
            alt="Success"
            width={16}
            height={16}
            className="s-add-product-toast__icon"
          />
          <span className="s-add-product-toast__title">
            {t('pages.cart.added_to_cart', 'Added to Cart')}
          </span>
        </div>
        <button
          type="button"
          className="s-add-product-toast__close"
          aria-label="Close"
          onClick={close}
        >
          <i className="sicon-cancel" />
        </button>
      </div>

      <div className="s-add-product-toast__divider" />

      <div className="s-add-product-toast__body">
        <Link to={product.url} className="s-add-product-toast__image" onClick={close}>
          <img src={product.image} alt={product.name} loading="lazy" />
        </Link>
        <div className="s-add-product-toast__details">
          <Link to={product.url} className="s-add-product-toast__name" onClick={close}>
            {product.name}
          </Link>
          {visibleOptions.length > 0 && (
            <div className="s-add-product-toast__options">
              {visibleOptions.map((opt, idx) => (
                <span key={idx}>{opt.hideValue ? opt.name : `${opt.name}: ${opt.value}`}</span>
              ))}
              {showMoreButton && (
                <Link to={cartUrl} className="s-add-product-toast__show-more" onClick={close}>
                  {t('pages.checkout.show_more', 'Show more')}
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="s-add-product-toast__price">
          {(product.hasDiscount || product.isOnSale) && originalPriceDisplay ? (
            <>
              <div className="s-add-product-toast__price-sale">{priceDisplay}</div>
              <div className="s-add-product-toast__price-original">{originalPriceDisplay}</div>
            </>
          ) : (
            <div>{priceDisplay}</div>
          )}
        </div>
      </div>

      <div className="s-add-product-toast__actions">
        <button
          type="button"
          className="s-add-product-toast__button s-add-product-toast__button--primary"
          onClick={handleCheckout}
        >
          <span>{t('pages.cart.complete_order', 'Complete Order')}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 12C2 8.46252 2 6.69377 3.0528 5.5129C3.22119 5.32403 3.40678 5.14935 3.60746 4.99087C4.86213 4 6.74142 4 10.5 4H13.5C17.2586 4 19.1379 4 20.3925 4.99087C20.5932 5.14935 20.7788 5.32403 20.9472 5.5129C22 6.69377 22 8.46252 22 12C22 15.5375 22 17.3062 20.9472 18.4871C20.7788 18.676 20.5932 18.8506 20.3925 19.0091C19.1379 20 17.2586 20 13.5 20H10.5C6.74142 20 4.86213 20 3.60746 19.0091C3.40678 18.8506 3.22119 18.676 3.0528 18.4871C2 17.3062 2 15.5375 2 12Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 16H11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14.5 16L18 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M2 9H22" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </button>
        <Link
          to={cartUrl}
          className="s-add-product-toast__button s-add-product-toast__button--outline"
          onClick={close}
        >
          <span>{t('pages.cart.view_cart', 'View Cart')}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3.06164 14.4413L3.42688 12.2985C3.85856 9.76583 4.0744 8.49951 4.92914 7.74975C5.78389 7 7.01171 7 9.46734 7H14.5327C16.9883 7 18.2161 7 19.0709 7.74975C19.9256 8.49951 20.1414 9.76583 20.5731 12.2985L20.9384 14.4413C21.5357 17.946 21.8344 19.6983 20.9147 20.8491C19.995 22 18.2959 22 14.8979 22H9.1021C5.70406 22 4.00504 22 3.08533 20.8491C2.16562 19.6983 2.4643 17.946 3.06164 14.4413Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M7.5 9L7.71501 5.98983C7.87559 3.74176 9.7462 2 12 2C14.2538 2 16.1244 3.74176 16.285 5.98983L16.5 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
