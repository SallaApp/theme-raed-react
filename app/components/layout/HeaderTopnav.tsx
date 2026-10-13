import type { ReactNode } from 'react';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { SallaContacts } from '@salla.sa/twilight-components-react/contacts';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ChevronDownIcon, LanguagesIcon, MapPinIcon, Money01Icon } from '../icons';
import { openStoreSwitcher, type StoreSwitcher } from '../../lib/storeSwitchers';

/** One topnav trigger: leading icon, current-selection label, caret. */
function TopnavAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="site-header__topnav-action"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      {icon}
      <span className="site-header__topnav-action-label">{label}</span>
      <ChevronDownIcon className="site-header__topnav-caret" aria-hidden="true" />
    </button>
  );
}

/**
 * Top bar for the "default" header layout — the footer menu on the start side
 * and the language / branch / currency switchers on the end side. Desktop only
 * (`lg+`); on smaller screens the header collapses to the shared mobile bar.
 * Each opens through `openStoreSwitcher` (`lib/storeSwitchers.ts`): the
 * shared modals on the web, the app's own sheets for language and currency
 * inside the Salla app. Styling: `header.scss`
 * (`.site-header__topnav`).
 */
export function HeaderTopnav() {
  const { t, languageName } = useTranslation();
  const { store, currency } = useTwilight();

  const currencyLabel = currency?.name || currency?.symbol || currency?.code || 'SAR';
  const scopeLabel = store?.scope?.name || t('blocks.header.branches', 'Branches');

  const actions: { key: StoreSwitcher; show: boolean; icon: ReactNode; label: string }[] = [
    {
      key: 'language',
      show: !!store?.settings?.is_multilingual,
      icon: <LanguagesIcon className="site-header__topnav-icon" aria-hidden="true" />,
      label: languageName,
    },
    {
      key: 'branch',
      show: !!store?.scope,
      icon: <MapPinIcon className="site-header__topnav-icon" aria-hidden="true" />,
      label: scopeLabel,
    },
    {
      key: 'currency',
      show: !!store?.settings?.currencies_enabled,
      icon: <Money01Icon className="site-header__topnav-icon" aria-hidden="true" />,
      label: currencyLabel,
    },
  ];

  return (
    <div className="site-header__topnav">
      <div className="container site-header__topnav-inner">
        <SallaMenu
          source="footer"
          topnav
          className="site-header__topnav-menu"
          suppressHydrationWarning
        />

        <div className="site-header__topnav-actions">
          <salla-bullet-delivery-tag data-testid="store-header-bullet-delivery-desktop" />
          {actions
            .filter((action) => action.show)
            .map((action) => (
              <TopnavAction
                key={action.key}
                icon={action.icon}
                label={action.label}
                onClick={() => openStoreSwitcher(action.key)}
              />
            ))}
          <SallaContacts
            data-testid="store-header-contacts"
            contacts={store?.contacts}
            contactsTitle="N/A"
            isHeader
          />
        </div>
      </div>
    </div>
  );
}
