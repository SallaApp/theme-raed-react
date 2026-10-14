import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SallaMenu, SallaMenuCore } from '@salla.sa/twilight-components-react/menu';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import { MORE_MENU_ATTR, fitCount, splitMenu, withSafeAttrs } from '../../lib/menuOverflow';

/**
 * A root item of `<salla-menu>`. Twilight 3.x calls it `.s-menu-root-level`; 2.14,
 * which a store pinned to it loads from the CDN, calls it `.root-level`.
 */
const ROOT_ITEM = ':is(.s-menu-root-level, .root-level)';

/** What one measurement of the full, one-line menu found. */
interface Measured {
  /** Which menu it measured (see `menuKey`), so a new menu is measured again. */
  key: string;
  widths: number[];
  more: number;
  gap: number;
}

/** A short, stable key for a menu: its items' ids and titles, top level only. */
function menuKey(items: { id: unknown; title?: string }[]): string {
  const text = items.map((item) => `${String(item.id)}:${item.title ?? ''}`).join('|');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `${items.length}-${(hash >>> 0).toString(36)}`;
}

/** Stops the "More" item's `#` link from jumping to the top; it opens on hover / focus. */
function preventMoreJump(event: MouseEvent<HTMLElement>) {
  const target = event.target as HTMLElement;
  if (target.closest(`[${MORE_MENU_ATTR}] > a`)) event.preventDefault();
}

/**
 * The default layout's main menu (`lg+`), kept to one line.
 *
 * With `enable_more_menu` on (the default), items that don't fit move into a
 * last "More" item and open from its dropdown. `<salla-menu>` has no overflow
 * handling of its own, so the theme fetches the header menu, measures it and
 * hands `<salla-menu>` the result as JSON:
 *
 * 1. The whole menu renders once on one line, clipped, and each root item's
 *    width is read. That happens again only when the menu itself changes
 *    (another language, a merchant edit).
 * 2. On every resize, those widths decide how many items fit, and the rest go
 *    into "More".
 *
 * `<salla-menu>` reads `sourceValue` only when it loads, so a new split remounts
 * it (`key`). With the setting off, the menu renders as before, wrapping onto
 * more lines when it has to.
 */
export function HeaderMainMenu() {
  const { theme } = useTwilight();
  const { t } = useTranslation();
  const enabled =
    (theme?.settings as { enable_more_menu?: boolean } | undefined)?.enable_more_menu !== false;

  if (!enabled) return <SallaMenu source="header" suppressHydrationWarning />;
  return <OneLineMenu moreTitle={t('common.titles.more', 'More')} />;
}

function OneLineMenu({ moreTitle }: { moreTitle: string }) {
  const { data: rawItems = [] } = useQuery(menu.queries.header());
  const items = useMemo(() => withSafeAttrs(rawItems), [rawItems]);
  const key = useMemo(() => menuKey(items), [items]);

  const rootRef = useRef<HTMLDivElement>(null);
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

  // Track the width the row has to fill.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setAvailable(root.clientWidth));
    observer.observe(root);
    setAvailable(root.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Measure the full menu once `<salla-menu>` has rendered every root item.
  useEffect(() => {
    const root = rootRef.current;
    if (current || !root || !items.length) return;

    const measure = (): boolean => {
      const list = root.querySelector<HTMLElement>('salla-menu .main-menu');
      const lis = root.querySelectorAll<HTMLElement>(`salla-menu .main-menu > ${ROOT_ITEM}`);
      if (!list || lis.length !== items.length) return false;
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      setMeasured({
        key,
        widths: Array.from(lis, (li) => li.getBoundingClientRect().width),
        more: probeRef.current?.getBoundingClientRect().width ?? 0,
        gap,
      });
      return true;
    };

    if (measure()) return;
    const observer = new MutationObserver(() => {
      if (measure()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [current, items, key]);

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
    <div
      ref={rootRef}
      className={`site-header__oneline-menu${current ? '' : ' is-measuring'}`}
      onClickCapture={preventMoreJump}
    >
      {/* Core, not the lazy `SallaMenu`: that one shows a skeleton until it scrolls
          into view, and again after every remount below, so there would be
          nothing to measure until it did. */}
      <SallaMenuCore
        key={current ? `${key}-${fit}` : `${key}-measure`}
        source="json"
        sourceValue={JSON.stringify(shown)}
        suppressHydrationWarning
      />
      {/* Sizes the "More" item before it exists, styled like a root item. */}
      <ul className="main-menu site-header__more-probe" aria-hidden="true">
        <li
          ref={probeRef}
          className="s-menu-root-level root-level s-menu-has-children has-children"
        >
          <a tabIndex={-1}>
            <span>{moreTitle}</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
