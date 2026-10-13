import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';

/** Built-in store pages a menu item can point at, each with its own placeholder icon. */
export type BuiltInMenuKind = 'offers' | 'blog' | 'brands';

const KINDS: readonly BuiltInMenuKind[] = ['offers', 'blog', 'brands'];

const asKind = (value: unknown): BuiltInMenuKind | null =>
  typeof value === 'string' && (KINDS as readonly string[]).includes(value)
    ? (value as BuiltInMenuKind)
    : null;

/**
 * Which built-in page a menu item links to, or null for anything else (a
 * category, a product, a custom link). Built-in items carry a word id
 * (`"offers"`, `"blog"`), echoed in `attrs` as ` id="offers"`; the URL's last
 * path segment (`/ar/blog`) is the fallback when neither is set.
 */
export function builtInMenuKind(
  item: Pick<MenuItem, 'id' | 'url' | 'attrs'>
): BuiltInMenuKind | null {
  const byId = asKind(item.id);
  if (byId) return byId;
  const byAttrs = asKind(item.attrs?.match(/\bid="([^"]+)"/)?.[1]);
  if (byAttrs) return byAttrs;
  const path = (item.url ?? '').split(/[?#]/)[0].replace(/^[a-z]+:\/\/[^/]+/i, '');
  return asKind(path.split('/').filter(Boolean).pop());
}
