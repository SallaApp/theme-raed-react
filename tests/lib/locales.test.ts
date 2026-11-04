import { describe, it, expect } from 'vitest';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

const locales = { ar: ar as Record<string, string>, en: en as Record<string, string> };

describe('locale files', () => {
  // `pages.wishlist.toggle` names the heart on every product card: the theme's
  // card and the engine's list-view card. Salla's platform pack has no
  // `pages.wishlist.*` keys, so without the theme's own text every store, Arabic
  // ones too, announced the English fallback. `aria-pressed` says whether the
  // product is saved, so the name is the action, as on the product page
  // (`pages.products.add_to_wishlist`).
  it('names the product card wishlist heart in both languages', () => {
    expect(locales.ar['pages.wishlist.toggle']).toBe('أضف إلى قائمة الأمنيات');
    expect(locales.en['pages.wishlist.toggle']).toBe('Add to wishlist');
  });

  it('has the same keys in Arabic and English', () => {
    expect(Object.keys(locales.ar).sort()).toEqual(Object.keys(locales.en).sort());
  });
});
