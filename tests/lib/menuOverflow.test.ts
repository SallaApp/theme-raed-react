import { describe, it, expect } from 'vitest';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import {
  MORE_MENU_ATTR,
  MORE_MENU_ID,
  fitCount,
  splitMenu,
  withSafeAttrs,
} from '../../app/lib/menuOverflow';

const item = (id: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  title: `Item ${id}`,
  url: `/item-${id}`,
  attrs: `id="item-${id}"`,
  link_attrs: 'target="_self"',
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
    const more = shown[2];
    expect(more.title).toBe('More');
    expect(more.attrs).toBe(`${MORE_MENU_ATTR}="true"`);
    expect(more.children?.map((entry) => entry.id)).toEqual([3, 4]);
  });
});

describe('withSafeAttrs', () => {
  it('keeps attribute strings <salla-menu> can parse', () => {
    expect(withSafeAttrs([item(1)])[0]).toMatchObject({
      attrs: 'id="item-1"',
      link_attrs: 'target="_self"',
    });
  });

  it('replaces missing, empty or unparseable ones, children included', () => {
    const [fixed] = withSafeAttrs([
      item(1, {
        attrs: '',
        link_attrs: undefined,
        children: [item(2, { attrs: 'class="a b"' })],
      }),
    ]);
    expect(fixed.attrs).toBe('data-menu-id="1"');
    expect(fixed.link_attrs).toBe('data-menu-id="1"');
    expect(fixed.children?.[0].attrs).toBe('data-menu-id="2"');
  });
});
