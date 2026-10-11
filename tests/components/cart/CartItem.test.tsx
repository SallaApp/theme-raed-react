import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { CartItem as CartItemType } from '@salla.sa/twilight-theme-engine/types';
import { CartItem } from '../../../app/components/cart/CartItem';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (amount: unknown) => String(amount) }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children }: { to: string; children?: unknown }) => (
    <a href={to}>{children as never}</a>
  ),
  Image: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

const item = {
  id: 1,
  product_id: 2,
  product_name: 'Product',
  product_image: '',
  url: '/p2',
  quantity: 1,
  price: 10,
  product_price: 10,
  total: 10,
  is_available: true,
  weight_label: '2 kg',
} as unknown as CartItemType;

describe('CartItem weight', () => {
  it("labels the weight with Twig's pages.products.weight key", () => {
    render(<CartItem item={item} />);
    expect(screen.getByText(/pages\.products\.weight/)).toBeTruthy();
    expect(screen.getByText('2 kg')).toBeTruthy();
  });
});

describe('CartItem quantity', () => {
  const updateItem = vi.fn(() => Promise.resolve());
  let originalSalla: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = { cart: { updateItem } };
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as { salla?: unknown }).salla = originalSalla;
    updateItem.mockClear();
  });

  function renderWithOption(value: string) {
    const { container } = render(<CartItem item={item} />);
    const form = container.querySelector('form')!;
    const option = document.createElement('input');
    option.name = 'options[7]';
    option.required = true;
    option.value = value;
    form.appendChild(option);
    fireEvent.click(screen.getByLabelText('pages.products.quantity +'));
    act(() => void vi.advanceTimersByTime(400));
  }

  it("posts the whole item form, so the item's options go with the new quantity", () => {
    renderWithOption('Red');
    expect(updateItem).toHaveBeenCalledOnce();
    const payload = (updateItem.mock.calls[0] as unknown[])[0] as FormData;
    expect(payload.get('id')).toBe('1');
    expect(payload.get('quantity')).toBe('2');
    expect(payload.get('options[7]')).toBe('Red');
  });

  it('keeps the quantity in the item form, so an option change does not reset it to 1', () => {
    const { container } = render(<CartItem item={{ ...item, quantity: 3 }} />);
    expect(new FormData(container.querySelector('form')!).get('quantity')).toBe('3');
  });

  it('keeps the quantity and sends nothing while a required option is empty', async () => {
    renderWithOption('');
    await act(async () => {});
    expect(updateItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>('pages.products.quantity').value).toBe('1');
  });
});
