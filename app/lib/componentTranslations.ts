/**
 * Strings that `<salla-*>` web components read straight from `salla.lang`,
 * which some stores' translation packs don't carry yet. The theme's own
 * `locales/*.json` only reach React's `useTranslation`, not `salla.lang`, so a
 * missing key showed raw in the component (the Apple Pay order options modal
 * printed `blocks.order_options.total` beside its total).
 *
 * Each is filled in only while the store has no text of its own for it, so a
 * store's translation always wins.
 */
export const COMPONENT_TRANSLATIONS: Record<string, { ar: string; en: string }> = {
  // `<salla-order-options-modal>` (quick buy / Apple Pay order options).
  'blocks.order_options.title': { ar: 'خيارات الطلب', en: 'Order options' },
  'blocks.order_options.subtitle': {
    ar: 'اختر من الخيارات المتاحة.',
    en: 'Choose from the available options.',
  },
  'blocks.order_options.continue': { ar: 'متابعة', en: 'Continue' },
  'blocks.order_options.total': { ar: 'الإجمالي', en: 'Total' },
  'blocks.order_options.required_message': {
    ar: 'يرجى تعبئة الحقول المطلوبة',
    en: 'Please fill in the required fields',
  },
};

/** The part of the SDK's `salla.lang` this needs (`add` sets one key in every locale). */
export interface ComponentLang {
  get: (key: string) => string;
  add: (key: string, messages: Record<string, string>) => unknown;
}

/** Add each of {@link COMPONENT_TRANSLATIONS} the loaded pack lacks; `get` returns the key itself for a missing one. */
export function fillComponentTranslations(lang: ComponentLang): void {
  for (const [key, messages] of Object.entries(COMPONENT_TRANSLATIONS)) {
    if (lang.get(key) === key) lang.add(key, messages);
  }
}
