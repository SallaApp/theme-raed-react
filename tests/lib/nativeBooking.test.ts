import { describe, it, expect, vi, afterEach } from 'vitest';
import { openNativeBooking } from '../../app/lib/nativeBooking';

const bookingUrl = 'https://store.test/booking/123';

function installSalla({ guest = false, add = vi.fn() } = {}) {
  const dispatch = vi.fn();
  const setAfterLoginEvent = vi.fn();
  (window as unknown as { salla: unknown }).salla = {
    mobile: { isEnabled: () => true },
    config: { isGuest: () => guest },
    auth: { api: { setAfterLoginEvent } },
    booking: { add },
    event: { dispatch },
  };
  return { dispatch, setAfterLoginEvent, add };
}

function button() {
  return {
    host: document.createElement('salla-add-product-button'),
    productId: 7,
    productType: 'booking',
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
