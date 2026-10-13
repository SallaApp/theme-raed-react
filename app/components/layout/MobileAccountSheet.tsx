import { Suspense, useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useUser } from '@salla.sa/twilight-theme-engine/hooks/useUser';
import { Footer } from '@salla.sa/twilight-theme-engine/layout';
import { BottomSheet } from '../common/BottomSheet';
import { useCloseOnDesktop } from '../../hooks/useCloseOnDesktop';
import { ROWS_IN_DELAY_MS } from '../../hooks/useStaggeredRows';
import { ArrowLeftIcon, LanguagesIcon, MapPinIcon, Money01Icon, UserIcon } from '../icons';
import { openStoreSwitcher, type StoreSwitcher } from '../../lib/storeSwitchers';

interface MobileAccountSheetProps {
  open: boolean;
  onClose: () => void;
  /** The sheet's own "Important links" row opens a second, full-screen sheet for it. */
  onOpenImportantLinks: () => void;
  /** The sheet's own "Account" row (logged in) opens a second, full-screen
   *  sheet mirroring the desktop header's user-menu dropdown. */
  onOpenUserMenu: () => void;
}

/** Close the sheet, then open the Salla login modal over the page. */
function openLogin(onClose: () => void) {
  onClose();
  window.salla?.event?.dispatch('login::open');
}

/** `StoreContacts.telegram` / `.whatsapp` may already be a full link, not just
 *  a handle or number -- building a `t.me` / `wa.me` URL unconditionally on
 *  top of one duplicates it (`https://t.me/https://t.me/acme_store`). */
const isUrl = (value: string) => /^https?:\/\//i.test(value);

function telegramHref(value: string): string {
  return isUrl(value) ? value : `https://t.me/${value.replace(/^@/, '')}`;
}

function whatsappHref(value: string): string {
  return isUrl(value) ? value : `https://wa.me/${value.replace(/[\s+-]/g, '')}`;
}

/** Close the sheet, then open the switcher (the web modal, or the app's own sheet). */
function openSwitcher(switcher: StoreSwitcher, onClose: () => void) {
  onClose();
  openStoreSwitcher(switcher);
}

interface ListRowProps {
  icon: ReactNode;
  label: ReactNode;
  value?: string;
  testId?: string;
}

/** One settings/contact row: leading icon, label (+ optional muted value), trailing chevron. */
function ListButton({
  icon,
  label,
  value,
  testId,
  onClick,
}: ListRowProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      className="account-sheet__list-item"
      data-testid={testId}
      onClick={onClick}
    >
      <span className="account-sheet__list-icon">{icon}</span>
      <span className="account-sheet__list-label">{label}</span>
      {value && <span className="account-sheet__list-value">{value}</span>}
      <ArrowLeftIcon className="account-sheet__list-chevron" aria-hidden="true" />
    </button>
  );
}

/**
 * Settings card: account (logged in) / login (guest), language, currency,
 * branch, important links. Each of language / currency / branch shows only
 * when the store actually has that feature -- same condition
 * {@link HeaderNav}'s own footer triggers use, so the two never disagree
 * about what the store supports.
 */
function SettingsList({
  onClose,
  onOpenImportantLinks,
  onOpenUserMenu,
}: {
  onClose: () => void;
  onOpenImportantLinks: () => void;
  onOpenUserMenu: () => void;
}) {
  const { t, languageName } = useTranslation();
  const { store, currency } = useTwilight();
  const { isLoggedIn } = useUser();

  const currencyLabel = currency?.name || currency?.symbol || currency?.code || 'SAR';

  // Same shape, same three conditions, as HeaderNav's own NavFooter -- the two
  // never disagree about what the store supports.
  const rows: {
    key: StoreSwitcher;
    show: boolean;
    icon: ReactNode;
    label: string;
    value?: string;
  }[] = [
    {
      key: 'language',
      show: !!store?.settings?.is_multilingual,
      icon: <LanguagesIcon aria-hidden="true" />,
      label: t('blocks.header.change_language', 'Change language'),
      value: languageName,
    },
    {
      key: 'currency',
      show: !!store?.settings?.currencies_enabled,
      icon: <Money01Icon aria-hidden="true" />,
      label: t('blocks.header.change_currency', 'Change currency'),
      value: currencyLabel,
    },
    {
      key: 'branch',
      show: !!store?.scope,
      icon: <MapPinIcon aria-hidden="true" />,
      label: t('blocks.header.branches', 'Branch'),
      value: store?.scope?.name,
    },
  ];

  return (
    <div className="account-sheet__list">
      {isLoggedIn ? (
        <ListButton
          icon={<UserIcon aria-hidden="true" />}
          label={t('common.titles.account', 'Account')}
          testId="account-sheet-user-menu"
          onClick={onOpenUserMenu}
        />
      ) : (
        <ListButton
          icon={<UserIcon aria-hidden="true" />}
          label={t('blocks.header.login', 'Login')}
          onClick={() => openLogin(onClose)}
        />
      )}

      {rows
        .filter((row) => row.show)
        .map((row) => (
          <ListButton
            key={row.key}
            icon={row.icon}
            label={row.label}
            value={row.value}
            onClick={() => openSwitcher(row.key, onClose)}
          />
        ))}

      <ListButton
        icon={<i className="sicon-list" aria-hidden="true" />}
        label={t('blocks.footer.important_links', 'Important links')}
        testId="account-sheet-important-links"
        onClick={onOpenImportantLinks}
      />
    </div>
  );
}

