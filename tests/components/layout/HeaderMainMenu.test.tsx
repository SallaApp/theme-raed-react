import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { HeaderMainMenu } from '../../../app/components/layout/HeaderMainMenu';

interface JsonItem {
  id: string | number;
  title: string;
  attrs?: string;
  children?: JsonItem[];
}

const state = {
  settings: {} as Record<string, unknown>,
  items: [] as JsonItem[],
  /** The row's width, as `clientWidth` reports it. */
  available: 1000,
  /** Render Twilight 2.14's class names (`root-level`) instead of 3.x's (`s-menu-root-level`). */
  legacy: false,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: state.items }),
}));
vi.mock('@salla.sa/twilight-theme-engine/api/menu', () => ({
  menu: { queries: { header: () => ({}) } },
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
// Renders root items the way <salla-menu> does, so the component can measure them.
vi.mock('@salla.sa/twilight-components-react/menu', () => {
  const Menu = ({ source, sourceValue }: { source: string; sourceValue?: string }) => {
    const items: JsonItem[] = source === 'json' && sourceValue ? JSON.parse(sourceValue) : [];
    return (
      <salla-menu data-source={source}>
        <ul className="main-menu">
          {items.map((entry) => (
            <li
              key={String(entry.id)}
              className={state.legacy ? 'root-level' : 's-menu-root-level'}
              // <salla-menu> spreads `attrs` onto the <li>; only the marker matters here.
              {...(entry.attrs?.includes('data-more-menu') ? { 'data-more-menu': 'true' } : {})}
              data-children={entry.children?.map((child) => child.title).join(',')}
            >
              <a href="#">{entry.title}</a>
            </li>
          ))}
        </ul>
      </salla-menu>
    );
  };
  return { SallaMenu: Menu, SallaMenuCore: Menu };
});

let resize: () => void = () => {};

beforeEach(() => {
  state.settings = {};
  state.items = [1, 2, 3, 4, 5].map((n) => ({ id: n, title: `Item ${n}`, attrs: `id="i${n}"` }));
  state.available = 1000;
  state.legacy = false;
  // Every root item (the "More" probe included) is 100px wide.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    const isRoot = this.matches('.s-menu-root-level, .root-level');
    const width = isRoot ? 100 : 0;
    return { width, height: 40, top: 0, left: 0, right: width, bottom: 40, x: 0, y: 0 } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => state.available);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const rootTitles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('salla-menu :is(.s-menu-root-level, .root-level)'), (li) =>
    li.textContent
  );

describe('HeaderMainMenu', () => {
  it('shows every item, with no "More", when they all fit', () => {
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
    expect(container.querySelector('[data-more-menu]')).toBeNull();
  });

  it('moves the items that do not fit under a last "More" item', () => {
    state.available = 350; // More (100) + two items; a third would need 400
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'More']);
    expect(container.querySelector('[data-more-menu]')?.getAttribute('data-children')).toBe(
      'Item 3,Item 4,Item 5'
    );
  });

  // A store pinned to Twilight 2.14 loads a <salla-menu> whose root items are
  // `.root-level`, not `.s-menu-root-level`; measuring has to find them either way.
  it("splits Twilight 2.14's menu too (root items named .root-level)", () => {
    state.legacy = true;
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'More']);
  });

  it('re-splits when the row is resized', () => {
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toHaveLength(3);

    state.available = 1000;
    act(() => resize());
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
  });

  it('keeps the "More" link from navigating', () => {
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    const link = container.querySelector('[data-more-menu] > a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(link, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves the menu to wrap as before when enable_more_menu is off', () => {
    state.settings = { enable_more_menu: false };
    const { container } = render(<HeaderMainMenu />);
    expect(container.querySelector('salla-menu')?.getAttribute('data-source')).toBe('header');
    expect(container.querySelector('.site-header__oneline-menu')).toBeNull();
  });
});
