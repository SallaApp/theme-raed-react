import { useState } from 'react';
import { SallaAppsIcons } from '@salla.sa/twilight-components-react/apps-icons';
import { SallaContacts } from '@salla.sa/twilight-components-react/contacts';
import { SallaSocial } from '@salla.sa/twilight-components-react/social';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { SallaTrustBadges } from '@salla.sa/twilight-components-react/trust-badges';
import { SallaPayments } from '@salla.sa/twilight-components-react/payments';
import { useQuery } from '@tanstack/react-query';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot, useIsClient } from '@salla.sa/twilight-theme-engine/hooks';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { ImageModal } from '@salla.sa/twilight-theme-engine/modal';
import { MadeWithSalla } from '@salla.sa/twilight-theme-engine/layout';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';

/** Salla's value-added-tax badge icon (70×70, CDN-resized) — a platform
 *  asset shared by every store, not specific to any one theme. */
const TAX_ICON_URL =
  'https://cdn.salla.network/cdn-cgi/image/fit=scale-down,width=70,height=70,onerror=redirect,format=auto/images/tax.png?v=2.0.5';

/**
 * The store's value-added-tax registration: the tax number, plus the certificate as
 * the tax icon that opens the certificate image full size in a modal. Nothing shows
 * when the store has no tax number.
 */
function FooterTax({ dark }: { dark: boolean }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const number = store.settings?.tax?.number;
  const certificate = store.settings?.tax?.certificate;
  if (!number) return null;

  return (
    <div
      data-testid="store-footer-tax"
      className="store-footer__tax flex items-end gap-2 rtl:space-x-reverse"
    >
      {certificate && (
        <>
          <button
            type="button"
            data-testid="store-footer-tax-certificate"
            className="store-footer__tax-cert shrink-0"
            aria-label={t('common.elements.tax_certificate', 'Tax Certificate')}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <img
              src={TAX_ICON_URL}
              alt={t('common.elements.tax_certificate', 'Tax Certificate')}
              width={40}
              height={50}
              loading="lazy"
              decoding="async"
              className="w-10 rounded-sm transition-opacity hover:opacity-80"
            />
          </button>
          <ImageModal
            isOpen={open}
            onClose={() => setOpen(false)}
            src={certificate}
            alt={t('common.elements.tax_certificate', 'Tax Certificate')}
            title={t('common.elements.tax_certificate', 'Tax Certificate')}
          />
        </>
      )}
      <div>
        <p className={`mb-1 text-sm opacity-70 ${dark ? 'text-white' : ''}`}>
          {t('common.elements.tax_number', 'Tax Number')}
        </p>
        <b className="text-sm">{number}</b>
      </div>
    </div>
  );
}

/** Saudi Business Center (SBC) logo, CDN-versioned like the tax icon -- also a
 *  platform asset, not theme-specific. */
const SBC_ICON_URL = 'https://cdn.salla.network/images/sbc.png?v=2.0.5';

/**
 * The store's Saudi Business Center certificate: a "Trusted by Business Platform" badge that
 * opens the certificate's page on the SBC site so visitors can verify the merchant. Nothing
 * shows when the store has no certificate.
 */
