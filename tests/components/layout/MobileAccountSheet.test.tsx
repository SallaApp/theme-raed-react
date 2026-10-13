import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, act, cleanup } from '@testing-library/react';
import { MobileAccountSheet } from '../../../app/components/layout/MobileAccountSheet';

const user = { isLoggedIn: true };

const twilight: {
  store: {
    scope?: { name: string } | null;
    contacts?: Record<string, string>;
    settings?: Record<string, unknown>;
  };
  currency?: { name?: string; symbol?: string; code?: string };
} = {
  store: { scope: null, contacts: {}, settings: {} },
  currency: { code: 'SAR' },
};

vi.mock('@salla.sa/twilight-theme-engine/hooks/useUser', () => ({
  useUser: () => ({ isLoggedIn: user.isLoggedIn }),
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: twilight.store, currency: twilight.currency }),
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({
    t: (_k: string, fb?: string) => fb ?? _k,
    languageName: 'English',
  }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, className }: Record<string, unknown>) => (
    <a href={String(to)} className={className as string}>
      {children as React.ReactNode}
    </a>
  ),
}));

vi.mock('@salla.sa/twilight-theme-engine/layout', () => ({
  Footer: ({ inSheet }: { inSheet?: boolean }) => (
    <div data-in-sheet={String(!!inSheet)}>
      <a href="/">Acme</a>
      <a href="https://x.test/social" target="_blank" rel="noreferrer">
        Social
      </a>
    </div>
  ),
}));

/** Let the sheet's mount + two-frame enter transition settle inside act. */
async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

function renderSheet(onOpenImportantLinks = () => {}, onOpenUserMenu = () => {}) {
  const onClose = vi.fn();
  render(
    <MobileAccountSheet
      open
      onClose={onClose}
      onOpenImportantLinks={onOpenImportantLinks}
      onOpenUserMenu={onOpenUserMenu}
    />
  );
  return onClose;
}

beforeEach(() => {
  user.isLoggedIn = true;
  twilight.store = { scope: null, contacts: {}, settings: {} };
  twilight.currency = { code: 'SAR' };
  delete (window as unknown as { salla?: unknown }).salla;
});

afterEach(() => {
  cleanup();
  document.body.classList.remove('menu-opened');
});

