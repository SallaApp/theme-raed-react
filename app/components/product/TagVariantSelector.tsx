import { useRef, useState, type MouseEvent } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { useTagVariants } from '../../hooks/useTagVariants';
import { useProductSwitch } from './ProductSwitch';
import type { StaticVariantMatch } from '../../lib/staticVariants';
import { productPath } from '../../lib/tagVariants';

/**
 * Rows of buttons (store, denomination, payment...) that switch between
 * separate products linked by the static data (`lib/staticVariants.ts`) or by
 * `مجموعة:` tags (`lib/tagVariants.ts`).
 * Each button opens its product by id without a full reload, so the name,
 * price, image, stock and add-to-cart all follow the chosen product.
 *
 * A click selects the button at once, loads the next product (data and main
 * image) in the background and swaps the page to it in place (ProductSwitch):
 * no route change, no reload, no scroll jump. Outside the product route it
 * falls back to a router navigation.
 *
 * Renders nothing for a product in neither.
 */
export function TagVariantSelector({
  product,
  staticVariants,
}: {
  product: Product;
  staticVariants?: StaticVariantMatch | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  // The product being opened: its rows are drawn now, before it loads. The page
  // remounts per product (`key`), so this resets once the product opens.
  const [previewId, setPreviewId] = useState<number | null>(null);
  const latest = useRef(0);
  const { active, loading, rows, current: info } = useTagVariants(product, staticVariants ?? null, previewId);

  const productSwitch = useProductSwitch();

  const open = async (event: MouseEvent<HTMLAnchorElement>, id: number, to: string) => {
    // A new tab or window keeps the browser's own behaviour.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const run = ++latest.current;
    const unpin = pinOptionsOnScreen(event.currentTarget.closest('.tag-variants'));
    setPreviewId(id);
    try {
      if (productSwitch) {
        await productSwitch.open(id);
        return;
      }
    } catch {
      /* fall back to the router below */
    } finally {
      // Keep it a moment longer: the new product's layout settles after the swap.
      setTimeout(unpin, 800);
    }
    if (run !== latest.current) return;
    const options = { to, resetScroll: false } as unknown as Parameters<typeof router.navigate>[0];
    await router.navigate(options);
  };

  if (!active) return null;

  // While the group loads (and on the server), show the product's own values
  // so the customer sees what they're buying and the layout doesn't jump.
  if (loading) {
    return (
      <div className="tag-variants" aria-busy="true">
        {info?.keys.map((key) => (
          <div key={key} className="tag-variants__row">
            <p className="tag-variants__title">{key}</p>
            <div className="tag-variants__options">
              <span className="tag-variants__option is-selected">{info.values[key]}</span>
              <span className="tag-variants__option is-placeholder" aria-hidden="true" />
              <span className="tag-variants__option is-placeholder" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) return null;

  const outOfStock = t('pages.products.out_of_stock');
  const unavailable = t('blocks.product.variant_unavailable');

  return (
    <div className="tag-variants" aria-busy={previewId !== null || undefined}>
      {rows.map((row) => (
        <div key={row.key} className="tag-variants__row" role="group" aria-label={row.key}>
          <p className="tag-variants__title">{row.key}</p>
          <div className="tag-variants__options">
            {row.options.map((option) => {
              const soldOut = !!option.target?.is_out_of_stock;
              const className = `tag-variants__option${option.selected ? ' is-selected' : ''}${
                soldOut ? ' is-sold-out' : ''
              }`;
              const title = soldOut ? `${option.label} (${outOfStock})` : undefined;

              if (option.selected) {
                return (
                  <span key={option.label} className={className} aria-current="true" title={title}>
                    {option.label}
                  </span>
                );
              }
              const to = productPath(option.target?.url);
              if (!option.target || !to) {
                return (
                  <span
                    key={option.label}
                    className={`${className} is-disabled`}
                    aria-disabled="true"
                    title={`${option.label} (${unavailable})`}
                  >
                    {option.label}
                  </span>
                );
              }
              const target = option.target;
              return (
                <Link
                  key={option.label}
                  to={to}
                  preload={false}
                  className={className}
                  title={title}
                  onClick={(event) => void open(event, target.id, to)}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


let stopPinning: (() => void) | null = null;

/**
 * Keeps the option rows where they are on screen while the product changes
 * around them (the rows themselves, the name, the price and the gallery all
 * resize), so the customer's finger stays on the options. Each frame it scrolls
 * by however far the rows moved; any scrolling of the customer's own ends it.
 * Returns the function that stops it.
 */
function pinOptionsOnScreen(element: Element | null): () => void {
  stopPinning?.();
  if (!element || typeof window === 'undefined') return () => {};
  const top = element.getBoundingClientRect().top;
  let frame = 0;
  const tick = () => {
    // The page remounts per product: find the rows again each frame.
    const rows = document.querySelector('.tag-variants');
    if (rows) {
      const moved = rows.getBoundingClientRect().top - top;
      // Instant: the theme's `scroll-behavior: smooth` would turn each fix into a slow glide.
      if (Math.abs(moved) >= 1) window.scrollBy({ top: moved, behavior: 'instant' });
    }
    frame = window.requestAnimationFrame(tick);
  };
  const stop = () => {
    window.cancelAnimationFrame(frame);
    for (const type of USER_SCROLL) window.removeEventListener(type, stop);
    if (stopPinning === stop) stopPinning = null;
  };
  for (const type of USER_SCROLL) window.addEventListener(type, stop, { passive: true });
  frame = window.requestAnimationFrame(tick);
  stopPinning = stop;
  return stop;
}

const USER_SCROLL = ['wheel', 'touchmove', 'keydown'] as const;
