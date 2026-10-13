import { isNativeApp } from '@salla.sa/twilight-theme-engine/native-app';

/** The store-wide switchers the header, the nav drawer and the account sheet offer. */
export type StoreSwitcher = 'language' | 'currency' | 'branch';

interface SallaMobileSheets {
  openLanguages?: () => unknown;
  openCurrencies?: () => unknown;
}

/**
 * Inside the Salla app, asks the app to open its own language or currency sheet
 * (`mobile::language.open` / `mobile::currency.open`), through the SDK's
 * `salla.mobile` methods when it has them, else by emitting the event, which the
 * SDK forwards to the app. Returns false outside the app.
 */
function openNativeSheet(sheet: 'language' | 'currency'): boolean {
  if (!isNativeApp()) return false;
  const salla = window.salla as
    | { mobile?: SallaMobileSheets; event?: { dispatch?: (name: string, data?: unknown) => void } }
    | undefined;
  const open = sheet === 'language' ? salla?.mobile?.openLanguages : salla?.mobile?.openCurrencies;
  if (typeof open === 'function') open.call(salla?.mobile);
  else salla?.event?.dispatch?.(`mobile::${sheet}.open`, {});
  return true;
}

/**
 * Opens a switcher. Inside the Salla app, language and currency open the app's
 * own sheets instead of the web modal; everywhere else they open the shared
 * `<SallaLocalizationModal>` (`localization::open`). The branch opens
 * `<SallaScopes>` (`scopes::open`). Both modals are mounted in `ThemeLayout`.
 */
export function openStoreSwitcher(switcher: StoreSwitcher): void {
  if (switcher !== 'branch' && openNativeSheet(switcher)) return;
  window.salla?.event?.dispatch(switcher === 'branch' ? 'scopes::open' : 'localization::open');
}
