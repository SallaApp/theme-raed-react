import { isNativeApp } from '@salla.sa/twilight-theme-engine/native-app';
import { whenSallaLoaded } from '@salla.sa/twilight-theme-engine/utils';

interface BookingResponse {
  data?: { redirect?: { to?: string; url?: string } };
}

interface SallaBookingSdk {
  booking?: { add?: (productId: unknown, redirect?: boolean) => Promise<BookingResponse> };
  config?: { isGuest?: () => boolean };
  auth?: { api?: { setAfterLoginEvent?: (event: string, data: unknown) => void } };
  event?: { dispatch?: (name: string, data?: unknown) => void };
}

/** The `<salla-add-product-button>` instance the SDK hands a `componentDidLoad` hook. */
interface AddProductButton {
  host: HTMLElement;
  productId?: unknown;
  productType?: string;
  addBookingProduct: () => unknown;
  success?: { emit: (data: unknown) => void };
  failed?: { emit: (error: unknown) => void };
}

/**
 * Asks the Salla app to open the booking page (`mobile::booking.open`) with its url
 * instead of the web page loading inside the app. Mirrors the button's own
 * `addBookingProduct`, but calls `salla.booking.add` without its redirect.
 */
export async function openNativeBooking(button: AddProductButton): Promise<void> {
  const salla = window.salla as unknown as SallaBookingSdk | undefined;
  if (salla?.config?.isGuest?.()) {
    salla.auth?.api?.setAfterLoginEvent?.('booking::add', button.productId);
    salla.event?.dispatch?.('login::open');
    return;
  }
  try {
    const response = await salla?.booking?.add?.(button.productId, false);
    const redirect = response?.data?.redirect;
    if (redirect?.to === 'booking' && redirect.url) {
      salla?.event?.dispatch?.('mobile::booking.open', { url: redirect.url });
    }
    button.success?.emit(response);
  } catch (error) {
    button.failed?.emit(error);
  }
}

let registered = false;

/**
 * Inside the Salla app, a product card's "Book now" button hands the booking page
 * to the app (see {@link openNativeBooking}). Outside the app, and for the product
 * page's own button, the button keeps opening the booking page itself.
 */
export function registerNativeBookingHook(): void {
  if (registered) return;
  registered = true;
  whenSallaLoaded((sdk) => {
    sdk.hooks?.registerHook?.('salla-add-product-button', 'componentDidLoad', (button: AddProductButton) => {
      if (button.productType !== 'booking' || !button.host?.closest('.s-product-card-entry')) return;
      const addBookingProduct = button.addBookingProduct;
      button.addBookingProduct = () =>
        isNativeApp() ? openNativeBooking(button) : addBookingProduct.call(button);
    });
  });
}
