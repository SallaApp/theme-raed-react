import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { openNativeBooking } from '../../app/lib/nativeBooking';

const bookingUrl = 'https://store.test/booking/123';

type HookCallback = (button: ReturnType<typeof button>) => void;

function installSalla({ guest = false, add = vi.fn(), inApp = true } = {}) {
  const dispatch = vi.fn();
  const setAfterLoginEvent = vi.fn();
  const registerHook = vi.fn<(tag: string, hook: string, callback: HookCallback) => void>();
  (window as unknown as { salla: unknown }).salla = {
    init: () => {},
    hooks: { registerHook },
    mobile: { isEnabled: () => inApp },
    config: { isGuest: () => guest },
    auth: { api: { setAfterLoginEvent } },
    booking: { add },
    event: { dispatch },
  };
  return { dispatch, setAfterLoginEvent, add, registerHook };
}

function button({ inCard = true, productType = 'booking' } = {}) {
  const host = document.createElement('salla-add-product-button');
  if (inCard) {
    const card = document.createElement('div');
    card.className = 's-product-card-entry';
    card.appendChild(host);
  }
  return {
    host,
    productId: 7,
    productType,
    addBookingProduct: vi.fn(),
    success: { emit: vi.fn() },
    failed: { emit: vi.fn() },
  };
}

afterEach(() => {
  delete (window as unknown as { salla?: unknown }).salla;
});

describe('openNativeBooking', () => {
  it('books without the web redirect and hands the booking page to the app', async () => {
    const response = { data: { redirect: { to: 'booking', url: bookingUrl } } };
    const { dispatch, add } = installSalla({ add: vi.fn().mockResolvedValue(response) });
    const btn = button();
    await openNativeBooking(btn);
    expect(add).toHaveBeenCalledWith(7, false);
    expect(dispatch).toHaveBeenCalledWith('mobile::booking.open', { url: bookingUrl });
    expect(btn.success.emit).toHaveBeenCalledWith(response);
  });

  it('asks a guest to log in first', async () => {
    const { dispatch, setAfterLoginEvent, add } = installSalla({ guest: true });
    await openNativeBooking(button());
    expect(setAfterLoginEvent).toHaveBeenCalledWith('booking::add', 7);
    expect(dispatch).toHaveBeenCalledWith('login::open');
    expect(add).not.toHaveBeenCalled();
  });

  it('reports a failed booking on the button', async () => {
    const error = new Error('nope');
    const { dispatch } = installSalla({ add: vi.fn().mockRejectedValue(error) });
    const btn = button();
    await openNativeBooking(btn);
    expect(btn.failed.emit).toHaveBeenCalledWith(error);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('registerNativeBookingHook', () => {
  const booked = { data: { redirect: { to: 'booking', url: bookingUrl } } };

  // `registered` is module state; a fresh module per test registers again.
  beforeEach(() => vi.resetModules());

  async function register(options: Parameters<typeof installSalla>[0] = {}) {
    const salla = installSalla({ add: vi.fn().mockResolvedValue(booked), ...options });
    const { registerNativeBookingHook } = await import('../../app/lib/nativeBooking');
    registerNativeBookingHook();
    const loaded = (btn: ReturnType<typeof button>) => {
      for (const [, , callback] of salla.registerHook.mock.calls) callback(btn);
      return btn;
    };
    return { ...salla, registerNativeBookingHook, loaded };
  }

  it("hooks every salla-add-product-button's componentDidLoad once", async () => {
    const { registerHook, registerNativeBookingHook } = await register();
    registerNativeBookingHook();
    expect(registerHook).toHaveBeenCalledTimes(1);
    expect(registerHook).toHaveBeenCalledWith(
      'salla-add-product-button',
      'componentDidLoad',
      expect.any(Function)
    );
  });

  it("makes a card's Book now open the booking page in the app", async () => {
    const { loaded, dispatch, add } = await register();
    const btn = button();
    const original = btn.addBookingProduct;
    await loaded(btn).addBookingProduct();
    expect(add).toHaveBeenCalledWith(7, false);
    expect(dispatch).toHaveBeenCalledWith('mobile::booking.open', { url: bookingUrl });
    expect(original).not.toHaveBeenCalled();
  });

  it("keeps a card's own booking flow in a browser", async () => {
    const { loaded, dispatch, add } = await register({ inApp: false });
    const btn = button();
    const original = btn.addBookingProduct;
    await loaded(btn).addBookingProduct();
    expect(original).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("leaves the product page's button and non-booking products alone", async () => {
    const { loaded } = await register();
    const pageButton = button({ inCard: false });
    const cartButton = button({ productType: 'product' });
    const pageOriginal = pageButton.addBookingProduct;
    const cartOriginal = cartButton.addBookingProduct;
    loaded(pageButton);
    loaded(cartButton);
    expect(pageButton.addBookingProduct).toBe(pageOriginal);
    expect(cartButton.addBookingProduct).toBe(cartOriginal);
  });
});
