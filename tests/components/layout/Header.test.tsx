import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { Header } from '../../../app/components/layout/Header';
import { HOME_ROUTE_ID } from '../../../app/lib/routeIds';

const state = {
  store: {
    url: '/',
    name: 'Acme',
    logo: 'logo.png',
    description: '<p>Handmade goods</p>',
    social: { twitter: 'https://x.com/acme' },
  } as Record<string, unknown>,
  theme: { settings: {} } as Record<string, unknown>,
  isHome: true,
  routeIds: [] as string[],
};

type RouterStateStub = {
  matches: { routeId: string }[];
};

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: RouterStateStub) => unknown }) =>
    select({
      matches: state.routeIds.map((routeId) => ({ routeId })),
    }),
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: state.store, theme: state.theme }),
  useIsHome: () => state.isHome,
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: ({ name }: { name: string }) => <div data-hook-slot={name} />,
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Image: (props: Record<string, unknown>) => (
    <img alt={String(props.alt ?? '')} src={String(props.src ?? '')} />
  ),
}));

vi.mock('../../../app/components/layout/HeaderMainMenu', () => ({
  HeaderMainMenu: () => <div data-testid="header-main-menu" />,
}));
vi.mock('../../../app/components/layout/HeaderNav', () => ({
  HeaderNav: ({ open }: { open: boolean }) => <nav data-testid="header-nav" data-open={open} />,
}));

vi.mock('@salla.sa/twilight-theme-engine/layout', () => ({
  PageAdvertisements: () => <div data-testid="advertisement-bar-render" />,
}));
vi.mock('@salla.sa/twilight-components-react/search', () => ({
  SallaSearch: () => <salla-search />,
}));
vi.mock('@salla.sa/twilight-components-react/social', () => ({
  SallaSocial: () => <salla-social />,
}));
vi.mock('@salla.sa/twilight-components-react/contacts', () => ({
  SallaContacts: ({ contactsTitle }: { contactsTitle?: string }) => (
    <salla-contacts data-contacts-title={contactsTitle} />
  ),
}));
vi.mock('@salla.sa/twilight-components-react/user-menu', () => ({
  SallaUserMenu: () => <salla-user-menu />,
}));
vi.mock('@salla.sa/twilight-components-react/cart-summary', () => ({
  SallaCartSummary: ({ children }: { children?: React.ReactNode }) => (
    <salla-cart-summary>{children}</salla-cart-summary>
  ),
}));

beforeEach(() => {
  state.store = {
    url: '/',
    name: 'Acme',
    logo: 'logo.png',
    description: '<p>Handmade goods</p>',
    social: { twitter: 'https://x.com/acme' },
  };
  state.theme = { settings: {} };
  state.isHome = true;
  state.routeIds = [];
});

afterEach(() => {
  document.documentElement.style.removeProperty('--app-safe-area-top');
  vi.unstubAllGlobals();
});

