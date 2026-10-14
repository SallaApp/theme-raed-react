import { useEffect, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SallaSearch } from '@salla.sa/twilight-components-react/search';
import { SallaSocial } from '@salla.sa/twilight-components-react/social';
import { SallaUserMenu } from '@salla.sa/twilight-components-react/user-menu';
import { SallaCartSummary } from '@salla.sa/twilight-components-react/cart-summary';
import { useTwilight, useIsHome } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { PageAdvertisements } from '@salla.sa/twilight-theme-engine/layout';
import { MapPinIcon, SearchIcon, ShoppingBagIcon } from '../icons';
import { useHydrated } from '../../hooks/useHydrated';
import { useAppSafeAreaTop } from '../../hooks/useAppSafeAreaTop';
import { HOME_ROUTE_ID, PRODUCT_ROUTE_ID } from '../../lib/routeIds';
import { HeaderMainMenu } from './HeaderMainMenu';
import { HeaderNav } from './HeaderNav';
import { HeaderTopnav } from './HeaderTopnav';

/** Opens the Salla search modal (the `<SallaSearch />` at the end of the header). */
const openSearch = () => window.salla?.event?.dispatch('search::open');

const openScopes = () => window.salla?.event?.dispatch('scopes::open');

// What the component will render: <salla-social> skips WhatsApp.
const hasSocialLinks = (social?: object) =>
  Object.entries(social ?? {}).some(([key, value]) => Boolean(value) && key !== 'whatsapp');

/** Search trigger — opens the Salla search modal via the `search::open` event. */
function SearchButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="header-action site-header__search"
      aria-label={label}
      onClick={openSearch}
    >
      <SearchIcon aria-hidden="true" />
    </button>
  );
}

/** Branch / scope trigger — opens `<SallaScopes>` (mounted in `ThemeLayout`) via the
 * `scopes::open` event. Icon-only; the current scope name is the accessible label. */
function ScopeButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-testid="store-header-scope-btn"
      className="header-action site-header__scope"
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      onClick={openScopes}
    >
      <MapPinIcon aria-hidden="true" />
    </button>
  );
}

/** Store name, description and social links, under the main bar. The store's
 *  phone and email are in the footer, under its description. */
function HeaderIntro() {
  const { store } = useTwilight();
  const isHome = useIsHome();
  const hydrated = useHydrated();
  // `useIsHome()` can resolve differently on the server (e.g. on a 404), and an
  // `<h1>` ⇄ `<p>` swap is an unrecoverable hydration mismatch. Render `<p>`
  // through SSR + first paint, then upgrade to `<h1>` on the home page.
  const Title = hydrated && isHome ? 'h1' : 'p';
  const hasSocial = hasSocialLinks(store?.social);

  return (
    <div className="site-header__intro">
      <div className="container site-header__intro-inner">
        <Title className="site-header__intro-title">{store?.name}</Title>
        {store?.description && (
          <div
            className="site-header__intro-text"
            // Merchant-authored HTML, mirrors the Twig theme's `store.description|raw`.
            dangerouslySetInnerHTML={{ __html: store.description }}
          />
        )}
        {/* The slot reserves the loaded row's space in the SSR HTML (header.scss). */}
        <div className={`site-header__social-slot${hasSocial ? ' has-links' : ''}`}>
          <SallaSocial className="site-header__social" />
        </div>
      </div>
    </div>
  );
}

/**
 * Rebuilt storefront header — swapped in via `<TwilightProvider layout={ThemeLayout}>`.
 *
 * Two layouts, chosen by the `header_layout` theme setting:
 *  - **lite** (default): centered logo, a menu button that opens the slide-in
 *    drawer, action icons, then a store-name / description / social row.
 *  - **default**: a `lg+` top bar ({@link HeaderTopnav}) with the footer menu +
 *    language / branch / currency switchers, then a row of logo · horizontal
 *    mega-menu (`HeaderMainMenu`) · action icons. Below `lg` it collapses to the
 *    same mobile bar as lite (burger + drawer + icons).
 *
 * The menu opens a slide-in drawer at every breakpoint ({@link HeaderNav}); the
 * search icon opens the Salla search modal through the `search::open` event
 * (the `<SallaSearch />` instance mounted at the end of this header). Styling
 * lives in `styles/04-components/header.scss`. The `header:start` / `header:end`
 * hook slots are kept for installed apps.
 *
 * The drawer's open state can be lifted: pass `navOpen` + `onNavOpenChange` and
 * the header renders controlled (ThemeLayout does this so the mobile bottom bar
 * shares the same drawer). Left unset, the header owns the state itself.
 */
interface HeaderProps {
  navOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
}

