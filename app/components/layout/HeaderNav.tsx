import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { Image, Link } from '@salla.sa/twilight-theme-engine/common';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  CloseIcon,
  CrownIcon,
  DashboardSquare01Icon,
  DiscountTagIcon,
  LanguagesIcon,
  MapPinIcon,
  Money01Icon,
  NoteIcon,
} from '../icons';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useScrollLock } from '../../hooks/useScrollLock';
import { afterNextPaint } from '../../lib/afterNextPaint';
import { builtInMenuKind, type BuiltInMenuKind } from '../../lib/menuItemKind';
import { openStoreSwitcher, type StoreSwitcher } from '../../lib/storeSwitchers';
import { pruneUntitled } from '../../lib/menuOverflow';

interface HeaderNavProps {
  open: boolean;
  onClose: () => void;
}

/** Keep in sync with the panel transition in `header.scss`. */
const TRANSITION_MS = 320;

/** Nothing to subscribe to: `document.body` only ever differs between server and client. */
const subscribeNothing = () => () => {};

/** A menu item opens a sub-column only when its children are actually present. */
const hasChildren = (item: MenuItem): boolean =>
  Array.isArray(item.children) && item.children.length > 0;

const PLACEHOLDER_ICONS: Record<BuiltInMenuKind, typeof DashboardSquare01Icon> = {
  offers: DiscountTagIcon,
  blog: NoteIcon,
  brands: CrownIcon,
};

/**
 * Stands in for a missing menu image: a grey circle with the page's icon
 * (offers, blog, brands) or a general one for anything else.
 */
function NavImagePlaceholder({ item }: { item: MenuItem }) {
  const kind = builtInMenuKind(item);
  const Icon = kind ? PLACEHOLDER_ICONS[kind] : DashboardSquare01Icon;
  return (
    <span
      className="site-nav-drawer__link-img-placeholder"
      data-kind={kind ?? 'general'}
      aria-hidden="true"
    >
      <Icon className="site-nav-drawer__link-img-icon" />
    </span>
  );
}

/** A real destination — the API uses `#` / empty for "group only" items. */
const isLinkable = (url?: string): url is string => !!url && url !== '#';

/**
 * A row's label — with the merchant's menu image ahead of it on the root level.
 *
 * Root-level rows mix items that do and don't have an image, and merchants
 * reorder/rename them freely, so which rows have one isn't predictable. An
 * image-less row rendered with no reserved space leaves its text flush
 * against the row edge instead of lined up with an image row's text (image
 * width + gap to the right of it) — fine when *no* root row has an image
 * (every row is flush, consistently), wrong the moment even one does. So the
 * placeholder (`NavImagePlaceholder`) is reserved only when the root level
 * actually mixes image and image-less rows (`withImage`, computed once from whether any
 * root item has one — see `NavColumns`), not unconditionally for every
 * root-level row regardless of whether the menu has images at all.
 */
function NavLabel({ item, withImage }: { item: MenuItem; withImage: boolean }) {
  if (!withImage) return <span>{item.title}</span>;
  return (
    <span className="site-nav-drawer__label">
      {item.image ? (
        // Plain <img>: the engine `Image` wraps in a block box (aspect-ratio + sizes) that
        // breaks out of the inline row and ignores the round crop.
        <img
          src={item.image}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          className="site-nav-drawer__link-img"
        />
      ) : (
        <NavImagePlaceholder item={item} />
      )}
      <span>{item.title}</span>
    </span>
  );
}

interface NavColumnProps {
  parent: MenuItem | null;
  items: MenuItem[];
  /** Row whose children are shown in the next column (highlighted as the trail). */
  activeId?: MenuItem['id'];
  /** Fade + slide the rows in (the root column waits for the drawer to arrive). */
  staggered: boolean;
  /** Whether *any* root-level item has an image — reserves the placeholder
   *  spacer for the ones that don't, only when it's actually needed to keep
   *  titles aligned with the rows that do have one. Only matters at the root
   *  (`!parent`); child columns never show images regardless. */
  hasImages: boolean;
  onOpenChild: (item: MenuItem) => void;
  onClose: () => void;
}

