import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { HeaderMainMenu } from '../../../app/components/layout/HeaderMainMenu';

interface Node {
  id: string | number;
  title: string;
  url: string;
  products?: unknown;
  children?: Node[];
}

const state = {
  settings: {} as Record<string, unknown>,
  items: [] as Node[],
  /** What the product list query returns, and the params it was asked for. */
  products: [] as { id: number; name: string }[],
  productParams: [] as unknown[],
  /** The row's width, as `clientWidth` reports it. */
  available: 1000,
  /** Where a nested row's end edge sits (its `right`, in a left-to-right page). */
  rowRight: 300,
  /** Where a first-level panel's left edge sits; it is 400px wide. */
  panelLeft: 100,
  /** A nested panel's own width. */
  nestedWidth: 224,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown[] }) =>
    options.queryKey[0] === 'menu'
      ? { data: state.items }
      : { data: { items: state.products } },
}));
vi.mock('@salla.sa/twilight-theme-engine/api/menu', () => ({
  menu: { queries: { header: () => ({ queryKey: ['menu'] }) } },
}));
vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    queries: {
      list: (params: unknown) => {
        state.productParams.push(params);
        return { queryKey: ['products', params] };
      },
    },
  },
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../../../app/components/product/ProductCard', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => (
    <div className="theme-product-card">{product.name}</div>
  ),
}));

let resize: () => void = () => {};

beforeEach(() => {
  state.settings = {};
  state.items = [1, 2, 3, 4, 5].map((n) => ({ id: n, title: `Item ${n}`, url: `/item-${n}` }));
  state.products = [];
  state.productParams = [];
  state.available = 1000;
  state.rowRight = 300;
  state.panelLeft = 100;
  state.nestedWidth = 224;
  // Every root item (the "More" probe included) is 100px wide.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.classList.contains('s-menu-sub-menu')) {
      const left = state.panelLeft;
      return { width: 400, height: 200, top: 0, left, right: left + 400, bottom: 200 } as DOMRect;
    }
    if (this.classList.contains('s-menu-non-root-level')) {
      const right = state.rowRight;
      return { width: 200, height: 40, top: 0, left: right - 200, right, bottom: 40 } as DOMRect;
    }
    // A root item is 100px, 20px more with a caret (when it has children).
    const width = this.classList.contains('s-menu-root-level')
      ? 100 + (this.classList.contains('s-menu-has-children') ? 20 : 0)
      : 0;
    return { width, height: 40, top: 0, left: 0, right: width, bottom: 40, x: 0, y: 0 } as DOMRect;
  });
  // A nested panel is 224px wide; the window (jsdom) is 1024px.
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('s-menu-sub-menu') ? state.nestedWidth : 0;
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
  Array.from(
    container.querySelectorAll('.main-menu:not(.site-header__more-probe) > .s-menu-root-level'),
    (li) => li.querySelector(':scope > a')?.textContent
  );

