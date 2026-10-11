interface WishlistHeartButtonProps {
  productId: number;
  className: string;
  ariaLabel: string;
  onClick: () => void;
}

/** `SallaButton`'s icon markup, but keeping `data-id` like Twig's `<salla-button>`: wishlist apps find the heart by it. */
export function WishlistHeartButton({
  productId,
  className,
  ariaLabel,
  onClick,
}: WishlistHeartButtonProps) {
  return (
    <div className="s-button-wrap">
      <button
        type="button"
        className={`s-button-element s-button-icon s-button-outline s-button-light-outline s-button-loader-center ${className}`}
        data-id={productId}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <span className="s-button-text">
          <i className="sicon-heart" />
        </span>
      </button>
    </div>
  );
}
