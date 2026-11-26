import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import {
  DELIVERY_PROMISE_FALLBACKS,
  DELIVERY_PROMISE_ICONS,
  type DeliveryPromise,
} from '../../lib/deliveryPromises';

/**
 * The product card's delivery promises («توصيل سريع خلال ساعتين»): one small
 * pill per promise, one per line, in the order given (fastest first).
 * Renders nothing for an empty list. Each pill sits in its own block row so it
 * follows the card's text alignment (start in RTL/LTR, centred cards stay
 * centred). Styling: `04-components/product.scss` (`.s-product-card-delivery-*`).
 */
export function DeliveryPromises({ promises }: { promises: DeliveryPromise[] }) {
  const { t } = useTranslation();
  if (!promises.length) return null;

  return (
    <div className="s-product-card-delivery-promises">
      {promises.map(({ type, label }) => (
        <div key={type}>
          <span
            className={`s-product-card-delivery-promise s-product-card-delivery-promise--${type}`}
            data-type={type}
          >
            <i className={DELIVERY_PROMISE_ICONS[type]} aria-hidden="true" />
            <span>
              {t(`blocks.product.delivery_promise.${type}`, {
                label,
                defaultValue: DELIVERY_PROMISE_FALLBACKS[type],
              })}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
