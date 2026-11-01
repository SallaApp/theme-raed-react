interface WishlistHeartButtonProps {
  productId: number;
  className: string;
  ariaLabel: string;
  /** Whether the product is in the wishlist; screen readers hear it as the button's pressed state. */
  pressed: boolean;
  onClick: () => void;
}

/** `SallaButton`'s icon markup, but keeping `data-id` like Twig's `<salla-button>`: wishlist apps find the heart by it. */
export function WishlistHeartButton({
  productId,
  className,
  ariaLabel,
  pressed,
  onClick,
}: WishlistHeartButtonProps) {
  return (
    <div className="s-button-wrap">
      <button
        type="button"
        className={`s-button-element s-button-icon s-button-outline s-button-light-outline s-button-loader-center ${className}`}
        data-id={productId}
        aria-label={ariaLabel}
        aria-pressed={pressed}
        onClick={onClick}
      >
        <span className="s-button-text">
          <i className="sicon-heart" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