/**
 * Contacts card: one row per {@link StoreContacts} field the merchant actually
 * set -- an empty/missing field drops its row, not just its value, and the
 * whole card renders nothing when none are set (same "section only if it has
 * something to show" rule the footer's own contacts row applies).
 */
function ContactsList() {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const contacts = store?.contacts;

  const rows = [
    contacts?.telegram
      ? {
          key: 'telegram',
          icon: 'sicon-paper-plane',
          label: t('blocks.footer.telegram', 'Telegram'),
          value: contacts.telegram,
          href: telegramHref(contacts.telegram),
        }
      : null,
    contacts?.email
      ? {
          key: 'email',
          icon: 'sicon-mail-letter',
          label: t('blocks.footer.email', 'Email'),
          value: contacts.email,
          href: `mailto:${contacts.email}`,
        }
      : null,
    contacts?.mobile
      ? {
          key: 'mobile',
          icon: 'sicon-phone',
          label: t('blocks.footer.mobile', 'Mobile'),
          value: contacts.mobile,
          href: `tel:${contacts.mobile}`,
        }
      : null,
    // The landline, when the store has one apart from its mobile. The footer's
    // phone / email row is hidden in this sheet, so the number is listed here.
    contacts?.phone && contacts.phone !== contacts.mobile
      ? {
          key: 'phone',
          icon: 'sicon-phone',
          label: t('blocks.footer.phone', 'Phone'),
          value: contacts.phone,
          href: `tel:${contacts.phone}`,
        }
      : null,
    contacts?.whatsapp
      ? {
          key: 'whatsapp',
          icon: 'sicon-whatsapp',
          label: t('blocks.footer.whatsapp', 'WhatsApp'),
          value: contacts.whatsapp,
          href: whatsappHref(contacts.whatsapp),
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return null;

  return (
    <div className="account-sheet__list account-sheet__contacts">
      {rows.map((row) => {
        // mailto: / tel: navigate in place; telegram / WhatsApp are external.
        const isExternal = row.key === 'telegram' || row.key === 'whatsapp';
        return (
          <a
            key={row.key}
            href={row.href}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="account-sheet__contact-item"
          >
            <span className="account-sheet__contact-text">
              <span className="account-sheet__contact-label">{row.label}</span>
              <span className="account-sheet__contact-value unicode">{row.value}</span>
            </span>
            <i className={row.icon} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

/**
 * Full-height sheet the mobile bottom bar's More tab opens. Two card groups --
 * settings (account, language, currency, branch, important links) then
 * contacts (telegram, email, mobile, phone, WhatsApp, each conditional on the
 * merchant actually having set it) -- followed by the same footer widgets
 * (logo, description, social, tax / SBC / trust badges, footer menu, app
 * buttons, copyright, payments) the page footer itself hides on mobile.
 *
 * Mounted once in {@link ThemeLayout}, which owns `open` and shares it with
 * {@link MobileBottomBar}. Styling: `04-components/mobile-account-sheet.scss`.
 */
export function MobileAccountSheet({
  open,
  onClose,
  onOpenImportantLinks,
  onOpenUserMenu,
}: MobileAccountSheetProps) {
  const { t } = useTranslation();

  useCloseOnDesktop(open, onClose);

  // Fades + slides the settings/contacts rows and footer widgets in, staggered
  // -- same entrance as ImportantLinksSheet's own rows. Reset on close so it
  // replays from the top next time the sheet opens.
  const [itemsIn, setItemsIn] = useState(false);
  useEffect(() => {
    if (!open) {
      setItemsIn(false);
      return;
    }
    const stagger = setTimeout(() => setItemsIn(true), ROWS_IN_DELAY_MS);
    return () => clearTimeout(stagger);
  }, [open]);

  // A link to the current page doesn't change the route, which is what closes the sheet otherwise.
  const closeOnLink = (e: MouseEvent) => {
    if ((e.target as Element).closest('a[href]:not([target="_blank"])')) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('common.titles.more', 'More')}
      className="account-sheet"
    >
      <div
        role="presentation"
        className={`account-sheet__content${itemsIn ? ' is-in' : ''}`}
        onClick={closeOnLink}
      >
        <SettingsList
          onClose={onClose}
          onOpenImportantLinks={onOpenImportantLinks}
          onOpenUserMenu={onOpenUserMenu}
        />
        <ContactsList />
        <Suspense fallback={null}>
          <Footer inSheet />
        </Suspense>
      </div>
    </BottomSheet>
  );
}