describe('MobileAccountSheet', () => {
  it('renders nothing while closed', () => {
    render(
      <MobileAccountSheet
        open={false}
        onClose={() => {}}
        onOpenImportantLinks={() => {}}
        onOpenUserMenu={() => {}}
      />
    );
    expect(document.querySelector('.account-sheet')).toBeNull();
  });

  it('titles the sheet "More", not "Account" — it is not account-specific any more', async () => {
    renderSheet();
    await settle();

    expect(document.querySelector('.bottom-sheet__title')?.textContent).toBe('More');
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('More');
  });

  it('opens the user-menu sheet from its own row for a logged-in customer, with no avatar header', async () => {
    const onOpenUserMenu = vi.fn();
    const onClose = renderSheet(() => {}, onOpenUserMenu);
    await settle();

    expect(document.querySelector('.account-sheet__user')).toBeNull();
    fireEvent.click(screen.getByTestId('account-sheet-user-menu'));
    expect(onOpenUserMenu).toHaveBeenCalledTimes(1);
    // A second sheet, not a drill-in -- this one must close rather than stay
    // open underneath it (same reasoning as the important-links row).
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a login row for a guest instead of the account row', async () => {
    user.isLoggedIn = false;
    const dispatch = vi.fn();
    (window as unknown as { salla: unknown }).salla = { event: { dispatch } };
    const onClose = renderSheet();
    await settle();

    expect(screen.queryByTestId('account-sheet-user-menu')).toBeNull();
    fireEvent.click(screen.getByText('Login'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith('login::open');
  });

  it('omits language / currency / branch rows when the store has none of those features', async () => {
    renderSheet();
    await settle();

    expect(screen.queryByText('Change language')).toBeNull();
    expect(screen.queryByText('Change currency')).toBeNull();
    expect(screen.queryByText('Branch')).toBeNull();
  });

  it('shows language, currency and branch rows when the store has them, each opening its own modal', async () => {
    twilight.store = {
      scope: { name: 'Riyadh' },
      contacts: {},
      settings: { is_multilingual: true, currencies_enabled: true },
    };
    twilight.currency = { name: 'Saudi Riyal' };
    const dispatch = vi.fn();
    (window as unknown as { salla: unknown }).salla = { event: { dispatch } };
    const onClose = renderSheet();
    await settle();

    expect(screen.getByText('English')).toBeTruthy(); // current language value
    expect(screen.getByText('Saudi Riyal')).toBeTruthy(); // current currency value
    expect(screen.getByText('Riyadh')).toBeTruthy(); // current branch value

    fireEvent.click(screen.getByText('Change language'));
    expect(dispatch).toHaveBeenCalledWith('localization::open');
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Branch'));
    expect(dispatch).toHaveBeenCalledWith('scopes::open');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('opens the important-links sheet from its own row, closing itself first', async () => {
    const onOpenImportantLinks = vi.fn();
    const onClose = renderSheet(onOpenImportantLinks);
    await settle();

    fireEvent.click(screen.getByTestId('account-sheet-important-links'));
    expect(onOpenImportantLinks).toHaveBeenCalledTimes(1);
    // Important links is a *second* sheet, not a drill-in -- this one must
    // close rather than stay open underneath it.
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('contacts card', () => {
    it('renders nothing when the store has set none of the four contacts', async () => {
      renderSheet();
      await settle();

      expect(document.querySelector('.account-sheet__contacts')).toBeNull();
    });

    it('shows only the contacts the store actually set, each linking correctly', async () => {
      twilight.store = {
        scope: null,
        settings: {},
        contacts: { email: 'hi@acme.test', whatsapp: '+966 50-123-4567' },
      };
      renderSheet();
      await settle();

      expect(document.querySelectorAll('.account-sheet__contact-item').length).toBe(2);
      expect(screen.queryByText('Telegram')).toBeNull();
      expect(screen.queryByText('Mobile')).toBeNull();

      const email = screen.getByText('hi@acme.test').closest('a');
      expect(email?.getAttribute('href')).toBe('mailto:hi@acme.test');
      expect(email?.getAttribute('target')).toBeNull();

      // Spaces and dashes stripped for the wa.me link; the displayed value stays as entered.
      const whatsapp = screen.getByText('+966 50-123-4567').closest('a');
      expect(whatsapp?.getAttribute('href')).toBe('https://wa.me/966501234567');
      expect(whatsapp?.getAttribute('target')).toBe('_blank');
    });

    it('lists a landline phone the store set, linking it as tel:', async () => {
      twilight.store = { scope: null, settings: {}, contacts: { phone: '+966 11 000 0000' } };
      renderSheet();
      await settle();

      const phone = screen.getByText('+966 11 000 0000').closest('a');
      expect(screen.getByText('Phone')).toBeTruthy();
      expect(phone?.getAttribute('href')).toBe('tel:+966 11 000 0000');
    });

    it('lists the number once when the phone and mobile are the same', async () => {
      twilight.store = {
        scope: null,
        settings: {},
        contacts: { phone: '+966500000000', mobile: '+966500000000' },
      };
      renderSheet();
      await settle();

      expect(screen.getAllByText('+966500000000')).toHaveLength(1);
      expect(screen.queryByText('Phone')).toBeNull();
    });

    it('strips a leading @ from a telegram handle when building its link', async () => {
      twilight.store = { scope: null, settings: {}, contacts: { telegram: '@acme_store' } };
      renderSheet();
      await settle();

      const telegram = screen.getByText('@acme_store').closest('a');
      expect(telegram?.getAttribute('href')).toBe('https://t.me/acme_store');
    });

    // Regression guard: StoreContacts documents both fields as "link or
    // number" -- building a t.me/wa.me URL unconditionally on top of an
    // already-full link duplicated it (https://t.me/https://t.me/acme_store),
    // breaking the contact entirely.
    it('leaves telegram and whatsapp links unchanged when already full URLs', async () => {
      twilight.store = {
        scope: null,
        settings: {},
        contacts: {
          telegram: 'https://t.me/acme_store',
          whatsapp: 'https://wa.me/966501234567',
        },
      };
      renderSheet();
      await settle();

      const telegram = screen.getByText('https://t.me/acme_store').closest('a');
      expect(telegram?.getAttribute('href')).toBe('https://t.me/acme_store');

      const whatsapp = screen.getByText('https://wa.me/966501234567').closest('a');
      expect(whatsapp?.getAttribute('href')).toBe('https://wa.me/966501234567');
    });
  });

  it('closes from its close button', async () => {
    const onClose = renderSheet();
    await settle();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when a link inside it is followed, even one to the current page', async () => {
    const onClose = renderSheet();
    await settle();

    fireEvent.click(screen.getByText('Social'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Acme'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the viewport widens past the mobile breakpoint', async () => {
    const listeners = new Set<() => void>();
    const mql = {
      matches: true,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    };
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
    try {
      const onClose = renderSheet();
      await settle();
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        mql.matches = false;
        listeners.forEach((cb) => cb());
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  describe('row entrance', () => {
    // Same staggered fade + slide as ImportantLinksSheet's own rows -- `.is-in`
    // on the content wrapper (settings rows, contact rows and the footer
    // widgets below them) releases it once the sheet has settled, not while
    // it's still sliding in.
    it('does not release the row stagger while the sheet is still sliding in', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        renderSheet();
        expect(document.querySelector('.account-sheet__content')?.className).not.toContain('is-in');

        // Mid-way through BottomSheet's own 300ms transition -- must still be out.
        act(() => {
          vi.advanceTimersByTime(165);
        });
        expect(document.querySelector('.account-sheet__content')?.className).not.toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });

    it('releases the row stagger once the sheet has settled', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        renderSheet();

        act(() => {
          vi.advanceTimersByTime(350);
        });
        expect(document.querySelector('.account-sheet__content')?.className).toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });

    it('resets the stagger immediately on close, so it replays from the top next time', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const onClose = vi.fn();
        const { rerender } = render(
          <MobileAccountSheet open onClose={onClose} onOpenImportantLinks={() => {}} />
        );
        act(() => {
          vi.advanceTimersByTime(350);
        });
        expect(document.querySelector('.account-sheet__content')?.className).toContain('is-in');

        rerender(
          <MobileAccountSheet open={false} onClose={onClose} onOpenImportantLinks={() => {}} />
        );
        expect(document.querySelector('.account-sheet__content')?.className).not.toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
