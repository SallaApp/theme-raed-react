import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import themeTranslations from 'virtual:twilight/theme-translations';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useUser } from '@salla.sa/twilight-theme-engine/hooks/useUser';
import { Footer } from '@salla.sa/twilight-theme-engine/layout';
import { Header } from './Header';
import { ImportantLinksSheet } from './ImportantLinksSheet';
import { MobileAccountSheet } from './MobileAccountSheet';
import { MobileBottomBar } from './MobileBottomBar';
import { MobilePageTitleBar } from './MobilePageTitleBar';
import { fillComponentTranslations, type ComponentLang } from '../../lib/componentTranslations';

/**
 * Theme layout — passed to `<TwilightProvider layout={ThemeLayout}>` in
 * `app/routes/__root.tsx` to swap in the rebuilt {@link Header} and the same
 * global modals (offer / login / scopes) as the engine's `MasterLayout`.
 *
 * `Footer` is the engine's own shared component (`@salla.sa/twilight-theme-engine/layout`)
 * now, not a theme-owned fork -- `Header` stays theme-owned since it's deeply
 * specific to this theme's nav/search/account UI.
 */
const SallaLoginModal = lazy(() =>
  import('@salla.sa/twilight-components-react/login-modal').then((m) => ({
    default: m.SallaLoginModal,
  }))
);
const SallaScopes = lazy(() =>
  import('@salla.sa/twilight-components-react/scopes').then((m) => ({
    default: m.SallaScopes,
  }))
);
const SallaOfferModal = lazy(() =>
  import('@salla.sa/twilight-components-react/offer-modal').then((m) => ({
    default: m.SallaOfferModal,
  }))
);
const SallaLocalizationModal = lazy(() =>
  import('@salla.sa/twilight-components-react/localization-modal').then((m) => ({
    default: m.SallaLocalizationModal,
  }))
);

export interface ThemeLayoutProps {
  children: ReactNode;
}

const IMG_RATIOS = ['square', 'landscape', 'portrait'] as const;
type ImgRatio = (typeof IMG_RATIOS)[number];

/** Read the `product_card_img_ratio` dropdown setting (string, or `[{value}]`). */
function productImageRatio(raw: unknown): ImgRatio {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const value =
    typeof first === 'string' ? first : (first as { value?: string } | undefined)?.value;
  return (IMG_RATIOS as readonly string[]).includes(value ?? '') ? (value as ImgRatio) : 'square';
}

/**
 * The engine's shared modals ThemeLayout mounts globally, each gated on
 * whether the store actually needs it: the offer modal always, the
 * language / currency switcher only when the store has more than one of
 * either, the login modal only for a guest, scopes only when the store has
 * one. Split out from {@link ThemeLayout} itself so that component stays
 * about the page structure (header, footer, bottom bar, sheets) rather than
 * also carrying every modal's own gating condition.
 */
function GlobalModals() {
  const { store, currency } = useTwilight();
  const { locale } = useTranslation();
  const { isLoggedIn } = useUser();
  const showLocalization =
    !!store?.settings?.is_multilingual || !!store?.settings?.currencies_enabled;

  return (
    <>
      <Suspense>
        <SallaOfferModal />
      </Suspense>

      {/* Language / currency switcher — the header nav's sticky footer buttons
          dispatch `localization::open`; mount the modal here since our Header
          replaces the engine one that normally hosts it. */}
      {showLocalization && (
        <Suspense>
          <SallaLocalizationModal
            language={locale}
            currency={currency?.code || 'SAR'}
            suppressHydrationWarning
          />
        </Suspense>
      )}

      {!isLoggedIn && (
        <Suspense>
          <SallaLoginModal
            isEmailAllowed={store?.settings?.auth?.email_allowed}
            isMobileAllowed={store?.settings?.auth?.mobile_allowed}
            suppressHydrationWarning
          />
        </Suspense>
      )}

      {store?.scope && (
        <Suspense>
          <SallaScopes
            selection={store?.scope?.display_as === 'popup' ? 'mandatory' : 'optional'}
            suppressHydrationWarning
          />
        </Suspense>
      )}
    </>
  );
}

export function ThemeLayout({ children }: ThemeLayoutProps) {
  const { theme } = useTwilight();
  // Owned here so the header's nav drawer and the mobile bottom bar's Categories
  // tab drive the same slide-in panel.
  const [navOpen, setNavOpen] = useState(false);
  // The mobile bottom bar's My Account tab opens this sheet (the customer's
  // links, settings, contacts and the footer widgets, which the page footer
  // doesn't show on mobile).
  const [accountOpen, setAccountOpen] = useState(false);
  // Its own "Important links" row opens this one in turn -- a second
  // full-screen sheet for the footer menu, not a drill-in within the first.
  const [importantLinksOpen, setImportantLinksOpen] = useState(false);

  // Close every sheet/drawer on any route change — a bottom-bar tab (Home,
  // Cart) or a link inside one of them navigates without touching their own
  // state, so they would otherwise stay open over the new page.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setNavOpen(false);
    setAccountOpen(false);
    setImportantLinksOpen(false);
  }, [pathname]);

  // Fill the web components' strings the store's pack lacks from the theme's
  // locale files, each time a pack loads (`subscribe` also runs at once when one already has).
  useEffect(() => {
    const lang = window.salla?.lang as
      | (ComponentLang & { subscribe?: (fn: () => void) => () => void })
      | undefined;
    if (typeof lang?.subscribe !== 'function' || typeof lang.add !== 'function') return;
    return lang.subscribe(() => fillComponentTranslations(lang, themeTranslations));
  }, []);

  const imgRatio = productImageRatio(theme?.settings?.product_card_img_ratio);

  return (
    <>
      <div
        className={`app-inner flex flex-col min-h-full product-card-img--${imgRatio}`}
        suppressHydrationWarning
      >
        <Header navOpen={navOpen} onNavOpenChange={setNavOpen} />
        <MobilePageTitleBar />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
        <MobileBottomBar
          navOpen={navOpen}
          onOpenNav={() => setNavOpen(true)}
          onCloseNav={() => setNavOpen(false)}
          accountOpen={accountOpen}
          onAccountOpenChange={setAccountOpen}
          secondSheetOpen={importantLinksOpen}
          onCloseSecondSheet={() => setImportantLinksOpen(false)}
        />
      </div>

      <MobileAccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onOpenImportantLinks={() => {
          setAccountOpen(false);
          setImportantLinksOpen(true);
        }}
      />

      <ImportantLinksSheet open={importantLinksOpen} onClose={() => setImportantLinksOpen(false)} />

      <GlobalModals />
    </>
  );
}
