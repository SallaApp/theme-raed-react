/**
 * Keys that `<salla-*>` web components read straight from `salla.lang`, which
 * some stores' translation packs don't carry yet. The theme's own
 * `locales/*.json` only reach React's `useTranslation`, not `salla.lang`, so a
 * missing key showed raw in the component (the Apple Pay order options modal
 * printed `blocks.order_options.total` beside its total).
 *
 * Their text lives in `locales/{ar,en}.json` like every other theme string;
 * these are copied from there into `salla.lang`, each only while the store has
 * no text of its own for it, so a store's translation always wins.
 */
export const COMPONENT_TRANSLATION_KEYS = [
  // `<salla-order-options-modal>` (quick buy / Apple Pay order options).
  'blocks.order_options.title',
  'blocks.order_options.subtitle',
  'blocks.order_options.continue',
  'blocks.order_options.total',
  'blocks.order_options.required_message',
] as const;

/** The bundled theme translations (`virtual:twilight/theme-translations`): `{ 'ar.trans': {...}, 'en.trans': {...} }`. */
export type ThemeTranslations = Record<string, Record<string, string>>;

/** The part of the SDK's `salla.lang` this needs (`add` sets one key in every locale given). */
export interface ComponentLang {
  get: (key: string) => string;
  add: (key: string, messages: Record<string, string>) => unknown;
}

/**
 * Add each of {@link COMPONENT_TRANSLATION_KEYS} the loaded pack lacks (`get`
 * returns the key itself for a missing one), in every locale the theme
 * translates it into.
 */
export function fillComponentTranslations(lang: ComponentLang, theme: ThemeTranslations): void {
  for (const key of COMPONENT_TRANSLATION_KEYS) {
    if (lang.get(key) !== key) continue;

    const messages: Record<string, string> = {};
    for (const [bucket, strings] of Object.entries(theme)) {
      const value = strings?.[key];
      if (value) messages[bucket.replace(/\.trans$/, '')] = value;
    }
    if (Object.keys(messages).length) lang.add(key, messages);
  }
}
