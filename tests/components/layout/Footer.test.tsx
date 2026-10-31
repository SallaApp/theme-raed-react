import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Footer } from '../../../app/components/layout/Footer';

const state = {
  store: {} as Record<string, unknown>,
  theme: { settings: {} as Record<string, unknown> },
  footerMenu: [] as unknown[],
};

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: state.store, theme: state.theme }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: ({ fallback }: { fallback?: unknown }) => <>{fallback as never}</>,
  useIsClient: () => true,
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ children }: { children?: unknown }) => <a>{children as never}</a>,
  Image: () => <img alt="" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/modal', () => ({ ImageModal: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/layout', () => ({ MadeWithSalla: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/api/menu', () => ({
  menu: { footer: async () => state.footerMenu },
}));
vi.mock('@salla.sa/twilight-components-react/apps-icons', () => ({ SallaAppsIcons: () => null }));
vi.mock('@salla.sa/twilight-components-react/contacts', () => ({
  SallaContacts: ({ isHeader }: { isHeader?: boolean }) => (
    <div data-testid={isHeader ? 'contacts-row' : 'contacts-list'} />
  ),
}));
vi.mock('@salla.sa/twilight-components-react/social', () => ({ SallaSocial: () => null }));
vi.mock('@salla.sa/twilight-components-react/menu', () => ({
  SallaMenu: () => <ul data-testid="footer-menu" />,
}));
vi.mock('@salla.sa/twilight-components-react/trust-badges', () => ({
  SallaTrustBadges: () => null,
}));
vi.mock('@salla.sa/twilight-components-react/payments', () => ({ SallaPayments: () => null }));

function renderFooter(inSheet = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Footer inSheet={inSheet} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  state.store = { name: 'Acme', contacts: { whatsapp: '+966500000000', email: 'a@b.c' } };
  state.theme = { settings: {} };
  state.footerMenu = [{ id: 1, title: 'About', url: '/about' }];
});

describe('Footer', () => {
  it('lists the store contacts in their own column, not under the description', () => {
    renderFooter();
    expect(screen.getByText('Contact us')).toBeTruthy();
    expect(screen.getByTestId('contacts-list')).toBeTruthy();
    expect(screen.queryByTestId('contacts-row')).toBeNull();
  });

  it('drops the contacts column when the store has no contacts', () => {
    state.store = { name: 'Acme', contacts: {} };
    renderFooter();
    expect(screen.queryByText('Contact us')).toBeNull();
  });

  it('leaves the contacts column out of the account sheet', () => {
    renderFooter(true);
    expect(screen.queryByTestId('contacts-list')).toBeNull();
  });

  it('keeps the important links column when the footer menu has links', async () => {
    renderFooter();
    await waitFor(() => expect(screen.getByText('Important links')).toBeTruthy());
    expect(screen.getByTestId('footer-menu')).toBeTruthy();
  });

  it('drops the important links heading when the footer menu is empty', async () => {
    state.footerMenu = [];
    renderFooter();
    await waitFor(() => expect(screen.queryByText('Important links')).toBeNull());
  });

  it('keeps the compact contacts row in the centered layout', () => {
    state.theme = { settings: { footer_layout: 'centered' } };
    renderFooter();
    expect(screen.getByTestId('contacts-row')).toBeTruthy();
  });
});