/** One Miller column: an optional "browse all" link then the level's rows. */
function NavColumn({
  parent,
  items,
  activeId,
  staggered,
  hasImages,
  onOpenChild,
  onClose,
}: NavColumnProps) {
  const { t } = useTranslation();

  return (
    <ul className={`site-nav-drawer__list${staggered ? ' is-in' : ''}`}>
      {parent && isLinkable(parent.url) && (
        <li>
          <Link to={parent.url} className="site-nav-drawer__browse-all" onClick={onClose}>
            {t('blocks.header.browse_all', 'Browse all')} {parent.title}
          </Link>
        </li>
      )}

      {items.map((item, index) => (
        <li
          key={`${item.id}-${item.url}`}
          style={{ transitionDelay: staggered ? `${index * 40}ms` : '0ms' }}
        >
          {hasChildren(item) ? (
            <button
              type="button"
              className={`site-nav-drawer__link site-nav-drawer__link--parent${
                item.id === activeId ? ' is-active' : ''
              }`}
              aria-expanded={item.id === activeId}
              onClick={() => onOpenChild(item)}
            >
              <NavLabel item={item} withImage={!parent && hasImages} />
              <ArrowRightIcon className="site-nav-drawer__chevron" aria-hidden="true" />
            </button>
          ) : (
            <Link to={item.url} className="site-nav-drawer__link" onClick={onClose}>
              <NavLabel item={item} withImage={!parent && hasImages} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

interface NavHeadProps {
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
}

/** Shared drawer header — a back control (once drilled in), the store logo, close. */
function NavHead({ canGoBack, onBack, onClose }: NavHeadProps) {
  const { t } = useTranslation();
  const { store } = useTwilight();
  const storeName = store?.name || 'Store';
  return (
    <div className="site-nav-drawer__head">
      <div className="site-nav-drawer__head-start">
        {/* Always mounted so the logo slides over when it appears, no jump. */}
        <button
          type="button"
          className={`site-nav-drawer__back${canGoBack ? ' is-visible' : ''}`}
          aria-label={t('blocks.header.back', 'Back')}
          aria-hidden={!canGoBack}
          tabIndex={canGoBack ? undefined : -1}
          onClick={onBack}
        >
          <ArrowLeftIcon aria-hidden="true" />
        </button>
        <a className="site-nav-drawer__brand" href={store?.url || '/'} onClick={onClose}>
          <Image src={store?.logo} alt={`${storeName} logo`} width={140} height={44} priority />
          <span className="sr-only">{storeName}</span>
        </a>
      </div>
      <button
        type="button"
        className="site-nav-drawer__close"
        aria-label={t('blocks.header.close', 'Close')}
        onClick={onClose}
      >
        <CloseIcon aria-hidden="true" />
      </button>
    </div>
  );
}

type Column = { parent: MenuItem | null; items: MenuItem[] };

interface NavColumnsProps {
  columns: Column[];
  itemsIn: boolean;
  menuLabel: string;
  /** On phones this is the single scroller for the whole column stack. */
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onOpenChild: (level: number, item: MenuItem) => void;
  onClose: () => void;
}

/** The sliding viewport holding every column of the current trail. */
function NavColumns({
  columns,
  itemsIn,
  menuLabel,
  viewportRef,
  onOpenChild,
  onClose,
}: NavColumnsProps) {
  // Whether the image/placeholder slot renders at all -- only when the root
  // level actually mixes items that do and don't have one; a menu with no
  // images anywhere just renders every title flush, with nothing reserved.
  const hasImages = columns[0]?.items.some((item) => !!item.image) ?? false;

  return (
    <div ref={viewportRef} className="site-nav-drawer__viewport">
      <div className="site-nav-drawer__track">
        {columns.map((column, level) => (
          <nav
            key={column.parent ? `${column.parent.id}` : 'root'}
            className="site-nav-drawer__panel"
            aria-label={column.parent?.title ?? menuLabel}
          >
            <NavColumn
              parent={column.parent}
              items={column.items}
              hasImages={hasImages}
              activeId={columns[level + 1]?.parent?.id}
              staggered={itemsIn || level > 0}
              onOpenChild={(item) => onOpenChild(level, item)}
              onClose={onClose}
            />
          </nav>
        ))}
      </div>
    </div>
  );
}

/** A footer trigger: leading icon, current-selection label, dropdown caret. */
function LocButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="site-nav-drawer__loc" aria-haspopup="dialog" onClick={onClick}>
      {icon}
      <span className="site-nav-drawer__loc-label">{label}</span>
      <ChevronDownIcon className="site-nav-drawer__loc-caret" aria-hidden="true" />
    </button>
  );
}

/**
 * Sticky footer bar — language, branch and currency triggers. Each closes the
 * drawer first (so the modal isn't stuck behind the drawer's backdrop), then opens
 * it through `openStoreSwitcher` (`lib/storeSwitchers.ts`): the shared modals on
 * the web, the app's own sheets for language and currency inside the Salla app. This bar only reflects the current selection; each trigger shows
 * only when the store has that feature (more than one language / currency, or a
 * scope).
 */
function NavFooter({ onClose, entered }: { onClose: () => void; entered: boolean }) {
  const { t, languageName } = useTranslation();
  const { store, currency } = useTwilight();

  const open = (switcher: StoreSwitcher) => () => {
    onClose();
    openStoreSwitcher(switcher);
  };

  const currencyLabel = currency?.name || currency?.symbol || currency?.code || 'SAR';
  const items: { key: StoreSwitcher; show: boolean; icon: ReactNode; label: string }[] = [
    {
      key: 'language',
      show: !!store?.settings?.is_multilingual,
      icon: <LanguagesIcon className="site-nav-drawer__loc-icon" aria-hidden="true" />,
      label: languageName,
    },
    {
      key: 'branch',
      show: !!store?.scope,
      icon: <MapPinIcon className="site-nav-drawer__loc-icon" aria-hidden="true" />,
      label: store?.scope?.name || t('blocks.header.branches', 'Branches'),
    },
    {
      key: 'currency',
      show: !!store?.settings?.currencies_enabled,
      icon: <Money01Icon className="site-nav-drawer__loc-icon" aria-hidden="true" />,
      label: currencyLabel,
    },
  ];
  const visible = items.filter((item) => item.show);
  if (!visible.length) return null;

  return (
    <div className={`site-nav-drawer__foot${entered ? ' is-in' : ''}`}>
      {visible.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 && <span className="site-nav-drawer__foot-sep" aria-hidden="true" />}
          <LocButton icon={item.icon} label={item.label} onClick={open(item.key)} />
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Drives the drawer's mount lifecycle and staged entrance:
 *  - `mounted` keeps it in the tree through the exit animation,
 *  - `entered` flips the open class (backdrop fade + slide-in),
 *  - `itemsIn` releases the link stagger (and, via a CSS delay, the footer).
 *
 * The entrance runs from a *mount-committed* effect (not the `open` effect) and
 * forces a reflow first, so the closed transform is always painted before the
 * open class flips it — otherwise the slide-in intermittently skipped.
 */
function useDrawerTransition(open: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [itemsIn, setItemsIn] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setEntered(false);
    setItemsIn(false);
    const unmount = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(unmount);
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    void rootRef.current?.offsetWidth;
    const cancelEnter = afterNextPaint(() => setEntered(true));
    const stagger = setTimeout(() => setItemsIn(true), TRANSITION_MS * 0.55);
    return () => {
      cancelEnter();
      clearTimeout(stagger);
    };
  }, [mounted, open]);

  return { rootRef, mounted, entered, itemsIn };
}

/**
 * Primary navigation for the rebuilt header — a slide-in side panel opened by
 * the header's menu button, at every breakpoint.
 *
 * Categories cascade as Miller columns: a wide root column (`--root-col-w`,
 * 400px) lists the top-level items, and tapping a parent opens its children in
 * a **narrower column beside it** (`--child-col-w`, 230px) so the whole trail
 * stays visible. Any depth — each parent with children adds another column;
 * tapping a different parent in an earlier column truncates the trail from
 * there. When the columns outgrow the drawer the track shifts to keep the
 * newest ones in view (RTL-aware); phones fall back to one full-width column
 * that pushes one level per tap. See `04-components/header.scss`.
 *
 * Animation is theme-owned (the engine `Drawer` mounts already in place, so it
 * can't transition): `mounted` keeps the drawer in the tree through its exit,
 * `entered` drives the backdrop fade + drawer slide, and `itemsIn` staggers the
 * root column's links in once the drawer has arrived. Data is the store's
 * `menus/header`, so the merchant dashboard drives it unchanged. Styling:
 * `04-components/header.scss`.
 */
export const HeaderNav = memo(function HeaderNav({ open, onClose }: HeaderNavProps) {
  const { data: rawItems = [] } = useQuery(menu.queries.header());
  const items = useMemo(() => pruneUntitled(rawItems), [rawItems]);

  const { rootRef, mounted, entered, itemsIn } = useDrawerTransition(open);

  if (!mounted) return null;

  return (
    <HeaderNavDrawer
      items={items}
      rootRef={rootRef}
      entered={entered}
      itemsIn={itemsIn}
      onClose={onClose}
    />
  );
});

interface HeaderNavDrawerProps {
  items: MenuItem[];
  rootRef: React.RefObject<HTMLDivElement | null>;
  entered: boolean;
  itemsIn: boolean;
  onClose: () => void;
}

/**
 * The drawer itself. It only exists while `useDrawerTransition` keeps the
 * drawer mounted, so every opening is a fresh mount and the trail starts at the
 * root column. That replaces an effect that reset the trail whenever `open`
 * flipped, which cost an extra render with the old trail first.
 */
function HeaderNavDrawer({ items, rootRef, entered, itemsIn, onClose }: HeaderNavDrawerProps) {
  const { t } = useTranslation();
  const drawerRef = useRef<HTMLDivElement>(null);
  // On phones the viewport is the single scroller for the whole column stack.
  const viewportRef = useRef<HTMLDivElement>(null);
  const depthRef = useRef(0);
  // Move focus into the drawer on open, trap Tab, restore it to the menu button
  // on close.
  useDialogFocus(drawerRef, entered);
  // The chain of opened parents; one extra column is shown per entry.
  const [path, setPath] = useState<MenuItem[]>([]);

  // Drilling into a child slides a new column in, but the shared mobile
  // scroller keeps the parent's scroll offset — so the child opened part-way
  // down, hiding its first rows. Snap the viewport back to the top whenever the
  // trail gets deeper (leave it alone on Back, so the parent stays where it was).
  useEffect(() => {
    if (path.length > depthRef.current && viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
    depthRef.current = path.length;
  }, [path.length]);

  // Escape closes the last column, then the drawer at the root. The `onClose`
  // side effect lives here, outside the `setPath` updater — React may
  // re-invoke an updater more than once, and it must stay pure.
  const onEscapeEvent = useEffectEvent(() => {
    if (path.length === 0) {
      onClose();
      return;
    }
    setPath((prev) => prev.slice(0, -1));
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscapeEvent();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Open `item` as the column after `level`, dropping any columns deeper than it.
  const openChild = useCallback(
    (level: number, item: MenuItem) => setPath((prev) => [...prev.slice(0, level), item]),
    []
  );
  const goBack = useCallback(() => setPath((prev) => prev.slice(0, -1)), []);

  // Root column + one column per opened parent. All stay mounted so the track
  // can slide either way.
  const columns = useMemo<Column[]>(
    () => [
      { parent: null, items },
      ...path.map((parent) => ({ parent, items: parent.children ?? [] })),
    ],
    [items, path]
  );

  // Where the drawer portals to, read as a store snapshot rather than as
  // `document.body` during render. The server snapshot is `null`, so SSR never
  // reads a browser global and hydration sees the same empty output.
  const portalTarget = useSyncExternalStore(
    subscribeNothing,
    () => document.body,
    () => null
  );

  if (!portalTarget) return null;

  const menuLabel = t('blocks.header.main_menu', 'Menu');

  return createPortal(
    <div
      ref={rootRef}
      className={`site-nav-drawer-root${entered ? ' is-open' : ''}`}
      // useDialogFocus traps Tab and Escape closes the drawer, which is what the
      // rule asks <dialog> for: see .react-doctor/false-positives.md.
      // react-doctor-disable-next-line react-doctor/prefer-html-dialog
      role="dialog"
      aria-modal="true"
      aria-label={menuLabel}
    >
      <div className="site-nav-drawer__backdrop" role="presentation" onClick={onClose} />

      <div
        ref={drawerRef}
        tabIndex={-1}
        className="site-nav-drawer"
        style={{ '--col-count': columns.length } as CSSProperties}
      >
        <NavHead canGoBack={path.length > 0} onBack={goBack} onClose={onClose} />
        <NavColumns
          columns={columns}
          itemsIn={itemsIn}
          menuLabel={menuLabel}
          viewportRef={viewportRef}
          onOpenChild={openChild}
          onClose={onClose}
        />
        <NavFooter onClose={onClose} entered={itemsIn} />
      </div>
    </div>,
    portalTarget
  );
}
