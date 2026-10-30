import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { HeaderTopnav } from '../../../app/components/layout/HeaderTopnav';

// The merchant settings each test sees. `vi.hoisted` shares them with the hoisted
// `vi.mock` factory; `beforeEach` empties them.
const settings = vi.hoisted<Record<string, unknown>>(() => ({}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: { settings: {} }, currency: undefined, theme: { settings } }),
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k, languageName: 'العربية' }),
}));

vi.mock('@salla.sa/twilight-components-react/menu', () => ({
  SallaMenu: ({ source, className }: { source: string; className?: string }) => (
    <div data-testid="topnav-menu" data-source={source} className={className} />
  ),
}));

const menu = (container: HTMLElement) => container.querySelector('[data-testid="topnav-menu"]');

beforeEach(() => {
  for (const key of Object.keys(settings)) delete settings[key];
});

describe('HeaderTopnav important links', () => {
  it('shows the footer menu when important_links is on', () => {
    settings.important_links = true;
    const { container } = render(<HeaderTopnav />);

    expect(menu(container)?.getAttribute('data-source')).toBe('footer');
  });

  it("shows the footer menu when the setting is missing, as twilight.json's default", () => {
    const { container } = render(<HeaderTopnav />);

    expect(menu(container)).toBeTruthy();
  });

  it('leaves the footer menu out when the merchant turns important_links off', () => {
    settings.important_links = false;
    const { container } = render(<HeaderTopnav />);

    expect(menu(container)).toBeNull();
    expect(container.querySelector('.site-header__topnav-actions')).toBeTruthy();
  });
});
