import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, act, cleanup } from '@testing-library/react';
import { ImportantLinksSheet } from '../../../app/components/layout/ImportantLinksSheet';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

// Mutable so the "cold load" test below can render the menu with no rows yet
// -- real-world state the very first time `<salla-menu>` mounts, before it's
// finished registering / fetching. `vi.hoisted` shares it safely with the
// hoisted `vi.mock` factory.
const menuState = vi.hoisted(() => ({ hasItem: true }));

vi.mock('@salla.sa/twilight-components-react/menu', () => ({
  SallaMenu: (props: Record<string, unknown>) => (
    <salla-menu data-source={String(props.source ?? '')} class={props.className as string}>
      {menuState.hasItem && (
        <a className="s-menu-footer-item" href="/blog">
          Blog
        </a>
      )}
    </salla-menu>
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
  menuState.hasItem = true;
});

describe('ImportantLinksSheet', () => {
  it('renders nothing while closed', () => {
    render(<ImportantLinksSheet open={false} onClose={() => {}} />);
    expect(document.querySelector('.important-links-sheet')).toBeNull();
  });

  it('is a second full-screen sheet, titled "Important links", showing the footer menu', async () => {
    render(<ImportantLinksSheet open onClose={() => {}} />);
    await settle();

    expect(document.querySelector('.bottom-sheet.important-links-sheet')).toBeTruthy();
    expect(document.querySelector('.bottom-sheet__title')?.textContent).toBe('Important links');
    expect(document.querySelector('salla-menu')?.getAttribute('data-source')).toBe('footer');
  });

  it('closes from its close button', async () => {
    const onClose = vi.fn();
    render(<ImportantLinksSheet open onClose={onClose} />);
    await settle();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Regression guard: a footer menu link to the current page (or just a hash
  // change) doesn't change the route, which is what closes the sheet
  // otherwise -- same reasoning MobileAccountSheet's own closeOnLink exists for.
  it('closes when a footer menu link inside it is followed', async () => {
    const onClose = vi.fn();
    render(<ImportantLinksSheet open onClose={onClose} />);
    await settle();

    fireEvent.click(screen.getByText('Blog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Regression guard: without this, resizing/rotating past the mobile
  // breakpoint left this fullscreen sheet stuck open over the desktop page --
  // same close-on-widen behavior MobileAccountSheet already has.
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
      render(<ImportantLinksSheet open onClose={onClose} />);
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
    // Same staggered fade + slide as the main menu drawer's own root links
    // (HeaderNav's `site-nav-drawer__list`) -- `.is-in` releases it. Waits
    // for `BottomSheet`'s own 300ms transition to fully settle first (plus a
    // clear pause) rather than starting partway through it, so the two
    // motions read as separate beats instead of overlapping.
    it('does not release the row stagger while the sheet is still sliding in', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        render(<ImportantLinksSheet open onClose={() => {}} />);
        expect(document.querySelector('.important-links-sheet__menu')?.className).not.toContain(
          'is-in'
        );

        // Mid-way through BottomSheet's own 300ms transition -- must still be out.
        await advanceAndSettle(165);
        expect(document.querySelector('.important-links-sheet__menu')?.className).not.toContain(
          'is-in'
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('releases the row stagger once the sheet has fully settled', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        render(<ImportantLinksSheet open onClose={() => {}} />);

        await advanceAndSettle(450);
        expect(document.querySelector('.important-links-sheet__menu')?.className).toContain(
          'is-in'
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('resets the stagger immediately on close, so it replays from the top next time', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { rerender } = render(<ImportantLinksSheet open onClose={() => {}} />);
        await advanceAndSettle(450);
        expect(document.querySelector('.important-links-sheet__menu')?.className).toContain(
          'is-in'
        );

        rerender(<ImportantLinksSheet open={false} onClose={() => {}} />);
        expect(document.querySelector('.important-links-sheet__menu')?.className).not.toContain(
          'is-in'
        );
      } finally {
        vi.useRealTimers();
      }
    });

    // Regression guard: `<salla-menu>` renders its rows asynchronously
    // (registering the custom element, fetching the menu) -- on a cold load
    // it can still be empty once the fixed settle delay above would
    // otherwise fire. Starting the stagger on a blind timer in that case
    // released `.is-in` before any row existed, so the rows -- inserted
    // later, already matching the "in" state with no prior painted frame to
    // transition from -- just snapped into place instead of animating.
    it('waits for the menu to actually render a row before starting the stagger', async () => {
      menuState.hasItem = false;
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        render(<ImportantLinksSheet open onClose={() => {}} />);

        // Well past the normal settle delay -- nothing to stagger yet, so it must stay out.
        await advanceAndSettle(1000);
        expect(document.querySelector('.important-links-sheet__menu')?.className).not.toContain(
          'is-in'
        );

        // The web component finally renders its row, asynchronously and
        // independent of React -- the same way the real custom element would.
        const menu = document.querySelector('.important-links-sheet__menu');
        await act(async () => {
          const row = document.createElement('a');
          row.className = 's-menu-footer-item';
          menu?.appendChild(row);
          await Promise.resolve(); // let the MutationObserver's microtask run
        });

        await advanceAndSettle(1000);
        expect(document.querySelector('.important-links-sheet__menu')?.className).toContain(
          'is-in'
        );
      } finally {
        vi.useRealTimers();
      }
    });

    // Regression guard for the live report: items were completely hidden
    // (DevTools showed the rows present in the DOM, `.is-in` just never
    // landed). Root cause: `BottomSheet` defers its own `mounted` flip to
    // *its own* effect, so the moment `open` first turns true,
    // `.important-links-sheet__menu` doesn't exist in the DOM yet during
    // that same render -- a ref on it (the earlier fix's approach) is still
    // `null` when this component's effect runs, so it silently did nothing
    // and `itemsIn` never had anything to retry it. Every other test here
    // mounts with `open` already `true` from the very first render, which
    // sidesteps this entirely (`BottomSheet`'s `mounted` state then
    // initializes straight to `true`) -- this one mirrors the real
    // `ThemeLayout` usage, mounted closed and toggled open later.
    it('still releases the stagger when the sheet starts closed and opens later', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { rerender } = render(<ImportantLinksSheet open={false} onClose={() => {}} />);
        expect(document.querySelector('.important-links-sheet__menu')).toBeNull();

        rerender(<ImportantLinksSheet open onClose={() => {}} />);
        // BottomSheet's own `mounted` flip is itself deferred to an effect --
        // let that (and the mutation it causes) settle before advancing.
        await act(async () => {
          await Promise.resolve();
        });

        await advanceAndSettle(1000);
        expect(document.querySelector('.important-links-sheet__menu')?.className).toContain(
          'is-in'
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
