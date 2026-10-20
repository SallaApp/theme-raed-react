import { describe, it, expect, vi } from 'vitest';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';
import {
  COMPONENT_TRANSLATION_KEYS,
  fillComponentTranslations,
} from '../../app/lib/componentTranslations';

/** The theme's locale files, bundled the way `virtual:twilight/theme-translations` hands them over. */
const theme = { 'ar.trans': ar as Record<string, string>, 'en.trans': en as Record<string, string> };

/** A `salla.lang` stand-in: `get` returns the key itself when it's missing, as lang.js does. */
function fakeLang(messages: Record<string, string>) {
  return {
    get: (key: string) => messages[key] ?? key,
    add: vi.fn(),
  };
}

describe('fillComponentTranslations', () => {
  it("adds the order options total from the locale files when the store's pack lacks it", () => {
    const lang = fakeLang({});
    fillComponentTranslations(lang, theme);
    expect(lang.add).toHaveBeenCalledWith('blocks.order_options.total', {
      ar: 'الإجمالي',
      en: 'Total',
    });
  });

  it("leaves a key the store already translates alone, so the store's text wins", () => {
    const lang = fakeLang({ 'blocks.order_options.total': 'المجموع' });
    fillComponentTranslations(lang, theme);
    expect(lang.add).not.toHaveBeenCalledWith('blocks.order_options.total', expect.anything());
  });

  it('adds nothing when the pack has every key', () => {
    const lang = fakeLang(Object.fromEntries(COMPONENT_TRANSLATION_KEYS.map((key) => [key, 'x'])));
    fillComponentTranslations(lang, theme);
    expect(lang.add).not.toHaveBeenCalled();
  });

  it('adds only the locales the theme translates a key into', () => {
    const lang = fakeLang({});
    fillComponentTranslations(lang, { 'en.trans': { 'blocks.order_options.total': 'Total' } });
    expect(lang.add).toHaveBeenCalledTimes(1);
    expect(lang.add).toHaveBeenCalledWith('blocks.order_options.total', { en: 'Total' });
  });

  it('finds every key in both locale files', () => {
    for (const key of COMPONENT_TRANSLATION_KEYS) {
      expect((ar as Record<string, string>)[key]?.trim()).toBeTruthy();
      expect((en as Record<string, string>)[key]?.trim()).toBeTruthy();
    }
  });
});
