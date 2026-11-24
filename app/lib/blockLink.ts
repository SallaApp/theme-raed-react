/**
 * Link kinds in a block's `variable-list` link field (twilight.json) that name one
 * fixed storefront page. The API sends an item set to one of them with its kind
 * (`url__type`) and no `url`, so the theme supplies the page. The same mapping as
 * the engine's dev editor (`FIXED_LINKS` in the engine's `dev/editor/lookup.ts`).
 */
const FIXED_PAGES: Record<string, string> = {
  offers_link: '/offers',
  brands_link: '/brands',
  blog_link: '/blog',
};

/** A home block item whose link the merchant picked: a URL, a link kind, or both. */
export interface BlockLinkItem {
  url?: unknown;
  url__type?: unknown;
}

/**
 * Where a block item links to: its `url`, otherwise the fixed page its `url__type`
 * names (`offers_link` → `/offers`), otherwise `undefined` (nowhere to go).
 *
 * Without this an item set to "offers" rendered `<a>` with no `href` (TD-18336):
 * Raed's own default main links are seven `offers_link` items.
 */
export function blockLinkUrl(item: BlockLinkItem | null | undefined): string | undefined {
  if (!item) return undefined;
  if (typeof item.url === 'string' && item.url.trim()) return item.url;
  return typeof item.url__type === 'string' ? FIXED_PAGES[item.url__type] : undefined;
}
