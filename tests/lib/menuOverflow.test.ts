import { describe, it, expect } from 'vitest';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import {
  MORE_MENU_ID,
  fitCount,
  menuProductIds,
  panelColumns,
  pruneUntitled,
  splitMenu,
} from '../../app/lib/menuOverflow';

const item = (id: number, extra: Partial<MenuItem> & { products?: unknown } = {}): MenuItem => ({
  id,
  title: `Item ${id}`,
  url: `/item-${id}`,
  ...extra,
});

describe('fitCount', () => {
  it('shows every item when they all fit, gaps included', () => {
    expect(fitCount([100, 100, 100], 320, 80, 10)).toBe(3);
  });

  it('keeps room for "More" when they do not all fit', () => {
    // 80 (More) + 10 + 100 + 10 + 100 = 300; a third item would need 410.
    expect(fitCount([100, 100, 100, 100], 400, 80, 10)).toBe(2);
  });

  it('can leave only "More" on a very narrow row', () => {
    expect(fitCount([100, 100], 150, 80, 10)).toBe(0);
  });
});

describe('splitMenu', () => {
  const items = [item(1), item(2), item(3), item(4)];

  it('returns the menu unchanged when everything fits', () => {
    expect(splitMenu(items, 4, 'More')).toBe(items);
  });

  it('moves the items that do not fit under a last "More" item, in order', () => {
    const shown = splitMenu(items, 2, 'More');
    expect(shown.map((entry) => entry.id)).toEqual([1, 2, MORE_MENU_ID]);
    expect(shown[2].title).toBe('More');
    expect(shown[2].children?.map((entry) => entry.id)).toEqual([3, 4]);
  });
});

describe('pruneUntitled', () => {
  it('drops items with no title, children included', () => {
    const pruned = pruneUntitled([
      item(1, { children: [item(11), item(12, { title: '' })] }),
      item(2, { title: null as unknown as string }),
    ]);
    expect(pruned.map((entry) => entry.id)).toEqual([1]);
    expect(pruned[0].children?.map((entry) => entry.id)).toEqual([11]);
  });
});

describe('menuProductIds', () => {
  it('reads a list of ids, or the same as a string', () => {
    expect(menuProductIds(item(1, { products: [5, '6'] }))).toEqual([5, 6]);
    expect(menuProductIds(item(1, { products: '7, 8' }))).toEqual([7, 8]);
    expect(menuProductIds(item(1, { products: '[9,10]' }))).toEqual([9, 10]);
  });

  it('has none when the item carries no featured products', () => {
    expect(menuProductIds(item(1))).toEqual([]);
    expect(menuProductIds(item(1, { products: ['', 'x', 0] }))).toEqual([]);
  });
});

describe('panelColumns', () => {
  it('adds a column per 8 links, up to 4', () => {
    expect(panelColumns(3)).toBe(1);
    expect(panelColumns(8)).toBe(1);
    expect(panelColumns(9)).toBe(2);
    expect(panelColumns(17)).toBe(3);
    expect(panelColumns(60)).toBe(4);
  });
});