function FooterSbc({ dark }: { dark: boolean }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const id = store.settings?.certificate?.id;
  if (!id) return null;

  return (
    <a
      href={`https://eauthenticate.saudibusiness.gov.sa/certificate-details/${encodeURIComponent(id)}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="store-footer-sbc"
      className="store-footer__sbc flex items-center gap-2.5 transition-opacity hover:opacity-75"
    >
      <img
        src={SBC_ICON_URL}
        alt={`SBC ${id}`}
        width={56}
        height={40}
        loading="lazy"
        decoding="async"
        className="h-10 w-14 rounded-sm"
      />
      <div>
        <p className={`text-xs opacity-70 ${dark ? 'text-white' : ''}`}>
          {t('blocks.footer.sbc_trusted_by', 'Trusted by')}
        </p>
        <b className="text-sm">{t('blocks.footer.sbc_platform', 'Business Platform')}</b>
      </div>
    </a>
  );
}

/** Trust badges, the tax registration and the SBC badge, side by side (wrapping on narrow columns). */
function FooterTrust({ dark, centered }: { dark: boolean; centered: boolean }) {
  return (
    <div
      data-testid="store-footer-trust"
      className={`store-footer__trust flex flex-wrap items-end gap-x-6 gap-y-3${centered ? ' justify-center' : ''}`}
    >
      <FooterTax dark={dark} />
      <FooterSbc dark={dark} />
      <SallaTrustBadges {...(dark ? { dark: true } : {})} />
    </div>
  );
}

/**
 * The footer's own menu of ("important") links -- skipped entirely when
 * `inSheet`, for a theme that opens it from somewhere else of its own (a
 * mobile account sheet, a dedicated links screen, …) instead; showing it
 * again down here would just be a redundant second copy. `heading` wraps it
 * in the grid layout's own `.store-footer__links` column; the centered
 * layout's inline row has none. Nothing shows once the footer menu comes back
 * empty.
 */
function FooterLinksMenu({
  inSheet,
  className,
  heading,
  dark,
}: {
  inSheet: boolean;
  className: string;
  heading?: string;
  dark: boolean;
}) {
  const { locale } = useTranslation();
  // Loaded and empty: no column, so no heading over nothing. Shown while loading.
  const { data: items, isSuccess } = useQuery({
    queryKey: ['menus', 'footer', locale],
    queryFn: () => menu.footer(),
    staleTime: 5 * 60 * 1000,
    enabled: !inSheet,
  });
  if (inSheet || (isSuccess && !items?.length)) return null;

  const links = <SallaMenu source="footer" className={className} suppressHydrationWarning />;
  if (!heading) return links;

  return (
    <div className="store-footer__links">
      <h3 className={`mb-3 text-lg font-bold lg:mb-5 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {heading}
      </h3>
      {links}
    </div>
  );
}

/** App-store / Google-Play buttons. Nothing shows -- not even the wrapping
 *  div -- when the store has neither link set. */
function FooterApps({ className }: { className: string }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  // The web component fills its light DOM before React hydrates the footer, a hydration error.
  const isClient = useIsClient();
  if (!store.apps?.appstore && !store.apps?.googleplay) return null;

  return (
    <div data-testid="store-footer-apps" className={`store-footer__apps ${className}`}>
      {isClient && (
        <SallaAppsIcons
          apps={store.apps}
          appsTitle={t('blocks.footer.download_apps', 'Get our apps')}
        />
      )}
    </div>
  );
}

/** The logo link, same shape in both layouts -- only its own spacing differs. */
function FooterLogo({ className }: { className: string }) {
  const { store } = useTwilight();
  return (
    <Link
      to="/"
      className={`store-footer__logo inline-flex items-center m-0 transition-opacity hover:opacity-75 ${className}`}
    >
      <Image
        src={store.logo}
        alt={store.name || 'Store'}
        width={150}
        height={44}
        objectFit="contain"
        className="h-11 w-auto max-w-[180px]"
      />
    </Link>
  );
}

/** Merchant-authored description HTML -- mirrors the Twig theme's
 *  `store.description|raw`. Renders nothing when the store has none set. */
function FooterDescription({ className }: { className: string }) {
  const { store } = useTwilight();
  if (!store.description) return null;
  return (
    <div
      className={`store-footer__desc opacity-80 ${className}`}
      dangerouslySetInnerHTML={{ __html: store.description }}
    />
  );
}

/** The store's phone and email as one "Contact us: …" row under the description
 *  (`<salla-contacts>`'s compact `isHeader` layout, which shows only those two).
 *  Renders nothing when the store has neither. */
function FooterContacts({ className }: { className: string }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  // The web component fills its light DOM once the SDK is ready, which can come before
  // React hydrates the footer's Suspense boundary: a hydration error (React #418).
  const isClient = useIsClient();
  if (!store.contacts?.phone && !store.contacts?.email) return null;
  return (
    <div className={`store-footer__contacts ${className}`}>
      {isClient && (
        <SallaContacts
          contacts={store.contacts}
          contactsTitle={t('blocks.footer.social', 'Contact us')}
          isHeader
        />
      )}
    </div>
  );
}

/** The store's contacts (WhatsApp, mobile, phone, email, Telegram) as their own
 *  labeled column, one row per channel, as in Twig Raed's footer. Renders nothing
 *  when the store has none, or in the account sheet, which lists them itself. */
function FooterContactsColumn({ inSheet, dark }: { inSheet: boolean; dark: boolean }) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  // See FooterContacts: the web component would fill its light DOM before hydration.
  const isClient = useIsClient();
  const contacts = store.contacts;
  const hasAny = Object.values(contacts ?? {}).some(Boolean);
  if (inSheet || !hasAny) return null;

  return (
    <div className="store-footer__contact-list">
      <h3 className={`mb-3 text-lg font-bold lg:mb-5 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {t('blocks.footer.social', 'Contact us')}
      </h3>
      {isClient && <SallaContacts contacts={contacts} hideTitle />}
    </div>
  );
}

/** Centered layout: logo, description, contacts, social, footer menu, trust
 *  badges and app buttons stacked as one centered column. */
function FooterCenteredBody({ inSheet, isDark }: { inSheet: boolean; isDark: boolean }) {
  return (
    <div className="container mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <FooterLogo className="" />
      <FooterDescription className="" />
      <FooterContacts className="" />
      <SallaSocial />

      <FooterLinksMenu
        inSheet={inSheet}
        className="store-footer__menu store-footer__menu--inline"
        dark={isDark}
      />

      <FooterTrust dark={isDark} centered />

      <FooterApps className="flex flex-col items-center gap-3" />
    </div>
  );
}

/** Columns layout: brand (logo / description / social / trust), the footer menu
 *  and the store's contacts as labeled columns, and the app buttons, side by side.
 *  At `lg` they share one row: the brand two shares, each other column one. */
function FooterColumnsBody({ inSheet, isDark }: { inSheet: boolean; isDark: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="container grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:gap-16">
      <div className="store-footer__brand rtl:lg:pl-16 ltr:lg:pr-16 sm:col-span-2">
        <FooterLogo className="mb-5" />
        <FooterDescription className="max-w-sm leading-6 my-5" />
        <SallaSocial className="block mb-6" />
        <FooterTrust dark={isDark} centered={false} />
      </div>

      <FooterLinksMenu
        inSheet={inSheet}
        className="store-footer__menu store-footer__menu--stacked"
        heading={t('blocks.footer.important_links', 'Important links')}
        dark={isDark}
      />

      <FooterContactsColumn inSheet={inSheet} dark={isDark} />

      <FooterApps className="" />
    </div>
  );
}

export interface FooterProps {
  /**
   * Renders as a plain `<div>` (no second `<footer>` landmark) with the
   * `footer:start` / `footer:end` hook slots skipped -- for a theme that
   * repeats these widgets somewhere other than the page's own footer (a
   * mobile sheet, for example) rather than rendering the real page footer a
   * second time.
   */
  inSheet?: boolean;
}

/**
 * Storefront footer.
 *
 * Fork of the engine `Footer` -- same markup and data, except the columns layout:
 * the store's contacts get their own "Contact us" column (one row per channel)
 * instead of a lone phone / email row under the description, and the "Important
 * links" column hides when the footer menu is empty. Upgrade notes: `FORKS.md`.
 *
 * Two layouts, chosen by the `footer_layout` theme setting:
 *  - **columns** (default): logo / description / social / trust badges, the
 *    footer menu ("important links"), and app-store buttons, side by side.
 *  - **centered**: the same pieces stacked as one centered column, with the
 *    footer menu laid out as an inline, pipe-separated row.
 *
 * Styling for the handful of pieces rendered by web components this owns no
 * markup for (`<salla-social>`'s `.social-link` icons, `<salla-menu>`'s
 * `.s-menu-footer-item` rows, `<salla-payments>`'s `.s-payments-list-item`
 * icons) is the consuming theme's own responsibility, the same way
 * `inSheet`'s own presentation is -- this component owns structure and data,
 * not every pixel.
 */
export function Footer({ inSheet = false }: FooterProps = {}) {
  const { store, theme } = useTwilight();
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const isCentered = theme.settings?.footer_layout === 'centered';
  const isDark = !!theme.settings?.footer_is_dark;

  const Root = inSheet ? 'div' : 'footer';

  return (
    <Root
      className={`store-footer store-footer--${isCentered ? 'centered' : 'columns'}${
        inSheet ? ' store-footer--sheet' : ''
      } relative mt-8 sm:mt-16 ${isDark ? 'bg-[#0E0F0F] text-white' : 'bg-[#F4F7F2] text-gray-600'}`}
      suppressHydrationWarning
    >
      {!inSheet && <HookSlot name="footer:start" />}

      <div
        aria-label="footer"
        className={`store-footer__inner border-b py-8 lg:py-16 ${
          isDark ? 'bg-[#1D1F1F] border-dashed border-white/10' : 'bg-transparent border-gray-200'
        }`}
      >
        {isCentered ? (
          <FooterCenteredBody inSheet={inSheet} isDark={isDark} />
        ) : (
          <FooterColumnsBody inSheet={inSheet} isDark={isDark} />
        )}
      </div>

      <div className="store-footer__bottom container md:flex items-center justify-between gap-4 py-4 lg:py-7 text-center">
        <span className={`text-sm copyright-text ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
          <HookSlot
            name="copyright"
            context={{ storeName: store.name }}
            fallback={
              <>
                {t('blocks.footer.copyright', 'All rights reserved')}{' '}
                <Link to="/" className="transition-opacity hover:opacity-75 hover:text-primary">
                  {store.name}
                </Link>{' '}
                © {year}
                <MadeWithSalla className="ms-2" />
              </>
            }
          />
        </span>

        <SallaPayments />
      </div>

      {!inSheet && <HookSlot name="footer:end" />}
    </Root>
  );
}
