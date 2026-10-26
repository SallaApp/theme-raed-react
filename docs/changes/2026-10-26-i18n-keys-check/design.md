# Design: i18n keys check (SAL-3511 / G6)

## Goal

A vitest test that fails when a translation key used by the theme code is missing from
`locales/ar.json` or `locales/en.json`, or when the two files differ in key set.

## Findings (base `feature/quality-gates-twig-parity-audit`, 22aef57)

- `ar.json` and `en.json` are flat objects, 84 keys each, identical key sets.
- Theme code translates through `const { t } = useTranslation()` from
  `@salla.sa/twilight-theme-engine/i18n`; call forms are `t('key')` and `t('key', 'Fallback')`.
  Also passed as a prop (`t={(key, fallback) => t(key, fallback || key)}` in
  `app/components/product/ProductListPage.tsx`, the only dynamic-key call; it forwards the
  engine list component's own keys, nothing to extract).
- `COMPONENT_TRANSLATION_KEYS` (`app/lib/componentTranslations.ts`, 5 `blocks.order_options.*`
  keys) are read by `<salla-*>` web components via `salla.lang`; the theme copies them from the locale files.
  Already covered for presence by `tests/lib/componentTranslations.test.ts`, but must be in the new test too.
- A prototype regex scan finds ~82 distinct literal keys in `app/`; ~40 of them
  (`pages.products.*`, `pages.cart.complete_order`, `common.uploader.*`, `common.elements.*`,
  `pages.categories.*`, ...) are NOT in either locale file. They are served by the engine / platform
  translation pack (the theme only passes a fallback). These need the explicit allowlist (req. 3).
- ~40 locale keys are not referenced by a literal `t()` in `app/` (thank_you, wishlist share,
  footer newsletter, ...). Do NOT fail on unused keys (out of scope; some are used by the engine/web components).
- The 10 Twig keys missing from both files are not used in `app/`; do not add them (task F23).

## Decisions

- New file `tests/lib/i18n-keys.test.ts`; no app code or locale change.
- Key extraction: read every `app/**/*.{ts,tsx}` with `node:fs`, regex for `t(` / `trans(`
  call with a first argument that is a plain string literal (no template interpolation),
  not preceded by `.`/word char. Add keys from `COMPONENT_TRANSLATION_KEYS` (imported).
- Allowlist: `const ENGINE_PROVIDED: Record<string, string>` key -> one-line reason. Test also
  fails when an allowlisted key (a) is no longer used in `app/` or (b) is now present in a locale
  file, so the list cannot rot.
- Sanity guard: fail if extraction finds < ~50 keys (regex silently broke).
- Unknown-key failure messages list the key and first file using it.
