import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';
import { COMPONENT_TRANSLATION_KEYS } from '../../app/lib/componentTranslations';

/**
 * AGENTS.md: every translation key lives in both `locales/ar.json` and `locales/en.json`. Nothing
 * enforced it, so a key could be dropped from one file (or used in `app/` and never added) and only
 * show up as raw text in the storefront.
 */

type Messages = Record<string, string>;

/** Keys used as `t('key')` / `trans('key', 'fallback')`; a key built at run time can't be found this way. */
const T_CALL = /(?<![\w$.])(?:t|trans)\(\s*(['"`])([^'"`$\\\s]+)\1/g;

/** Every literal key passed to `t(...)` / `trans(...)` in one source file. */
export function extractKeys(source: string): string[] {
  return [...source.matchAll(T_CALL)].map((match) => match[2]);
}

/** Keys that are in `a` but not in `b`, sorted. */
export function missingFrom(a: Iterable<string>, b: Messages): string[] {
  return [...new Set(a)].filter((key) => !(key in b)).sort();
}

/** Keys that are in only one of the two locale files, per side. */
export function diffLocales(arMessages: Messages, enMessages: Messages) {
  return {
    onlyInAr: missingFrom(Object.keys(arMessages), enMessages),
    onlyInEn: missingFrom(Object.keys(enMessages), arMessages),
  };
}

/** Used keys that neither a locale file nor the allowlist covers, per locale. */
export function findMissing(
  used: Iterable<string>,
  allowed: Messages,
  arMessages: Messages,
  enMessages: Messages
) {
  const needed = [...new Set(used)].filter((key) => !(key in allowed));
  return { ar: missingFrom(needed, arMessages), en: missingFrom(needed, enMessages) };
}

const engine = (what: string) =>
  `${what}: the engine's own component reads this key from the platform pack`;
const platform = (what: string) =>
  `${what}: platform pack key the theme passes with an English fallback; the engine does not read it, so unconfirmed`;

/**
 * Keys the theme asks for that are NOT in `locales/*.json` because the store's translation pack
 * (`salla.lang`, served by the platform) provides them; the theme passes an English fallback for each.
 * Each entry needs a one-line reason. Do not add a key here to silence the test: add it to both locale
 * files instead. An entry that is no longer used, or now exists in a locale file, fails the test.
 * Entries marked "unconfirmed" are not read by the engine either, so nothing in this repo proves the
 * pack has them; check them before relying on the fallback.
 */
export const ENGINE_PROVIDED: Record<string, string> = {
  'blocks.header.share': platform('share button label'),
  'blocks.home.display_all': engine('"display all" link on home sections'),
  'common.elements.back_home': engine('back-to-home button'),
  'common.elements.remove': engine('cart item remove button'),
  'common.errors.error_occurred': engine('generic error message'),
  'common.titles.cart': engine('cart page title'),
  'common.titles.products': engine('products page title'),
  'common.uploader.browse': engine('file uploader browse label'),
  'common.uploader.drag_and_drop': engine('file uploader drag-and-drop label'),
  'pages.cart.complete_order': engine('cart toast checkout button'),
  'pages.cart.empty_cart': engine('empty cart message'),
  'pages.categories.filters': engine('listing filters heading'),
  'pages.categories.no_products': engine('empty listing message'),
  'pages.categories.sorting': engine('listing sort label'),
  'pages.checkout.show_more': platform('cart toast "show more" label'),
  'pages.loyalty_program.free_product': engine('free (loyalty) product label'),
  'pages.products.add_file': engine('product form add-file label'),
  'pages.products.add_note': engine('product form add-note label'),
  'pages.products.add_to_wishlist': platform('product add-to-wishlist label'),
  'pages.products.attachments': engine('product form attachments label'),
  'pages.products.availability': engine('product availability label'),
  'pages.products.calories': engine('product calories label'),
  'pages.products.file_expiration_period': platform('digital product file expiry label'),
  'pages.products.file_formats': platform('digital product file formats label'),
  'pages.products.free_access_to_new_files': platform('digital product free-updates label'),
  'pages.products.notes_placeholder': engine('product form notes placeholder'),
  'pages.products.number_of_files': platform('digital product file count label'),
  'pages.products.quantity': engine('quantity label'),
  'pages.products.read_more': engine('product description read-more'),
  'pages.products.remained': engine('product stock remaining label'),
  'pages.products.select_branch': engine('product branch picker label'),
  'pages.products.show_size_guides': engine('size guide link'),
  'pages.products.similar_products': engine('similar products heading'),
  'pages.products.size_guides': engine('size guide heading'),
  'pages.products.sku': engine('product SKU label'),
  'pages.products.sold': engine('product sold label'),
  'pages.products.sold_times': engine('product sold-times label'),
  'pages.products.starting_price': engine('product starting-price label'),
  'pages.products.tax_included': engine('product tax-included label'),
  'pages.products.weight': engine('product weight label'),
  'pages.wishlist.toggle': engine('wishlist toggle label'),
};

/** All `.ts` / `.tsx` files under a directory. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const appDir = join(__dirname, '../../app');
const usedKeys = new Set<string>([
  ...sourceFiles(appDir).flatMap((file) => extractKeys(readFileSync(file, 'utf8'))),
  // Read by `<salla-*>` web components, never through a `t(...)` call in app/.
  ...COMPONENT_TRANSLATION_KEYS,
]);

const arMessages = ar as Messages;
const enMessages = en as Messages;

describe('theme translation keys', () => {
  it('finds the keys the theme uses (a broken extractor must not pass silently)', () => {
    expect(usedKeys.size).toBeGreaterThanOrEqual(50);
    expect(usedKeys.has('blocks.header.search')).toBe(true);
    expect(usedKeys.has('blocks.order_options.total')).toBe(true);
  });

  it('has the same keys in ar.json and en.json', () => {
    expect(diffLocales(arMessages, enMessages)).toEqual({ onlyInAr: [], onlyInEn: [] });
  });

  it('has every key used in app/ in both ar.json and en.json, or in the allowlist', () => {
    expect(findMissing(usedKeys, ENGINE_PROVIDED, arMessages, enMessages)).toEqual({
      ar: [],
      en: [],
    });
  });

  it('keeps the allowlist honest: each entry is still used and not yet in a locale file', () => {
    const allowed = Object.keys(ENGINE_PROVIDED);
    expect(allowed.filter((key) => !usedKeys.has(key))).toEqual([]);
    expect(allowed.filter((key) => key in arMessages || key in enMessages)).toEqual([]);
    expect(Object.values(ENGINE_PROVIDED).every((reason) => reason.trim().length > 0)).toBe(true);
  });
});

describe('extractKeys', () => {
  it('reads the first string argument of t() and trans(), with or without a fallback', () => {
    const source = `
      t('a.one');
      t("a.two", 'Fallback');
      {trans('a.three', fallback)}
      const x = t(\`a.four\`);
    `;
    expect(extractKeys(source)).toEqual(['a.one', 'a.two', 'a.three', 'a.four']);
  });

  it('ignores other calls and keys built at run time', () => {
    const source = `
      format('a.one'); split('a.two'); i18n.t('a.three'); art('a.four');
      t(key); t(\`a.\${name}\`); t(key, 'fallback');
    `;
    expect(extractKeys(source)).toEqual([]);
  });
});

describe('failure detection', () => {
  const both = { 'a.one': 'x', 'a.two': 'y' };

  it('passes when every used key is in both files', () => {
    expect(findMissing(['a.one', 'a.two'], {}, both, both)).toEqual({ ar: [], en: [] });
  });

  it('reports a used key removed from en.json only', () => {
    expect(findMissing(['a.one', 'a.two'], {}, both, { 'a.one': 'x' })).toEqual({
      ar: [],
      en: ['a.two'],
    });
  });

  it('reports a used key removed from ar.json only', () => {
    expect(findMissing(['a.one', 'a.two'], {}, { 'a.two': 'y' }, both)).toEqual({
      ar: ['a.one'],
      en: [],
    });
  });

  it('lets an allowlisted key through', () => {
    expect(findMissing(['a.one', 'p.sku'], { 'p.sku': 'platform' }, both, both)).toEqual({
      ar: [],
      en: [],
    });
  });

  it('reports keys that exist in only one locale file', () => {
    expect(diffLocales({ 'a.one': 'x', 'a.extra': 'z' }, { 'a.one': 'x', 'a.other': 'w' })).toEqual(
      {
        onlyInAr: ['a.extra'],
        onlyInEn: ['a.other'],
      }
    );
  });
});
