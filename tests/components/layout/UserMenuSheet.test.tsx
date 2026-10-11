import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, act, cleanup } from '@testing-library/react';
import { UserMenuSheet } from '../../../app/components/layout/UserMenuSheet';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

// Mutable so the "cold load" test below can render the menu with no rows yet
// -- real-world state the very first time `<salla-user-menu>` mounts, before
// it's finished registering / fetching the profile. `vi.hoisted` shares it
// safely with the hoisted `vi.mock` factory.
//
// The mock deliberately only renders a couple of representative rows
// (notifications, logout) rather than the component's full real item list
// (notifications / orders / pending orders / wishlist / wallet / loyalty /
// profile / settings) -- which items show, and under what store-feature
// gates, is the SDK component's own responsibility now that this sheet uses
// `inline` mode instead of a hand-built list. Testing that full list here
// would mean re-duplicating the exact thing switching to `inline` was meant
// to stop this sheet from having to track.
const menuState = vi.hoisted(() => ({ hasItems: true }));

vi.mock('@salla.sa/twilight-components-react/user-menu', () => ({
  SallaUserMenu: (props: Record<string, unknown>) => (
    <salla-user-menu inline={props.inline ? '' : undefined} class={props.className as string}>
      {menuState.hasItems && (
        <ul className="s-user-menu-inline">
          <li className="s-user-menu-dropdown-item">
            <a className="s-user-menu-dropdown-item-link" href="/account/notifications">
              <i className="s-user-menu-dropdown-item-prefix" />
              <span className="s-user-menu-dropdown-item-title">Notifications</span>
            </a>
          </li>
          <li className="s-user-menu-dropdown-item s-user-menu-dropdown-item-logout">
            <a className="s-user-menu-dropdown-item-link" href="/logout">
              <i className="s-user-menu-dropdown-item-prefix" />
              <span className="s-user-menu-dropdown-item-title">Logout</span>
            </a>
          </li>
        </ul>
      )}
    </salla-user-menu>
  ),
}));

/** Let the sheet's mount + two-frame enter transition settle inside act. */
async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/** Advance the fake `setTimeout` by `ms`, then flush the two real animation
 *  frames `afterNextPaint` (in the component) waits for before actually
 *  flipping `itemsIn` -- fake timers fake `setTimeout`, not `requestAnimationFrame`. */
async function advanceAndSettle(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  await settle();
}

afterEach(() => {
  cleanup();
  document.body.classList.remove('menu-opened');
  menuState.hasItems = true;
});

describe('UserMenuSheet', () => {
  it('renders nothing while closed', () => {
    render(<UserMenuSheet open={false} onClose={() => {}} />);
    expect(document.querySelector('.user-menu-sheet')).toBeNull();
  });

  it('is a second full-screen sheet, titled "Account", rendering salla-user-menu in inline mode', async () => {
    render(<UserMenuSheet open onClose={() => {}} />);
    await settle();

    expect(document.querySelector('.bottom-sheet.user-menu-sheet')).toBeTruthy();
    expect(document.querySelector('.bottom-sheet__title')?.textContent).toBe('Account');

    const menu = document.querySelector('salla-user-menu');
    expect(menu).toBeTruthy();
    expect(menu?.hasAttribute('inline')).toBe(true);
  });

  it('closes from its close button', async () => {
    const onClose = vi.fn();
    render(<UserMenuSheet open onClose={onClose} />);
    await settle();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Regression guard: a link to the current page (or just a hash change)
  // doesn't change the route, which is what closes the sheet otherwise --
  // same reasoning MobileAccountSheet's own closeOnLink exists for.
  it('closes when a menu link inside it is followed', async () => {
    const onClose = vi.fn();
    render(<UserMenuSheet open onClose={onClose} />);
    await settle();

    fireEvent.click(screen.getByText('Notifications'));
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
      const onClose = vi.fn();
      render(<UserMenuSheet open onClose={onClose} />);
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
    // Same staggered fade + slide as the sheet's other lists -- `.is-in`
    // releases it once the sheet has settled, not while it's still sliding in.
    it('does not release the row stagger while the sheet is still sliding in', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        render(<UserMenuSheet open onClose={() => {}} />);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).not.toContain('is-in');

        // Mid-way through BottomSheet's own 300ms transition -- must still be out.
        await advanceAndSettle(165);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).not.toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });

    it('releases the row stagger once the sheet has fully settled', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        render(<UserMenuSheet open onClose={() => {}} />);

        await advanceAndSettle(450);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });

    it('resets the stagger immediately on close, so it replays from the top next time', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { rerender } = render(<UserMenuSheet open onClose={() => {}} />);
        await advanceAndSettle(450);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).toContain('is-in');

        rerender(<UserMenuSheet open={false} onClose={() => {}} />);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).not.toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });

    // Regression guard: `<salla-user-menu>` renders its rows asynchronously
    // (registering the custom element, fetching the profile) -- on a cold
    // load it can still be empty once the fixed settle delay above would
    // otherwise fire. Starting the stagger on a blind timer in that case
    // released `.is-in` before any row existed, so the rows -- inserted
    // later, already matching the "in" state with no prior painted frame to
    // transition from -- just snapped into place instead of animating.
    it('waits for the menu to actually render a row before starting the stagger', async () => {
      menuState.hasItems = false;
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        render(<UserMenuSheet open onClose={() => {}} />);

        // Well past the normal settle delay -- nothing to stagger yet, so it must stay out.
        await advanceAndSettle(1000);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).not.toContain('is-in');

        // The web component finally renders its rows, asynchronously and
        // independent of React -- the same way the real custom element would.
        const menu = document.querySelector('.user-menu-sheet__menu');
        await act(async () => {
          const li = document.createElement('li');
          li.className = 's-user-menu-dropdown-item';
          menu?.appendChild(li);
          await Promise.resolve(); // let the MutationObserver's microtask run
        });

        await advanceAndSettle(1000);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });

    // Regression guard mirroring ImportantLinksSheet's own: BottomSheet
    // defers its own mount to an effect, so the moment `open` first turns
    // true, `.user-menu-sheet__menu` doesn't exist in the DOM yet during
    // that same render. Mounting with `open` already `true` (every other
    // test here) sidesteps that entirely -- this one mirrors the real
    // ThemeLayout usage, mounted closed and toggled open later.
    it('still releases the stagger when the sheet starts closed and opens later', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { rerender } = render(<UserMenuSheet open={false} onClose={() => {}} />);
        expect(document.querySelector('.user-menu-sheet__menu')).toBeNull();

        rerender(<UserMenuSheet open onClose={() => {}} />);
        await act(async () => {
          await Promise.resolve();
        });

        await advanceAndSettle(1000);
        expect(document.querySelector('.user-menu-sheet__menu')?.className).toContain('is-in');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