export function Header({ navOpen: navOpenProp, onNavOpenChange }: HeaderProps = {}) {
  const { store, theme } = useTwilight();
  const { t } = useTranslation();
  const isDefaultLayout = theme?.settings?.header_layout === 'default';
  const stickyEnabled = theme?.settings?.header_is_sticky !== false;
  const [navOpenState, setNavOpenState] = useState(false);
  const navOpen = navOpenProp ?? navOpenState;
  const setNavOpen = (open: boolean) => {
    if (navOpenProp === undefined) setNavOpenState(open);
    onNavOpenChange?.(open);
  };
  const [scrolled, setScrolled] = useState(false);
  // Route match, not the `body` route class (`ROUTE_CLASS_MAP`, set from a
  // client effect) — during a pending client-side navigation *into* the
  // product page the body class can still read the *previous* route for a
  // moment (e.g. `.index`), leaving the mobile header visible until the
  // navigation settles. This is correct from the first tick of the
  // transition, matching `MobilePageTitleBar`'s product-page check.
  const isProductPage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === PRODUCT_ROUTE_ID),
  });
  // Same for home: `body.index` only exists after hydration, so the SSR home
  // page painted with the mobile header collapsed and then grew (CLS 0.38).
  const isHomePage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === HOME_ROUTE_ID),
  });
  // Store name, description, social and contacts under the logo: lite layout only,
  // when `header_show_store_info` is on, and on the home page alone unless
  // `header_store_info_home_only` is turned off.
  const introSettings = theme?.settings as
    | { header_show_store_info?: boolean; header_store_info_home_only?: boolean }
    | undefined;
  const showIntro =
    !isDefaultLayout &&
    introSettings?.header_show_store_info !== false &&
    (introSettings?.header_store_info_home_only === false || isHomePage);
  // Marker in the flow, right where the main bar sits. The bar pins once this
  // scrolls out the top of the viewport (see below).
  const stickySentinelRef = useRef<HTMLDivElement>(null);
  // Inside the Salla app the pinned bar sits below the status bar, so it must
  // pin when the sentinel reaches that line, not the screen's top edge.
  const safeTop = useAppSafeAreaTop();

  // Pin the main bar on scroll.
  //  - lite: near-immediately, once the page moves off the top;
  //  - default: only once the whole stack above the bar (ad + top bar) has
  //    scrolled away and the bar itself reaches the viewport edge. An
  //    IntersectionObserver on a zero-height sentinel does this without the
  //    boundary flicker a scrollY threshold would have (the sentinel keeps its
  //    place when the bar goes `position: fixed`, since `__bar-outer` reserves
  //    the height).
  useEffect(() => {
    if (!stickyEnabled) {
      setScrolled(false);
      return;
    }

    if (!isDefaultLayout) {
      const onScroll = () => setScrolled(window.scrollY > 4);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const sentinel = stickySentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: `-${safeTop}px 0px 0px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isDefaultLayout, stickyEnabled, safeTop]);

  const searchLabel = t('blocks.header.search', 'Search');

  return (
    <header
      className={`site-header site-header--${isDefaultLayout ? 'default' : 'lite'}${
        isProductPage ? ' site-header--product' : ''
      }${isHomePage ? ' site-header--home' : ''}`}
      suppressHydrationWarning
    >
      <HookSlot name="header:start" />

      <div className="site-header__ad">
        <PageAdvertisements />
      </div>

      {/* "Delivering to …" tag (bullet delivery). Phones get it above the bars; on
          desktop it sits in the top nav (default layout) or its own slim row (lite).
          The element renders nothing when the store / market has no bullet delivery. */}
      <div className="site-header__bullet lg:hidden">
        <salla-bullet-delivery-tag data-testid="store-header-bullet-delivery-mobile" />
      </div>
      {isDefaultLayout ? (
        <HeaderTopnav />
      ) : (
        <div className="site-header__bullet site-header__bullet--desktop hidden lg:block">
          <div className="container">
            <salla-bullet-delivery-tag data-testid="store-header-bullet-delivery-desktop" />
          </div>
        </div>
      )}

      {isDefaultLayout && (
        <div ref={stickySentinelRef} className="site-header__sticky-sentinel" aria-hidden="true" />
      )}

      <div className="site-header__bar-outer">
        <div className={`site-header__bar${scrolled ? ' is-scrolled' : ''}`}>
          <div className="container site-header__bar-inner">
            <div className="site-header__nav-toggle">
              <button
                type="button"
                className="header-action"
                aria-label={t('blocks.header.main_menu', 'Menu')}
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
              >
                {/* CSS burger — staggered bars that even out on hover/focus
                    (styles: header.scss `.site-header__burger`). */}
                <span className="site-header__burger" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>

            <a className="site-header__brand" href={store?.url || '/'}>
              <Image
                src={store?.logo}
                alt={`${store?.name || 'Store'} logo`}
                priority
                width={140}
                height={48}
              />
              <span className="sr-only">{store?.name || 'Store'}</span>
            </a>

            {isDefaultLayout && (
              <nav
                className="site-header__mainmenu"
                aria-label={t('blocks.header.main_menu', 'Menu')}
              >
                <HeaderMainMenu />
              </nav>
            )}

            <div className="site-header__actions">
              <SallaUserMenu avatarOnly showHeader relativeDropdown className="header-action" />
              {store?.scope && (
                <ScopeButton label={store.scope.name || t('blocks.header.branches', 'Branches')} />
              )}
              <SallaCartSummary className="header-action">
                <ShoppingBagIcon slot="icon" aria-hidden="true" />
              </SallaCartSummary>
              <SearchButton label={searchLabel} />
            </div>
          </div>
        </div>
      </div>

      {showIntro && <HeaderIntro />}

      <HeaderNav open={navOpen} onClose={() => setNavOpen(false)} />

      <SallaSearch suppressHydrationWarning />

      <HookSlot name="header:end" />
    </header>
  );
}
