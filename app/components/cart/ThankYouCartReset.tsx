import { useEffect } from 'react';
import { resyncSallaCart } from '../../lib/cartResync';

/**
 * Mounted in the `thank-you:start` slot. The cart this order came from is spent,
 * so drop it from the SDK and load the visitor's current cart. That clears the
 * header and bottom-bar badges and stops the cart page from fetching the
 * purchased cart. Renders nothing.
 */
export function ThankYouCartReset() {
  useEffect(() => {
    void resyncSallaCart('theme::thankYou');
  }, []);
  return null;
}
