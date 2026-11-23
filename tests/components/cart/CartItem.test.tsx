import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { CartItem as CartItemType } from '@salla.sa/twilight-theme-engine/types';
import { CartItem } from '../../../app/components/cart/CartItem';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const userState = { isLoggedIn: false };
const wishlistState = { ids: [] as number[], add: vi.fn(() => Promise.resolve(true)) };

vi.mock('@salla.sa/twilight-theme-engine/hooks/useUser', () => ({
  useUser: () => userState,
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({ has: (id: number) => wishlistState.ids.includes(id), add: wishlistState.add }),
}));

vi.mock('../../../app/components/common/BottomSheet', () => ({
  BottomSheet: ({ open, onClose, children }: { open: boolean; onClose: () => void; children?: unknown }) =>
    open ? (
      <div role="dialog">
        <button onClick={onClose}>close</button>
        {children as never}
      </div>
    ) : null,
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

  const sentQuantities = () =>
    updateItem.mock.calls.map((call) => ((call as unknown[])[0] as FormData).get('quantity'));

  it('waits for a number when the box is cleared, instead of sending 1 and turning 5 into 15', async () => {
    render(<CartItem item={{ ...item, quantity: 3 }} />);
    const box = screen.getByLabelText<HTMLInputElement>('pages.products.quantity');

    fireEvent.change(box, { target: { value: '' } });
    act(() => void vi.advanceTimersByTime(400));
    expect(box.value).toBe('');
    expect(updateItem).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: '5' } });
    await act(async () => void vi.advanceTimersByTime(400));
    expect(box.value).toBe('5');
    expect(sentQuantities()).toEqual(['5']);
  });

  it('treats a lone 0 like an empty box', async () => {
    render(<CartItem item={{ ...item, quantity: 3 }} />);
    const box = screen.getByLabelText<HTMLInputElement>('pages.products.quantity');

    fireEvent.change(box, { target: { value: '0' } });
    act(() => void vi.advanceTimersByTime(400));
    expect(box.value).toBe('0');
    expect(updateItem).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: '04' } });
    await act(async () => void vi.advanceTimersByTime(400));
    expect(box.value).toBe('4');
    expect(sentQuantities()).toEqual(['4']);
  });

  it('puts the quantity back when the box is left empty', () => {
    render(<CartItem item={{ ...item, quantity: 3 }} />);
    const box = screen.getByLabelText<HTMLInputElement>('pages.products.quantity');

    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    act(() => void vi.advanceTimersByTime(400));

    expect(box.value).toBe('3');
    expect(updateItem).not.toHaveBeenCalled();
  });

  it('shows the quantity again when + is pressed on a cleared box', async () => {
    render(<CartItem item={{ ...item, quantity: 3 }} />);
    const box = screen.getByLabelText<HTMLInputElement>('pages.products.quantity');

    fireEvent.change(box, { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('pages.products.quantity +'));
    await act(async () => void vi.advanceTimersByTime(400));

    expect(box.value).toBe('4');
    expect(sentQuantities()).toEqual(['4']);
  });

  it('sends nothing when 12 is cleared one digit at a time, and puts 12 back on blur', async () => {
    render(<CartItem item={{ ...item, quantity: 12 }} />);
    const box = screen.getByLabelText<HTMLInputElement>('pages.products.quantity');

    fireEvent.change(box, { target: { value: '1' } });
    fireEvent.change(box, { target: { value: '' } });
    await act(async () => void vi.advanceTimersByTime(400));
    expect(updateItem).not.toHaveBeenCalled();

    fireEvent.blur(box);
    expect(box.value).toBe('12');
  });
});

describe('CartItem delete', () => {
  const deleteItem = vi.fn(() => Promise.resolve());
  let originalSalla: unknown;

  beforeEach(() => {
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = { cart: { deleteItem } };
  });

  afterEach(() => {
    (window as { salla?: unknown }).salla = originalSalla;
    deleteItem.mockClear();
  });

  it('refetches through onMutated after a delete, keeping the row for the refetch to drop', async () => {
    const onMutated = vi.fn();
    const { container } = render(<CartItem item={item} onMutated={onMutated} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('common.elements.remove'));
    });
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(onMutated).toHaveBeenCalledOnce();
    expect(container.querySelector('#item-1')).toBeTruthy();
  });

  it('drops its own row after a delete when nothing refetches the cart', async () => {
    const { container } = render(<CartItem item={item} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('common.elements.remove'));
    });
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(container.querySelector('#item-1')).toBeNull();
  });
});

