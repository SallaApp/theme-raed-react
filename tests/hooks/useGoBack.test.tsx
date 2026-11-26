import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGoBack } from '../../app/hooks/useGoBack';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useNavigate: () => navigate,
}));

const historyLength = (length: number) =>
  vi.spyOn(History.prototype, 'length', 'get').mockReturnValue(length);

afterEach(() => {
  vi.restoreAllMocks();
  navigate.mockClear();
});

describe('useGoBack', () => {
  it('goes back a page when the tab has one', () => {
    historyLength(3);
    const back = vi.spyOn(History.prototype, 'back').mockImplementation(() => undefined);
    renderHook(() => useGoBack()).result.current();
    expect(back).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("goes to the store's home through the router when the tab has no history, e.g. a shared link", () => {
    historyLength(1);
    const back = vi.spyOn(History.prototype, 'back').mockImplementation(() => undefined);
    renderHook(() => useGoBack()).result.current();
    // The engine's navigate adds the shopper's language (`/en`) and the store's base path.
    expect(navigate).toHaveBeenCalledWith('/');
    expect(back).not.toHaveBeenCalled();
  });
});
