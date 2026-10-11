import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { ProductCard as EngineProductCard } from '@salla.sa/twilight-theme-engine/product';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { WishlistHeartButton } from './WishlistHeartButton';

type ProductCardProps = ComponentProps<typeof EngineProductCard>;

/**
 * Thin wrapper over the engine `ProductCard`.
 *
 * After mount (and whenever the lazily-hydrated bits appear):
 *  - marks a vertical card with `is-theme-card`, sets `display: none` inline
 *    on the engine's own image-corner wishlist button (a plain style mutation
 *    on an existing node — safe, unlike moving it; see below), and portals a
 *    theme-owned wishlist button into `.s-product-card-content-footer`
 *    instead. Hiding it inline rather than through `04-components/product.scss`
 *    keeps this component correct on its own — that stylesheet's `is-theme-card`
 *    rule still applies too once it lands, redundantly.
 *  - The engine's button is a React-owned node; physically moving it there
 *    with `appendChild` (the previous approach) left React still tracking it
 *    as a child of the image container, so on unmount (e.g. navigating away)
 *    React tried to `removeChild` it from a parent it was no longer inside,
 *    throwing `NotFoundError`. A portal keeps this button fully React-managed
 *    at its real DOM location instead.
 *  - sets `loader-position="center"` on the add-to-cart button (grid + list).
 * Styling: `04-components/product.scss`.
 */
export function ProductCard(props: ProductCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const sync = () => {
      root.querySelectorAll<HTMLElement>('salla-add-product-button').forEach((el) => {
        // engine ships the card button fill="outline"; make it solid + centre its spinner
        el.setAttribute('fill', 'solid');
        el.setAttribute('loader-position', 'center');
      });

      const vertical = root.querySelector<HTMLElement>('.s-product-card-vertical');
      if (!vertical) return;

      vertical.classList.add('is-theme-card');

      const originalWishlistBtn = vertical.querySelector<HTMLElement>(
        '.s-product-card-image .s-product-card-wishlist-btn'
      );
      if (originalWishlistBtn) originalWishlistBtn.style.display = 'none';

      setFooterEl(vertical.querySelector<HTMLElement>('.s-product-card-content-footer'));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: 'contents' }}>
      <EngineProductCard {...props} />
      {footerEl &&
        createPortal(
          // List responses send the id as a numeric string; the wishlist holds numbers.
          <FooterWishlistButton productId={Number(props.product.id)} />,
          footerEl
        )}
    </div>
  );
}

/** Same button the engine renders for `horizontal`/`fullImage` layouts
 * (`ProductCardContent`, theme-engine) — reused here for `vertical`, which
 * the engine only ever places in the image corner. */
function FooterWishlistButton({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const wishlist = useWishlist();
  const inWishlist = wishlist.has(productId);

  return (
    <WishlistHeartButton
      productId={productId}
      ariaLabel={t('pages.wishlist.toggle', 'Add or remove to wishlist')}
      className={`s-product-card-wishlist-btn animated ${inWishlist ? 's-product-card-wishlist-added pulse-anime' : 'not-added un-favorited'}`}
      onClick={() => wishlist.toggle(productId)}
    />
  );
}