describe('CartItem move to wishlist (logged in)', () => {
  const deleteItem = vi.fn(() => Promise.resolve());
  const updateItem = vi.fn(() => Promise.resolve());
  const success = vi.fn();
  const dispatch = vi.fn();
  let originalSalla: unknown;

  beforeEach(() => {
    userState.isLoggedIn = true;
    wishlistState.ids = [];
    wishlistState.add.mockClear();
    wishlistState.add.mockResolvedValue(true);
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = {
      cart: { deleteItem, updateItem },
      notify: { success },
      event: { dispatch },
    };
  });

  afterEach(() => {
    userState.isLoggedIn = false;
    (window as { salla?: unknown }).salla = originalSalla;
    [deleteItem, updateItem, success, dispatch].forEach((m) => m.mockClear());
  });

  const clickDelete = () => fireEvent.click(screen.getByLabelText('common.elements.remove'));

  it('asks before deleting, and deletes nothing yet', () => {
    render(<CartItem item={item} />);
    clickDelete();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(dispatch).toHaveBeenCalledWith('cart::move_to_wishlist.popup.impression', expect.objectContaining({ product_id: 2 }));
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('asks when "-" is pressed at quantity 1', () => {
    render(<CartItem item={item} />);
    fireEvent.click(screen.getByLabelText('pages.products.quantity -'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(updateItem).not.toHaveBeenCalled();
  });

  it('does not ask when "-" is pressed above quantity 1', () => {
    vi.useFakeTimers();
    render(<CartItem item={{ ...item, quantity: 2 } as CartItemType} />);
    fireEvent.click(screen.getByLabelText('pages.products.quantity -'));
    act(() => void vi.advanceTimersByTime(400));
    vi.useRealTimers();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(updateItem).toHaveBeenCalled();
  });

  it('adds to the wishlist, then removes from the cart', async () => {
    render(<CartItem item={item} />);
    clickDelete();
    await act(async () => {
      fireEvent.click(screen.getByText('pages.cart.move_to_wishlist'));
    });
    expect(wishlistState.add).toHaveBeenCalledWith(2);
    expect(success).toHaveBeenCalledWith('pages.cart.moved_to_wishlist');
    expect(deleteItem).toHaveBeenCalledWith(1);
  });

  it('skips the add when already wishlisted but still removes from the cart', async () => {
    wishlistState.ids = [2];
    render(<CartItem item={item} />);
    clickDelete();
    await act(async () => {
      fireEvent.click(screen.getByText('pages.cart.move_to_wishlist'));
    });
    expect(wishlistState.add).not.toHaveBeenCalled();
    expect(deleteItem).toHaveBeenCalledWith(1);
  });

  it('keeps the item in the cart when the wishlist add fails', async () => {
    wishlistState.add.mockResolvedValue(false);
    render(<CartItem item={item} />);
    clickDelete();
    await act(async () => {
      fireEvent.click(screen.getByText('pages.cart.move_to_wishlist'));
    });
    expect(deleteItem).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it('keeps the item when the wishlist add throws', async () => {
    wishlistState.add.mockRejectedValue(new Error('x'));
    render(<CartItem item={item} />);
    clickDelete();
    await act(async () => {
      fireEvent.click(screen.getByText('pages.cart.move_to_wishlist'));
    });
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('Remove deletes without touching the wishlist', async () => {
    render(<CartItem item={item} />);
    clickDelete();
    await act(async () => {
      fireEvent.click(screen.getByText('pages.cart.remove_item'));
    });
    expect(wishlistState.add).not.toHaveBeenCalled();
    expect(deleteItem).toHaveBeenCalledWith(1);
  });

  it('closing the popup changes nothing', () => {
    render(<CartItem item={item} />);
    clickDelete();
    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(deleteItem).not.toHaveBeenCalled();
  });
});

describe('CartItem move to wishlist — events, guests and edge cases', () => {
  const deleteItem = vi.fn(() => Promise.resolve());
  const updateItem = vi.fn(() => Promise.resolve());
  const success = vi.fn();
  const dispatch = vi.fn();
  let originalSalla: unknown;

  const setSalla = (salla: unknown) => {
    (window as { salla?: unknown }).salla = salla;
  };
  const clickRemove = () => fireEvent.click(screen.getByLabelText('common.elements.remove'));
  const clickMove = () =>
    act(async () => {
      fireEvent.click(screen.getByText('pages.cart.move_to_wishlist'));
    });
  const eventNames = () => dispatch.mock.calls.map(([name]) => name);

  beforeEach(() => {
    userState.isLoggedIn = true;
    wishlistState.ids = [];
    wishlistState.add.mockReset();
    wishlistState.add.mockResolvedValue(true);
    originalSalla = (window as { salla?: unknown }).salla;
    setSalla({ cart: { deleteItem, updateItem }, notify: { success }, event: { dispatch } });
  });

  afterEach(() => {
    userState.isLoggedIn = false;
    setSalla(originalSalla);
    [deleteItem, updateItem, success, dispatch].forEach((m) => m.mockReset());
    deleteItem.mockResolvedValue(undefined);
    updateItem.mockResolvedValue(undefined);
  });

  it('guests: remove deletes straight away with no popup and no analytics', async () => {
    userState.isLoggedIn = false;
    render(<CartItem item={item} />);
    await act(async () => {
      clickRemove();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('guests: "-" at quantity 1 stays disabled and opens nothing', () => {
    userState.isLoggedIn = false;
    render(<CartItem item={item} />);
    const minus = screen.getByLabelText<HTMLButtonElement>('pages.products.quantity -');
    expect(minus.disabled).toBe(true);
    fireEvent.click(minus);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('logged in: "-" at quantity 1 is enabled', () => {
    render(<CartItem item={item} />);
    expect(screen.getByLabelText<HTMLButtonElement>('pages.products.quantity -').disabled).toBe(false);
  });

  it('shows the title, the body and both actions', () => {
    render(<CartItem item={item} />);
    expect(screen.queryByText('pages.cart.move_to_wishlist')).toBeNull();
    clickRemove();
    expect(screen.getByText('pages.cart.move_to_wishlist')).toBeTruthy();
    expect(screen.getByText('pages.cart.remove_item')).toBeTruthy();
    expect(screen.getByText('pages.cart.remove_item_body')).toBeTruthy();
  });

  it('emits the impression once per open, on the "-" path too', () => {
    render(<CartItem item={item} />);
    fireEvent.click(screen.getByLabelText('pages.products.quantity -'));
    expect(eventNames()).toEqual(['cart::move_to_wishlist.popup.impression']);
    expect(dispatch).toHaveBeenCalledWith('cart::move_to_wishlist.popup.impression', {
      product_id: 2,
      cart_item_id: 1,
      source: 'cart_page',
    });
  });

  it('Move to Wishlist emits only the clicked event and closes the popup', async () => {
    render(<CartItem item={item} />);
    clickRemove();
    dispatch.mockClear();
    await clickMove();
    expect(eventNames()).toEqual(['cart::move_to_wishlist.clicked']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Remove emits only cart::remove.clicked, shows no toast and closes the popup', async () => {
    render(<CartItem item={item} />);
    clickRemove();
    dispatch.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText('pages.cart.remove_item'));
    });
    expect(eventNames()).toEqual(['cart::remove.clicked']);
    expect(success).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(deleteItem).toHaveBeenCalledTimes(1);
  });

  it('adds to the wishlist before it removes from the cart', async () => {
    const order: string[] = [];
    wishlistState.add.mockImplementation(async () => (order.push('add'), true));
    deleteItem.mockImplementation(async () => void order.push('delete'));
    render(<CartItem item={item} />);
    clickRemove();
    await clickMove();
    expect(order).toEqual(['add', 'delete']);
  });

  it('toasts after the add and before the cart removal', async () => {
    const order: string[] = [];
    success.mockImplementation(() => void order.push('toast'));
    deleteItem.mockImplementation(async () => void order.push('delete'));
    render(<CartItem item={item} />);
    clickRemove();
    await clickMove();
    expect(order).toEqual(['toast', 'delete']);
  });

  it('a failed add closes the popup, keeps the row and emits no remove event', async () => {
    wishlistState.add.mockResolvedValue(false);
    const { container } = render(<CartItem item={item} />);
    clickRemove();
    await clickMove();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('#item-1')).toBeTruthy();
    expect(eventNames()).not.toContain('cart::remove.clicked');
  });

  it('keeps the row when the cart removal fails after a successful add', async () => {
    deleteItem.mockRejectedValue(new Error('boom'));
    const { container } = render(<CartItem item={item} />);
    clickRemove();
    await clickMove();
    expect(wishlistState.add).toHaveBeenCalledWith(2);
    expect(container.querySelector('#item-1')).toBeTruthy();
  });

  it('refetches through onMutated after a move', async () => {
    const onMutated = vi.fn();
    render(<CartItem item={item} onMutated={onMutated} />);
    clickRemove();
    await clickMove();
    expect(onMutated).toHaveBeenCalledOnce();
  });

  it('does not throw when the analytics bus is missing', async () => {
    setSalla({ cart: { deleteItem, updateItem }, notify: { success } });
    render(<CartItem item={item} />);
    clickRemove();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await clickMove();
    expect(deleteItem).toHaveBeenCalledWith(1);
  });

  it('does not throw when the notifier is missing', async () => {
    setSalla({ cart: { deleteItem, updateItem }, event: { dispatch } });
    render(<CartItem item={item} />);
    clickRemove();
    await clickMove();
    expect(deleteItem).toHaveBeenCalledWith(1);
  });

  it('closing the popup emits no click event and leaves the wishlist alone', () => {
    render(<CartItem item={item} />);
    clickRemove();
    dispatch.mockClear();
    fireEvent.click(screen.getByText('close'));
    expect(dispatch).not.toHaveBeenCalled();
    expect(wishlistState.add).not.toHaveBeenCalled();
    expect(updateItem).not.toHaveBeenCalled();
  });

  it('can be reopened after being closed', () => {
    render(<CartItem item={item} />);
    clickRemove();
    fireEvent.click(screen.getByText('close'));
    clickRemove();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(eventNames().filter((n) => n === 'cart::move_to_wishlist.popup.impression')).toHaveLength(2);
  });
});
