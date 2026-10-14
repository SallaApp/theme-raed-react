import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import { ProductCard } from '../product/ProductCard';
import {
  MORE_MENU_ATTR,
  MORE_MENU_ID,
  fitCount,
  menuProductIds,
  panelColumns,
  pruneUntitled,
  splitMenu,
} from '../../lib/menuOverflow';

/** Layout effects measure before paint; on the server there is nothing to measure. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const NO_ITEMS: MenuItem[] = [];

/** What one measurement of the full, one-line menu found. */
interface Measured {
  /** Which menu it measured (see `menuKey`), so a new menu is measured again. */
  key: string;
  widths: number[];
  more: number;
  gap: number;
}

/**
 * A short, stable key for what decides the root items' widths: each one's id,
 * title, and whether it has children (which adds a caret).
 */
function menuKey(items: MenuItem[]): string {
  const text = items
    .map((item) => `${String(item.id)}:${item.title ?? ''}:${item.children?.length ? 1 : 0}`)
    .join('|');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `${items.length}-${(hash >>> 0).toString(36)}`;
}

/** The "More" link only opens its dropdown (on hover / focus); it goes nowhere. */
const preventJump = (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault();

/**
 * The default layout's main menu (`lg+`).
 *
 * Rendered by the theme rather than by `<salla-menu>`, so a mega panel's
 * featured products are the theme's own {@link ProductCard} — the same card as
 * every product list — and the markup is the same on every Twilight version.
 * Data is the store's `menus/header`, the drawer's source too.
 *
 * With `enable_more_menu` on (the default) the menu stays on one line: items
 * that don't fit move into a last "More" item. Off, it wraps onto more lines.
 */
export function HeaderMainMenu() {
  const { theme } = useTwilight();
  const { t } = useTranslation();
  const oneLine =
    (theme?.settings as { enable_more_menu?: boolean } | undefined)?.enable_more_menu !== false;
  const { data: rawItems = NO_ITEMS } = useQuery(menu.queries.header());
  const items = useMemo(() => pruneUntitled(rawItems), [rawItems]);

  if (!oneLine) {
    return (
      <ul className="main-menu">
        <MenuItems items={items} root />
      </ul>
    );
  }
  return <OneLineMenu items={items} moreTitle={t('common.titles.more', 'More')} />;
}

/**
 * The menu kept to one line.
 *
 * 1. The whole menu renders once, clipped to one line, and each root item's
 *    width is read before the browser paints. That happens again only when the
 *    menu itself changes (another language, a merchant edit) or once the web
 *    font has loaded.
 * 2. On every resize, those widths decide how many items fit; the rest become
 *    the children of a last "More" item.
 */
function OneLineMenu({ items, moreTitle }: { items: MenuItem[]; moreTitle: string }) {
  const key = useMemo(() => menuKey(items), [items]);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const probeRef = useRef<HTMLLIElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [available, setAvailable] = useState(0);

  const current = measured?.key === key ? measured : null;
  const fit = current
    ? fitCount(current.widths, available, current.more, current.gap)
    : items.length;
  const shown = useMemo(
    () => (current ? splitMenu(items, fit, moreTitle) : items),
    [current, items, fit, moreTitle]
  );

  // Measure the full menu, before it paints. Below `lg` the row is hidden and
  // everything measures 0, so it waits until the row has a width (the resize
  // observer below updates `available`, which runs this again).
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (current || !root || !list || !items.length) return;
    const width = root.clientWidth;
    setAvailable(width);
    if (width === 0) return;
    const lis = list.querySelectorAll<HTMLElement>(':scope > .s-menu-root-level');
    setMeasured({
      key,
      widths: Array.from(lis, (li) => li.getBoundingClientRect().width),
      more: probeRef.current?.getBoundingClientRect().width ?? 0,
      gap: parseFloat(getComputedStyle(list).columnGap) || 0,
    });
  }, [current, items, key, available]);

  // Track the width the row has to fill.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setAvailable(root.clientWidth));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Text measured before the web font loaded is narrower than it will be.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded') {
      return;
    }
    let active = true;
    document.fonts.ready.then(() => {
      if (active) setMeasured(null);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div ref={rootRef} className={`site-header__oneline-menu${current ? '' : ' is-measuring'}`}>
      <ul ref={listRef} className="main-menu">
        <MenuItems items={shown} root />
      </ul>
      {/* Sizes the "More" item before it exists, styled like a root item. */}
      <ul className="main-menu site-header__more-probe" aria-hidden="true">
        <li ref={probeRef} className="s-menu-root-level s-menu-has-children">
          <a tabIndex={-1}>
            <span>{moreTitle}</span>
          </a>
        </li>
      </ul>
    </div>
  );
}

function MenuItems({ items, root }: { items: MenuItem[]; root: boolean }) {
  return (
    <>
      {items.map((item) => (
        <MenuEntry key={`${String(item.id)}-${item.url}`} item={item} root={root} />
      ))}
    </>
  );
}

/**
 * One menu item: its link, and a panel of its children when it has any. With
 * featured products it is a mega panel, which loads them the first time it
 * opens rather than with the page.
 */
