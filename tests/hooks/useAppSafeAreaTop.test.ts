import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAppSafeAreaTop } from '../../app/hooks/useAppSafeAreaTop';

const root = document.documentElement;

afterEach(() => {
  root.style.removeProperty('--app-safe-area-top');
});

describe('useAppSafeAreaTop', () => {
  it('is 0 until the app reports an inset (a browser)', () => {
    const { result } = renderHook(() => useAppSafeAreaTop());
    expect(result.current).toBe(0);
  });

  it('reads the inset the engine wrote, and follows later reports', async () => {
    root.style.setProperty('--app-safe-area-top', '62px');
    const { result } = renderHook(() => useAppSafeAreaTop());
    expect(result.current).toBe(62);

    await act(async () => {
      root.style.setProperty('--app-safe-area-top', '47px');
    });
    expect(result.current).toBe(47);
  });
});
