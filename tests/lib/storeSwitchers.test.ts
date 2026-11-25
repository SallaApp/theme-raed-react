import { describe, it, expect, vi, afterEach } from 'vitest';
import { canSwitchScope, openStoreSwitcher } from '../../app/lib/storeSwitchers';

function installSalla(inApp: boolean, { withSheetMethods = true } = {}) {
  const dispatch = vi.fn();
  const mobile = withSheetMethods
    ? { isEnabled: () => inApp, openLanguages: vi.fn(), openCurrencies: vi.fn() }
    : { isEnabled: () => inApp };
  (window as unknown as { salla: unknown }).salla = { mobile, event: { dispatch } };
  return { dispatch, mobile };
}

afterEach(() => {
  delete (window as unknown as { salla?: unknown }).salla;
});

describe('openStoreSwitcher', () => {
  it("opens the app's own language and currency sheets inside the Salla app", () => {
    const { dispatch, mobile } = installSalla(true);
    openStoreSwitcher('language');
    openStoreSwitcher('currency');
    expect(mobile.openLanguages).toHaveBeenCalledTimes(1);
    expect(mobile.openCurrencies).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalledWith('localization::open');
  });

  it('emits the sheet events inside the app when the SDK lacks the sheet methods', () => {
    const { dispatch } = installSalla(true, { withSheetMethods: false });
    openStoreSwitcher('language');
    openStoreSwitcher('currency');
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith('mobile::language.open', {});
    expect(dispatch).toHaveBeenCalledWith('mobile::currency.open', {});
    expect(dispatch).not.toHaveBeenCalledWith('localization::open');
  });

  it('opens the web localization modal in a browser', () => {
    const { dispatch, mobile } = installSalla(false);
    openStoreSwitcher('language');
    openStoreSwitcher('currency');
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith('localization::open');
    expect(mobile.openLanguages).not.toHaveBeenCalled();
  });

  it('opens the branch picker the same way everywhere', () => {
    const { dispatch } = installSalla(true);
    openStoreSwitcher('branch');
    expect(dispatch).toHaveBeenCalledWith('scopes::open');
  });
});

describe('canSwitchScope', () => {
  it('lets shoppers switch markets when the store has a scope that is not IP-restricted', () => {
    expect(canSwitchScope({ display_as: 'popup' })).toBe(true);
    expect(canSwitchScope({ display_as: 'default' })).toBe(true);
    expect(canSwitchScope({})).toBe(true);
  });

  it('blocks switching when the store has no scope or locks the market to the IP', () => {
    expect(canSwitchScope(null)).toBe(false);
    expect(canSwitchScope(undefined)).toBe(false);
    expect(canSwitchScope({ display_as: 'ip_address' })).toBe(false);
  });
});
