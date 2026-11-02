import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
// Its theme translations are the real locale files (`tests/stubs/theme-translations.ts`).
import { ThemeLayout } from '../../../app/components/layout/ThemeLayout';
import manifest from '../../../twilight.json';

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: '/ar' } }),
}));
const theme = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme, store: {} }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useUser', () => ({
  useUser: () => ({ isLoggedIn: true }),
}));
vi.mock('../../../app/components/layout/Footer', () => ({ Footer: () => <footer /> }));
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

  // An app snippet can insert next to `.store-footer` once the SDK is ready, which can be before
  // a Suspense boundary around the footer hydrates: React #418, and the app's nodes dropped.
  it('server-renders the footer outside any Suspense boundary, so it hydrates with the page', () => {
    const html = renderToString(<ThemeLayout>page</ThemeLayout>);
    expect(html).toMatch(/<\/main><footer><\/footer>/);
  });

  it('renders without the SDK, as on the server', () => {
    const { getByText } = render(<ThemeLayout>page</ThemeLayout>);
    expect(getByText('page')).toBeTruthy();
  });
});

describe('ThemeLayout product card image ratio', () => {
  afterEach(() => {
    theme.settings = {};
    cleanup();
  });

  const wrapper = (container: HTMLElement) => container.querySelector('.app-inner')!;

  it('takes each shape the merchant setting offers', () => {
    const setting = manifest.settings.find((item) => item.id === 'product_card_img_ratio') as {
      options: { value: string }[];
      selected: { value: string }[];
    };
    expect(setting.selected[0].value).toBe('auto');
    expect(setting.options.map((option) => option.value)).toEqual([
      'auto',
      'square',
      'landscape',
      'portrait',
    ]);

    for (const { value } of setting.options) {
      // A saved dropdown arrives as `[{ value }]`.
      theme.settings = { product_card_img_ratio: [{ value }] };
      const { container, unmount } = render(<ThemeLayout />);
      expect(wrapper(container).classList.contains(`product-card-img--${value}`)).toBe(true);
      unmount();
    }
  });

  it('reads a plain string too', () => {
    theme.settings = { product_card_img_ratio: 'portrait' };
    const { container } = render(<ThemeLayout />);
    expect(wrapper(container).classList.contains('product-card-img--portrait')).toBe(true);
  });

  it('is auto, the old Twig card, when the setting is missing or unknown', () => {
    for (const settings of [{}, { product_card_img_ratio: 'round' }]) {
      theme.settings = settings;
      const { container, unmount } = render(<ThemeLayout />);
      expect(wrapper(container).classList.contains('product-card-img--auto')).toBe(true);
      unmount();
    }
  });
});

describe('ThemeLayout square photos image size', () => {
  afterEach(() => {
    theme.settings = {};
    cleanup();
  });

  const hasCover = (settings: Record<string, unknown>) => {
    theme.settings = settings;
    const { container, unmount } = render(<ThemeLayout />);
    const cover = container.querySelector('.app-inner')!.classList.contains('square-photos--cover');
    unmount();
    return cover;
  };

  it('shows the whole photo unless the merchant asks for cover', () => {
    expect(hasCover({})).toBe(false);
    expect(hasCover({ squar_photo_bg_image_size: 'contain' })).toBe(false);
    expect(hasCover({ squar_photo_bg_image_size: [{ value: 'contain' }] })).toBe(false);
  });

  it('covers when the merchant asks for it, as a saved dropdown or a plain string', () => {
    expect(hasCover({ squar_photo_bg_image_size: [{ value: 'cover' }] })).toBe(true);
    expect(hasCover({ squar_photo_bg_image_size: 'cover' })).toBe(true);
  });
});