describe('HeaderMainMenu', () => {
  it('shows every item, with no "More", when they all fit', () => {
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
    expect(container.querySelector('[data-more-menu]')).toBeNull();
    expect(container.querySelector('a[href="/item-1"]')).toBeTruthy();
  });

  it('moves the items that do not fit under a last "More" item', () => {
    state.available = 350; // More (100) + two items; a third would need 400
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'More']);
    const more = container.querySelector('[data-more-menu]')!;
    expect(
      Array.from(more.querySelectorAll('.s-menu-sub-menu > ul > li > a'), (a) => a.textContent)
    ).toEqual(['Item 3', 'Item 4', 'Item 5']);
  });

  it('re-splits when the row is resized', () => {
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).toHaveLength(3);

    state.available = 1000;
    act(() => resize());
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
  });

  // Below lg the row is hidden and measures 0: it waits, and splits once the
  // window grows and the row gets a width.
  it('splits a menu that first rendered hidden, once the row has a width', () => {
    state.available = 0;
    const { container } = render(<HeaderMainMenu />);
    expect(container.querySelector('.site-header__oneline-menu.is-measuring')).toBeTruthy();

    state.available = 350;
    act(() => resize());
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'More']);
  });

  it('lays a long nested list out in columns too', () => {
    state.items = [
      {
        id: 1,
        title: 'Home',
        url: '/home',
        children: [
          {
            id: 2,
            title: 'Rooms',
            url: '/rooms',
            children: Array.from({ length: 12 }, (_, i) => ({
              id: 100 + i,
              title: `Room ${i}`,
              url: `/room-${i}`,
            })),
          },
        ],
      },
    ];
    const { container } = render(<HeaderMainMenu />);
    const list = container.querySelector('.s-menu-non-root-level > .s-menu-sub-menu > ul')!;
    expect(list.classList.contains('s-menu-columns')).toBe(true);
    expect((list as HTMLElement).style.getPropertyValue('--menu-columns')).toBe('2');
  });

  // A root item that gains children gets a caret and grows: measured again.
  it('measures again when a root item gains children', () => {
    state.available = 500; // five 100px items fit exactly
    const { container, rerender } = render(<HeaderMainMenu />);
    expect(container.querySelector('[data-more-menu]')).toBeNull();

    state.items = state.items.map((item, i) =>
      i === 0 ? { ...item, children: [{ id: 10, title: 'Sub', url: '/sub' }] } : item
    );
    rerender(<HeaderMainMenu />);
    expect(rootTitles(container)).toEqual(['Item 1', 'Item 2', 'Item 3', 'More']);
  });

  it('lays a long first-level list out in columns', () => {
    state.items = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      title: `Item ${i + 1}`,
      url: `/item-${i + 1}`,
    }));
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    const list = container.querySelector('[data-more-menu] > .s-menu-sub-menu > ul')!;
    expect(list.classList.contains('s-menu-columns')).toBe(true);
    expect((list as HTMLElement).style.getPropertyValue('--menu-columns')).toBe('3');
  });

  describe('first-level panel position', () => {
    beforeEach(() => {
      state.items = [
        {
          id: 1,
          title: 'Home',
          url: '/home',
          children: [{ id: 2, title: 'Rooms', url: '/rooms' }],
        },
      ];
    });

    const openPanel = (container: HTMLElement) => {
      const item = container.querySelector('.s-menu-root-level.s-menu-has-children')!;
      fireEvent.mouseEnter(item);
      return item.querySelector<HTMLElement>(':scope > .s-menu-sub-menu')!;
    };

    it('stays where it opens when it fits in the window', () => {
      const { container } = render(<HeaderMainMenu />);
      expect(openPanel(container).style.getPropertyValue('--panel-shift')).toBe('');
    });

    it('moves back inside the window when it would cross its edge', () => {
      state.panelLeft = 900; // ends at 1300 in a 1024px window
      const { container } = render(<HeaderMainMenu />);
      // 1024 - 8 (margin) - 1300 = -284
      expect(openPanel(container).style.getPropertyValue('--panel-shift')).toBe('-284px');
    });
  });

  describe('nested panel direction', () => {
    beforeEach(() => {
      state.items = [
        {
          id: 1,
          title: 'Home',
          url: '/home',
          children: [
            {
              id: 2,
              title: 'Rooms',
              url: '/rooms',
              children: [{ id: 3, title: 'Kitchen', url: '/kitchen' }],
            },
          ],
        },
      ];
    });

    it('opens past its row when there is room there', () => {
      state.rowRight = 300; // 724px to the window's edge
      const { container } = render(<HeaderMainMenu />);
      const row = container.querySelector('.s-menu-non-root-level.s-menu-has-children')!;
      fireEvent.mouseEnter(row);
      expect(row.classList.contains('s-menu-opens-start')).toBe(false);
    });

    it('caps it to the roomier side when it fits on neither', () => {
      state.rowRight = 724; // 292px past its end edge, 516px past its start edge
      state.nestedWidth = 800;
      const { container } = render(<HeaderMainMenu />);
      const row = container.querySelector('.s-menu-non-root-level.s-menu-has-children')!;
      fireEvent.mouseEnter(row);
      expect(row.classList.contains('s-menu-opens-start')).toBe(true);
      const panel = row.querySelector<HTMLElement>(':scope > .s-menu-sub-menu')!;
      expect(panel.getAttribute('data-capped')).toBe('true');
      expect(panel.style.getPropertyValue('--panel-max')).toBe('516px');
    });

    it('opens toward the row start when it would run off screen', () => {
      state.rowRight = 900; // 124px left, the panel is 224px
      const { container } = render(<HeaderMainMenu />);
      const row = container.querySelector('.s-menu-non-root-level.s-menu-has-children')!;
      fireEvent.mouseEnter(row);
      expect(row.classList.contains('s-menu-opens-start')).toBe(true);
    });
  });

  it('keeps the "More" link from navigating', () => {
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    const link = container.querySelector('[data-more-menu] > a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(link, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves out items with no title', () => {
    state.items = [...state.items, { id: 6, title: '', url: '/brands' }];
    const { container } = render(<HeaderMainMenu />);
    expect(rootTitles(container)).not.toContain('');
    expect(rootTitles(container)).toHaveLength(5);
  });

  it('lets the menu wrap, with no "More", when enable_more_menu is off', () => {
    state.settings = { enable_more_menu: false };
    state.available = 350;
    const { container } = render(<HeaderMainMenu />);
    expect(container.querySelector('.site-header__oneline-menu')).toBeNull();
    expect(rootTitles(container)).toHaveLength(5);
  });

  describe('mega panel', () => {
    beforeEach(() => {
      state.items = [
        {
          id: 1,
          title: 'Home',
          url: '/home',
          products: [11, 12],
          children: [{ id: 2, title: 'Living room', url: '/living' }],
        },
      ];
      state.products = [
        { id: 11, name: 'Chair' },
        { id: 12, name: 'Lamp' },
      ];
    });

    it('stacks its products below its links when the links need columns', () => {
      state.items[0].children = Array.from({ length: 12 }, (_, i) => ({
        id: 100 + i,
        title: `Room ${i}`,
        url: `/room-${i}`,
      }));
      const { container } = render(<HeaderMainMenu />);
      const panel = container.querySelector('.s-menu-mega-menu > .s-menu-sub-menu')!;
      expect(panel.classList.contains('is-stacked')).toBe(true);
    });

    // jsdom's window is 768px tall; the products' top is at 0 here.
    it('caps its products to the room left in the window, so every card is reachable', () => {
      const { container } = render(<HeaderMainMenu />);
      fireEvent.mouseEnter(container.querySelector('.s-menu-mega-menu')!);
      const products = container.querySelector<HTMLElement>('.s-menu-products-wrapper')!;
      expect(products.style.maxHeight).toBe('736px'); // 768 - 0 - 32
    });

    it('keeps its products beside a short list of links', () => {
      const { container } = render(<HeaderMainMenu />);
      const panel = container.querySelector('.s-menu-mega-menu > .s-menu-sub-menu')!;
      expect(panel.classList.contains('is-stacked')).toBe(false);
    });

    it('shows its featured products as the theme product card, once it opens', () => {
      const { container } = render(<HeaderMainMenu />);
      const item = container.querySelector('.s-menu-mega-menu')!;
      // Not fetched with the page.
      expect(container.querySelector('.theme-product-card')).toBeNull();
      expect(state.productParams).toHaveLength(0);

      fireEvent.mouseEnter(item);
      const cards = item.querySelectorAll(
        '.s-menu-products-wrapper .s-products-list-vertical-cards .theme-product-card'
      );
      expect(Array.from(cards, (card) => card.textContent)).toEqual(['Chair', 'Lamp']);
      expect(state.productParams.at(-1)).toEqual({
        source: 'selected',
        sourceValue: [11, 12],
        perPage: 2,
      });
    });
  });
});