describe('Header', () => {
  it('renders the shell: logo, actions, search modal, cart, and the hook slots', () => {
    const { container, getAllByLabelText } = render(<Header />);
    expect(container.querySelector('header.site-header')).toBeTruthy();
    expect(container.querySelector('.site-header__brand img')).toBeTruthy();
    expect(container.querySelector('salla-user-menu')).toBeTruthy();
    expect(container.querySelector('salla-cart-summary')).toBeTruthy();
    expect(container.querySelector('salla-search')).toBeTruthy();
    // One search trigger, in the actions group opposite the menu button.
    expect(getAllByLabelText('Search')).toHaveLength(1);
    expect(container.querySelector('[data-hook-slot="header:start"]')).toBeTruthy();
    expect(container.querySelector('[data-hook-slot="header:end"]')).toBeTruthy();
  });

  it('renders the store name, description and social links in the intro row', () => {
    state.routeIds = [HOME_ROUTE_ID];
    const { container } = render(<Header />);
    const intro = container.querySelector('.site-header__intro-inner');
    expect(intro?.querySelector('.site-header__intro-title')?.textContent).toBe('Acme');
    expect(container.querySelector('.site-header__intro-text')?.innerHTML).toContain(
      'Handmade goods'
    );
    expect(container.querySelector('.site-header__intro salla-social')).toBeTruthy();
  });

  it('hides the store info row when header_show_store_info is off', () => {
    state.routeIds = [HOME_ROUTE_ID];
    state.theme = { settings: { header_show_store_info: false } };
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeNull();
    expect(container.querySelector('header.site-header')).toBeTruthy();
  });

  it('shows the store info row when header_show_store_info is unset', () => {
    state.routeIds = [HOME_ROUTE_ID];
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeTruthy();
  });

  it('leaves the store contacts to the footer, out of the intro row', () => {
    state.routeIds = [HOME_ROUTE_ID];
    state.store = { ...state.store, contacts: { phone: '+971500000000', email: 'hi@acme.test' } };
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeTruthy();
    expect(container.querySelector('salla-contacts')).toBeNull();
  });

  it('omits the description block when the store has none', () => {
    state.routeIds = [HOME_ROUTE_ID];
    state.store.description = '';
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__intro-text')).toBeNull();
  });

  it('uses <h1> for the intro title on the homepage', () => {
    state.routeIds = [HOME_ROUTE_ID];
    const { container } = render(<Header />);
    expect(container.querySelector('h1.site-header__intro-title')?.textContent).toBe('Acme');
  });

  it('shows the store info row on the homepage only by default', () => {
    state.routeIds = [HOME_ROUTE_ID];
    const { container, rerender } = render(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeTruthy();

    state.routeIds = ['/{-$locale}/$slug/p{$id}'];
    state.isHome = false;
    rerender(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeNull();
  });

  it('shows the store info row on every page when home-only is off', () => {
    state.theme = { settings: { header_store_info_home_only: false } };
    state.routeIds = ['/{-$locale}/$slug/p{$id}'];
    state.isHome = false;
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeTruthy();
  });

  it('never shows the store info row in the default header layout', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    state.theme = { settings: { header_layout: 'default', header_store_info_home_only: false } };
    state.routeIds = [HOME_ROUTE_ID];
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__intro')).toBeNull();
  });

  it('opens the nav drawer when the menu button is clicked', () => {
    const { getByLabelText, getByTestId } = render(<Header />);
    const button = getByLabelText('Menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(getByTestId('header-nav').getAttribute('data-open')).toBe('true');
  });

  it('dispatches the search event when the search button is clicked', () => {
    const dispatch = vi.fn();
    (window as unknown as { salla: unknown }).salla = { event: { dispatch } };
    const { getByLabelText } = render(<Header />);
    fireEvent.click(getByLabelText('Search'));
    expect(dispatch).toHaveBeenCalledWith('search::open');
  });

  it('pins the bar on scroll by default (header_is_sticky unset)', () => {
    const { container } = render(<Header />);
    Object.defineProperty(window, 'scrollY', { value: 10, configurable: true });
    fireEvent.scroll(window);
    expect(container.querySelector('.site-header__bar.is-scrolled')).toBeTruthy();
  });

  it("pins the default layout at the Salla app's status bar line, and follows the inset", async () => {
    const margins: string[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(_cb: unknown, options: { rootMargin?: string }) {
          margins.push(options.rootMargin ?? '');
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    // Only the header's pin observer sets a top margin; other observers on the page don't.
    const pinMargins = () => margins.filter((m) => m.startsWith('-'));
    state.theme = { settings: { header_layout: 'default' } };
    document.documentElement.style.setProperty('--app-safe-area-top', '62px');
    render(<Header />);
    expect(pinMargins().at(-1)).toBe('-62px 0px 0px 0px');

    // The app reports a new inset: the engine rewrites the variable.
    await act(async () => {
      document.documentElement.style.setProperty('--app-safe-area-top', '47px');
    });
    expect(pinMargins().at(-1)).toBe('-47px 0px 0px 0px');
  });

  it('never pins the bar when header_is_sticky is disabled', () => {
    state.theme = { settings: { header_is_sticky: false } };
    const { container } = render(<Header />);
    Object.defineProperty(window, 'scrollY', { value: 10, configurable: true });
    fireEvent.scroll(window);
    expect(container.querySelector('.site-header__bar.is-scrolled')).toBeNull();
  });

  it('adds the product-page modifier from route match state, not the body class', () => {
    state.routeIds = ['/{-$locale}/$slug/p{$id}'];
    const { container } = render(<Header />);
    expect(container.querySelector('header.site-header--product')).toBeTruthy();
  });

  it('omits the product-page modifier on other routes', () => {
    state.routeIds = ['/{-$locale}/cart'];
    const { container } = render(<Header />);
    expect(container.querySelector('header.site-header--product')).toBeNull();
  });

  it('adds the home modifier from route match state, so it is in the SSR markup', () => {
    state.routeIds = ['/{-$locale}/'];
    const { container } = render(<Header />);
    expect(container.querySelector('header.site-header--home')).toBeTruthy();
  });

  it('omits the home modifier on other routes', () => {
    state.routeIds = ['/{-$locale}/cart'];
    const { container } = render(<Header />);
    expect(container.querySelector('header.site-header--home')).toBeNull();
  });

  it('reserves the social row when the store has social links', () => {
    state.routeIds = [HOME_ROUTE_ID];
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__social-slot.has-links')).toBeTruthy();
  });

  it('does not reserve the social row when the store has no social links', () => {
    state.routeIds = [HOME_ROUTE_ID];
    state.store = { ...state.store, social: { twitter: '' } };
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__social-slot')).toBeTruthy();
    expect(container.querySelector('.site-header__social-slot.has-links')).toBeNull();
  });

  it('does not reserve the social row for WhatsApp alone, which <salla-social> skips', () => {
    state.store = { ...state.store, social: { whatsapp: '966500000000' } };
    const { container } = render(<Header />);
    expect(container.querySelector('.site-header__social-slot.has-links')).toBeNull();
  });

  it("renders the engine's ad bar in the header's ad slot", () => {
    const { getByTestId } = render(<Header />);

    expect(getByTestId('advertisement-bar-render').closest('.site-header__ad')).not.toBeNull();
  });
});
