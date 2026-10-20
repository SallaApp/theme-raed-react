import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// Its theme translations are the real locale files (`tests/stubs/theme-translations.ts`).
import { ThemeLayout } from '../../../app/components/layout/ThemeLayout';

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: '/ar' } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: {} }, store: {} }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useUser', () => ({
  useUser: () => ({ isLoggedIn: true }),
}));
vi.mock('@salla.sa/twilight-theme-engine/layout', () => ({ Footer: () => null }));
vi.mock('../../../app/components/layout/Header', () => ({ Header: () => null }));
vi.mock('../../../app/components/layout/ImportantLinksSheet', () => ({
  ImportantLinksSheet: () => null,
}));
vi.mock('../../../app/components/layout/MobileAccountSheet', () => ({
  MobileAccountSheet: () => null,
}));
vi.mock('../../../app/components/layout/MobileBottomBar', () => ({ MobileBottomBar: () => null }));
vi.mock('../../../app/components/layout/MobilePageTitleBar', () => ({
  MobilePageTitleBar: () => null,
}));

/**
 * A `salla.lang` stand-in. `subscribe` keeps the listener, as the SDK does, so
 * the test can fire it the way a translation pack loading would.
 */
function installLang(messages: Record<string, string>) {
  let listener: (() => void) | undefined;
  const unsubscribe = vi.fn();
  const lang = {
    get: (key: string) => messages[key] ?? key,
    add: vi.fn((key: string, values: Record<string, string>) => {
      messages[key] = values.ar;
    }),
    subscribe: vi.fn((fn: () => void) => {
      listener = fn;
      return unsubscribe;
    }),
  };
  (window as unknown as { salla: unknown }).salla = { lang };
  return { lang, unsubscribe, packLoaded: () => listener?.() };
}

afterEach(() => {
  cleanup();
  delete (window as unknown as { salla?: unknown }).salla;
});

describe("ThemeLayout's component translations", () => {
  it("adds the order options total from the locale files once the store's pack loads without it", () => {
    const { lang, packLoaded } = installLang({});
    render(<ThemeLayout>page</ThemeLayout>);

    expect(lang.subscribe).toHaveBeenCalledTimes(1);
    expect(lang.add).not.toHaveBeenCalled();

    packLoaded();

    expect(lang.add).toHaveBeenCalledWith('blocks.order_options.total', {
      ar: 'الإجمالي',
      en: 'Total',
    });
    expect(lang.get('blocks.order_options.total')).toBe('الإجمالي');
  });

  it("keeps the store's own wording when its pack has the key", () => {
    const { lang, packLoaded } = installLang({ 'blocks.order_options.total': 'المجموع' });
    render(<ThemeLayout>page</ThemeLayout>);
    packLoaded();

    expect(lang.add).not.toHaveBeenCalledWith('blocks.order_options.total', expect.anything());
    expect(lang.get('blocks.order_options.total')).toBe('المجموع');
  });

  it('stops listening when the layout unmounts', () => {
    const { unsubscribe } = installLang({});
    const { unmount } = render(<ThemeLayout>page</ThemeLayout>);
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('renders without the SDK, as on the server', () => {
    const { getByText } = render(<ThemeLayout>page</ThemeLayout>);
    expect(getByText('page')).toBeTruthy();
  });
});