function MenuEntry({ item, root }: { item: MenuItem; root: boolean }) {
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const productIds = hasChildren ? menuProductIds(item) : [];
  const isMega = productIds.length > 0;
  const isMore = item.id === MORE_MENU_ID;
  const [opened, setOpened] = useState(false);
  const [placement, setPlacement] = useState<NestedPlacement>(END_PLACEMENT);
  const [shift, setShift] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  /** The panel's own width, read while it isn't capped to the room beside it. */
  const naturalWidth = useRef(0);
  // A long list grows sideways rather than past the bottom of the screen, where
  // a fixed header leaves no way to scroll to it. Every panel, at every level.
  const columns = panelColumns(children.length);

  const onOpen = (event: { currentTarget: HTMLLIElement }) => {
    if (isMega) setOpened(true);
    // A nested panel opens past its row's end edge (left in Arabic) when it fits
    // there, else on the other side if it fits there; with room on neither, on
    // the roomier side, narrowed to fit.
    if (!root && panelRef.current) {
      if (placement.maxWidth === undefined) naturalWidth.current = panelRef.current.offsetWidth;
      setPlacement(placeNested(event.currentTarget, naturalWidth.current));
    }
    // A first-level panel (a wide one with columns, or "More") is moved back
    // inside the window when it would cross its edge. A mega panel already
    // spans the header row.
    if (root && !isMega && panelRef.current) {
      setShift(shiftIntoView(panelRef.current, shift));
    }
  };

  const className = [
    root ? 's-menu-root-level' : 's-menu-non-root-level',
    hasChildren && 's-menu-has-children',
    isMega && 's-menu-mega-menu',
    placement.start && 's-menu-opens-start',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      className={className}
      {...(isMore ? { [MORE_MENU_ATTR]: 'true' } : {})}
      {...(hasChildren ? { onMouseEnter: onOpen, onFocus: onOpen } : {})}
    >
      {isMore ? (
        <a href="#" role="button" aria-haspopup="true" onClick={preventJump}>
          <span>{item.title}</span>
        </a>
      ) : (
        <Link
          to={item.url}
          {...(item.target && item.target !== '_self'
            ? { target: item.target, rel: 'noopener noreferrer' }
            : {})}
        >
          <span>{item.title}</span>
        </Link>
      )}
      {hasChildren && (
        <div
          ref={panelRef}
          // A mega panel whose links need columns stacks its products below
          // them: beside them, the cards would be left too little width.
          className={`s-menu-sub-menu${isMega && columns > 1 ? ' is-stacked' : ''}`}
          {...(shift || placement.maxWidth !== undefined
            ? {
                style: {
                  ...(shift ? { '--panel-shift': `${shift}px` } : {}),
                  ...(placement.maxWidth !== undefined
                    ? { '--panel-max': `${placement.maxWidth}px` }
                    : {}),
                } as CSSProperties,
                ...(placement.maxWidth !== undefined ? { 'data-capped': 'true' } : {}),
              }
            : {})}
        >
          <ul
            {...(columns > 1
              ? {
                  className: 's-menu-columns',
                  style: { '--menu-columns': columns } as CSSProperties,
                }
              : {})}
          >
            <MenuItems items={children} root={false} />
          </ul>
          {isMega && opened && <MegaProducts ids={productIds} />}
        </div>
      )}
    </li>
  );
}

/** Space kept between a panel and the window's edge. */
const VIEWPORT_MARGIN = 8;

/** Where a nested panel opens: toward its row's start or end, and capped to a width or not. */
interface NestedPlacement {
  start: boolean;
  maxWidth?: number;
}

const END_PLACEMENT: NestedPlacement = { start: false };

/**
 * Where a nested panel `width` px wide opens beside its row. Past the row's end
 * edge (left of it in a right-to-left page) when it fits there; else past its
 * start edge when it fits there; else on the roomier side, capped to that room.
 */
function placeNested(row: HTMLElement, width: number): NestedPlacement {
  const rect = row.getBoundingClientRect();
  const rtl = getComputedStyle(row).direction === 'rtl';
  const left = rect.left - VIEWPORT_MARGIN;
  const right = window.innerWidth - rect.right - VIEWPORT_MARGIN;
  const roomEnd = rtl ? left : right;
  const roomStart = rtl ? right : left;
  if (roomEnd >= width) return END_PLACEMENT;
  if (roomStart >= width) return { start: true };
  const start = roomStart > roomEnd;
  return { start, maxWidth: Math.max(0, Math.floor(start ? roomStart : roomEnd)) };
}

/**
 * How far (in px, positive to the right) to move a panel so it stays inside the
 * window. `current` is the shift already applied, which its position includes.
 */
function shiftIntoView(panel: HTMLElement, current: number): number {
  const rect = panel.getBoundingClientRect();
  const left = rect.left - current;
  const right = left + rect.width;
  const max = window.innerWidth - VIEWPORT_MARGIN;
  let next = 0;
  if (right > max) next = max - right;
  if (left + next < VIEWPORT_MARGIN) next = VIEWPORT_MARGIN - left;
  return Math.round(next);
}

/** Space left under a mega panel's products, and the least height they keep. */
const PRODUCTS_BOTTOM_GAP = 32;
const PRODUCTS_MIN_HEIGHT = 160;

/**
 * A mega panel's featured products, as the theme's product cards in its product
 * grid. Capped to the room left in the window below them, and scrollable within
 * it: a fixed header leaves no other way to reach a card that falls below the
 * window. Only this area scrolls, never the panel, whose links' nested menus
 * would be clipped by a scrolling box.
 */
function MegaProducts({ ids }: { ids: number[] }) {
  const { data } = useQuery(
    product.queries.list({ source: 'selected', sourceValue: ids, perPage: ids.length })
  );
  const products = data?.items ?? [];
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setMaxHeight(
        Math.max(
          PRODUCTS_MIN_HEIGHT,
          Math.floor(window.innerHeight - el.getBoundingClientRect().top - PRODUCTS_BOTTOM_GAP)
        )
      );
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [products.length]);

  if (!products.length) return null;
  return (
    <div
      ref={ref}
      className="s-menu-products-wrapper"
      {...(maxHeight ? { style: { maxHeight } } : {})}
    >
      <div className="s-products-list-wrapper s-products-list-vertical-cards">
        {products.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </div>
  );
}
