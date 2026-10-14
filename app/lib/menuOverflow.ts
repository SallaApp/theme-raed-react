import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';

/**
 * Marks the synthetic "More" item. `<salla-menu>` spreads an item's `attrs` onto
 * its `<li>`, so this is how the stylesheet finds it (`[data-more-menu]`).
 */
export const MORE_MENU_ATTR = 'data-more-menu';

/** The synthetic item's id; no real menu item uses a string id like it. */
export const MORE_MENU_ID = 'more-menu';

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
 * which `<salla-menu>` renders as a dropdown like any parent. Unchanged when
 * everything fits.
 */
export function splitMenu(items: MenuItem[], fit: number, moreTitle: string): MenuItem[] {
  if (fit >= items.length) return items;
  return [
    ...items.slice(0, fit),
    {
      id: MORE_MENU_ID,
      title: moreTitle,
      url: '#',
      attrs: `${MORE_MENU_ATTR}="true"`,
      link_attrs: 'aria-haspopup="true"',
      children: items.slice(fit),
    },
  ];
}

/** Whether an attribute string is one `<salla-menu>` can parse: `key="value"` pairs. */
const isAttrList = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim() !== '' &&
  value
    .trim()
    .split(' ')
    .every((pair) => pair.includes('='));

/**
 * The items with `attrs` / `link_attrs` that `<salla-menu>` can read.
 *
 * Handed a menu as JSON, it splits each string on spaces and every piece on
 * `=`, so a missing or empty one throws while it renders and the whole menu
 * disappears. The API sends both today; this keeps one odd item from costing
 * the store its menu.
 */
export function withSafeAttrs(items: MenuItem[]): MenuItem[] {
  return items.map((item) => ({
    ...item,
    attrs: isAttrList(item.attrs) ? item.attrs : `data-menu-id="${item.id}"`,
    link_attrs: isAttrList(item.link_attrs) ? item.link_attrs : `data-menu-id="${item.id}"`,
    ...(item.children?.length ? { children: withSafeAttrs(item.children) } : {}),
  }));
}
