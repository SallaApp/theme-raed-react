import { describe, it, expect, vi } from 'vitest';
import {
  COMPONENT_TRANSLATIONS,
  fillComponentTranslations,
} from '../../app/lib/componentTranslations';

/** A `salla.lang` stand-in: `get` returns the key itself when it's missing, as lang.js does. */
function fakeLang(messages: Record<string, string>) {
  return {
    get: (key: string) => messages[key] ?? key,
    add: vi.fn(),
  };
}

describe('fillComponentTranslations', () => {
  it("adds the order options total in both languages when the store's pack lacks it", () => {
    const lang = fakeLang({});
    fillComponentTranslations(lang);
    expect(lang.add).toHaveBeenCalledWith('blocks.order_options.total', {
      ar: 'الإجمالي',
      en: 'Total',
    });
  });

  it("leaves a key the store already translates alone, so the store's text wins", () => {
    const lang = fakeLang({ 'blocks.order_options.total': 'المجموع' });
    fillComponentTranslations(lang);
    expect(lang.add).not.toHaveBeenCalledWith('blocks.order_options.total', expect.anything());
  });

  it('adds nothing when the pack has every key', () => {
    const lang = fakeLang(
      Object.fromEntries(Object.keys(COMPONENT_TRANSLATIONS).map((key) => [key, 'x']))
    );
    fillComponentTranslations(lang);
    expect(lang.add).not.toHaveBeenCalled();
  });

  it('gives every key both an Arabic and an English string', () => {
    for (const messages of Object.values(COMPONENT_TRANSLATIONS)) {
      expect(messages.ar.trim()).not.toBe('');
      expect(messages.en.trim()).not.toBe('');
    }
  });
});
