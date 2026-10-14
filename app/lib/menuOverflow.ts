import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';

/** Marks the "More" item's `<li>`, so the stylesheet can find it (`[data-more-menu]`). */
export const MORE_MENU_ATTR = 'data-more-menu';

/** The synthetic "More" item's id; no real menu item uses a string id like it. */
export const MORE_MENU_ID = 'more-menu';

/**
 * Drop items with no title (the API returns e.g. the `brands` link as
 * `title: null`), recursively, so menus only ever see renderable rows.
 */
export const pruneUntitled = (items: MenuItem[]): MenuItem[] =>
  items
    .filter((item) => item.title != null && item.title !== '')
    .map((item) =>
      item.children?.length ? { ...item, children: pruneUntitled(item.children) } : item
    );

/**
 * The featured products a menu item carries, which make its panel a mega panel.
 *
 * The menus API sends them as `products`, not declared on the engine's
 * `MenuItem`: a list of ids, or the same as a comma-separated string. Anything
 * that isn't a positive id is dropped.
 */
export function menuProductIds(item: MenuItem): number[] {
  const raw = (item as MenuItem & { products?: unknown }).products;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.replace(/[[\]\s]/g, '').split(',')
      : typeof raw === 'number'
        ? [raw]
        : [];
  return list.map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

/**
 * How many root items fit on one line.
 *
 * `widths` are the items' own widths, `gap` the space between two of them. When
 * every item fits, all of them show. Otherwise room is kept for the "More" item
 * (`moreWidth`) and as many items as fit go ahead of it, in menu order.
 */
export function fitCount(
  widths: number[],
  available: number,
  moreWidth: number,
  gap: number
): number {
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  if (total <= available) return widths.length;

  let used = moreWidth;
  let count = 0;
  while (count < widths.length && used + gap + widths[count] <= available) {
    used += gap + widths[count];
    count += 1;
  }
  return count;
}

/**
 * The first `fit` items, then one "More" item holding the rest as its children,
 * which renders as a dropdown like any parent. Unchanged when everything fits.
 */
export function splitMenu(items: MenuItem[], fit: number, moreTitle: string): MenuItem[] {
  if (fit >= items.length) return items;
  return [
    ...items.slice(0, fit),
    { id: MORE_MENU_ID, title: moreTitle, url: '#', children: items.slice(fit) },
  ];
}

/** Rows a first-level panel shows before it adds a column. */
export const PANEL_ROWS = 8;
/** The most columns a first-level panel's links take. */
export const PANEL_MAX_COLUMNS = 4;

/**
 * How many columns a first-level panel's links take: one per {@link PANEL_ROWS}
 * links, at most {@link PANEL_MAX_COLUMNS}, so a long list grows sideways
 * rather than past the bottom of the screen.
 */
export function panelColumns(count: number): number {
  return Math.min(PANEL_MAX_COLUMNS, Math.max(1, Math.ceil(count / PANEL_ROWS)));
}
